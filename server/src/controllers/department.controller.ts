import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/db';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

const createSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(6, 'Code must be at most 6 characters')
    .regex(/^[A-Z0-9]+$/, 'Uppercase alphanumeric only'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Valid hex color required'),
  head: z.string().min(3, 'Head name must be at least 3 characters'),
});

const updateSchema = createSchema.partial();

function getFirstZodError(error: z.ZodError): string {
  try {
    if (error.issues && error.issues.length > 0) {
      return error.issues[0].message;
    }
    const parsed = JSON.parse(error.message);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0].message;
    }
  } catch {
    // fallback
  }
  return 'Invalid request data';
}

export async function getAll(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      include: { _count: { select: { records: true } } },
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, departments, 'Departments retrieved');
  } catch (error) {
    console.error('getAll departments error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

export async function getOne(req: AuthRequest, res: Response): Promise<void> {
  try {
    const code = (req.params.code as string).toUpperCase();

    const department = await prisma.department.findUnique({
      where: { code },
      include: { _count: { select: { records: true } } },
    });

    if (!department) {
      sendError(res, 'Department not found.', 404);
      return;
    }

    const [femaleCount, maleCount] = await Promise.all([
      prisma.record.count({ where: { departmentId: department.id, gender: 'FEMALE' } }),
      prisma.record.count({ where: { departmentId: department.id, gender: 'MALE' } }),
    ]);

    sendSuccess(res, {
      ...department,
      femaleCount,
      maleCount,
    }, 'Department retrieved');
  } catch (error) {
    console.error('getOne department error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = createSchema.safeParse(req.body);

    if (!parsed.success) {
      sendError(res, getFirstZodError(parsed.error));
      return;
    }

    const { name, code, color, head } = parsed.data;
    const upperCode = code.toUpperCase();

    const existing = await prisma.department.findUnique({ where: { code: upperCode } });

    if (existing) {
      sendError(res, `Department code "${upperCode}" already exists.`, 409);
      return;
    }

    const department = await prisma.department.create({
      data: { name, code: upperCode, color, head },
      include: { _count: { select: { records: true } } },
    });

    sendSuccess(res, department, 'Department created', 201);
  } catch (error) {
    console.error('create department error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const existing = await prisma.department.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Department not found.', 404);
      return;
    }

    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      sendError(res, getFirstZodError(parsed.error));
      return;
    }

    const data = parsed.data;

    if (data.code) {
      data.code = data.code.toUpperCase();

      if (data.code !== existing.code) {
        const duplicate = await prisma.department.findUnique({ where: { code: data.code } });

        if (duplicate) {
          sendError(res, `Department code "${data.code}" already exists.`, 409);
          return;
        }
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data,
      include: { _count: { select: { records: true } } },
    });

    sendSuccess(res, department, 'Department updated');
  } catch (error) {
    console.error('update department error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}

export async function softDelete(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const existing = await prisma.department.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Department not found.', 404);
      return;
    }

    await prisma.department.update({
      where: { id },
      data: { isActive: false },
    });

    sendSuccess(res, null, 'Department deleted');
  } catch (error) {
    console.error('softDelete department error:', error);
    sendError(res, 'Something went wrong.', 500);
  }
}
