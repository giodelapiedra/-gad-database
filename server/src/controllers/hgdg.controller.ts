import { Request, Response } from 'express';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import prisma from '../utils/db';
import { sendSuccess, sendError } from '../utils/response';
import { uploadToR2, deleteFromR2, streamFromR2 } from '../utils/s3';
import { Readable } from 'stream';

function getPublicUrl(r2Key: string): string {
  const base = process.env.R2_PUBLIC_URL || '';
  return `${base}/${r2Key}`;
}

type FieldDef = {
  id: string;
  label: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'text' | 'number' | 'radio' | 'checkbox' | 'textarea';
  options?: string[];
  fontSize?: number;
};

export async function listTemplates(req: Request, res: Response): Promise<void> {
  try {
    const isAdmin = (req as any).user?.role === 'ADMIN';
    const templates = await prisma.hGDGTemplate.findMany({
      where: isAdmin ? undefined : { isPublished: true },
      orderBy: [{ pullout: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, sector: true, pullout: true,
        isPublished: true, fieldMap: true, createdAt: true, updatedAt: true,
      },
    });
    sendSuccess(res, templates, 'OK');
  } catch (err) {
    console.error('listTemplates:', err);
    sendError(res, 'Failed to fetch HGDG templates', 500);
  }
}

export async function getTemplate(req: Request, res: Response): Promise<void> {
  try {
    const template = await prisma.hGDGTemplate.findUnique({
      where: { id: req.params.id as string },
    });
    if (!template) { sendError(res, 'Template not found', 404); return; }
    sendSuccess(res, template, 'OK');
  } catch (err) {
    console.error('getTemplate:', err);
    sendError(res, 'Failed to fetch template', 500);
  }
}

export async function servePdf(req: Request, res: Response): Promise<void> {
  try {
    const template = await prisma.hGDGTemplate.findUnique({
      where: { id: req.params.id as string },
      select: { r2Key: true },
    });
    if (!template) { sendError(res, 'Template not found', 404); return; }
    sendSuccess(res, { url: getPublicUrl(template.r2Key) }, 'OK');
  } catch (err) {
    console.error('servePdf:', err);
    sendError(res, 'Failed to get PDF URL', 500);
  }
}

// Proxies PDF bytes through the backend — avoids browser CORS on the CDN
export async function streamPdf(req: Request, res: Response): Promise<void> {
  try {
    const template = await prisma.hGDGTemplate.findUnique({
      where: { id: req.params.id as string },
      select: { r2Key: true },
    });
    if (!template) { sendError(res, 'Template not found', 404); return; }

    const r2Response = await streamFromR2(template.r2Key);
    const chunks: Uint8Array[] = [];
    for await (const chunk of r2Response.Body as Readable) chunks.push(chunk);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.concat(chunks));
  } catch (err) {
    console.error('streamPdf:', err);
    sendError(res, 'Failed to stream PDF', 500);
  }
}

export async function createTemplate(req: Request, res: Response): Promise<void> {
  try {
    const name = req.body.name as string;
    const sector = req.body.sector as string;
    const pullout = req.body.pullout as string | undefined;
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) { sendError(res, 'PDF file is required', 400); return; }
    if (!name || !sector) { sendError(res, 'name and sector are required', 400); return; }

    const slug = sector.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const r2Key = `hgdg/templates/${slug}-${Date.now()}.pdf`;

    await uploadToR2(r2Key, file.buffer, 'application/pdf');

    const template = await prisma.hGDGTemplate.create({
      data: { name, sector, pullout: pullout || null, r2Key, fieldMap: [] },
    });
    sendSuccess(res, template, 'Template created', 201);
  } catch (err: any) {
    if (err.code === 'P2002') { sendError(res, 'A template for this sector already exists', 409); return; }
    console.error('createTemplate:', err);
    sendError(res, 'Failed to create template', 500);
  }
}

export async function updateFieldMap(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { fieldMap } = req.body;
    if (!Array.isArray(fieldMap)) { sendError(res, 'fieldMap must be an array', 400); return; }
    const template = await prisma.hGDGTemplate.update({ where: { id }, data: { fieldMap } });
    sendSuccess(res, template, 'Field map saved');
  } catch (err: any) {
    if (err.code === 'P2025') { sendError(res, 'Template not found', 404); return; }
    console.error('updateFieldMap:', err);
    sendError(res, 'Failed to update field map', 500);
  }
}

export async function setPublished(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const template = await prisma.hGDGTemplate.update({
      where: { id },
      data: { isPublished: Boolean(req.body.isPublished) },
    });
    sendSuccess(res, template, `Template ${template.isPublished ? 'published' : 'unpublished'}`);
  } catch (err: any) {
    if (err.code === 'P2025') { sendError(res, 'Template not found', 404); return; }
    console.error('setPublished:', err);
    sendError(res, 'Failed to update template', 500);
  }
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const template = await prisma.hGDGTemplate.findUnique({ where: { id } });
    if (!template) { sendError(res, 'Template not found', 404); return; }
    await deleteFromR2(template.r2Key);
    await prisma.hGDGTemplate.delete({ where: { id } });
    sendSuccess(res, null, 'Template deleted');
  } catch (err) {
    console.error('deleteTemplate:', err);
    sendError(res, 'Failed to delete template', 500);
  }
}

export async function generateFilledPdf(req: Request, res: Response): Promise<void> {
  try {
    const { templateId, formData } = req.body as {
      templateId: string;
      formData: Record<string, string>;
    };

    const template = await prisma.hGDGTemplate.findUnique({ where: { id: templateId } });
    if (!template) { sendError(res, 'Template not found', 404); return; }

    const r2Response = await streamFromR2(template.r2Key);
    const chunks: Uint8Array[] = [];
    for await (const chunk of r2Response.Body as Readable) chunks.push(chunk);
    const pdfBytes = Buffer.concat(chunks);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const fields = template.fieldMap as unknown as FieldDef[];

    for (const field of fields) {
      const value = formData[field.id];
      if (!value) continue;
      const page = pages[field.page - 1];
      if (!page) continue;

      const { width: pw, height: ph } = page.getSize();
      const fontSize = field.fontSize || 9;

      // field.x, field.y are CSS percentages (top-left origin)
      // Convert back to PDF space (bottom-left origin)
      const cellX = (field.x / 100) * pw + 2;
      const cellW = (field.w / 100) * pw - 4;
      const cellH = (field.h / 100) * ph;
      // Text baseline: just below the top edge of the cell
      const textY = ph - (field.y / 100) * ph - fontSize - 2;

      if (field.type === 'checkbox') {
        if (value === 'true') {
          page.drawText('X', { x: cellX, y: textY, size: fontSize + 1, font, color: rgb(0, 0, 0) });
        }
      } else {
        for (const [i, line] of value.split('\n').entries()) {
          const lineY = textY - i * (fontSize + 2);
          if (lineY < ph - (field.y / 100) * ph - cellH) break;
          page.drawText(line, { x: cellX, y: lineY, size: fontSize, font, color: rgb(0, 0, 0), maxWidth: cellW });
        }
      }
    }

    const filledBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="HGDG-${template.sector}-filled.pdf"`);
    res.send(Buffer.from(filledBytes));
  } catch (err) {
    console.error('generateFilledPdf:', err);
    sendError(res, 'Failed to generate filled PDF', 500);
  }
}
