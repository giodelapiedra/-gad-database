import { Response } from 'express';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import prisma from '../utils/db';
import { buildExcelForType } from './template.controller';
import { buildPdfForType } from '../utils/pdf';
import { uploadToR2 } from '../utils/s3';
import {
  createSubmissionSchema,
  reviewSubmissionSchema,
  updateFormDataSchema,
} from '../schemas/submission.schemas';

function getPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL || 'https://gaduploads.tanauancity.com';
  return `${base}/${key}`;
}

// Shared include shape for a submission with its submitter, reviewer & comments.
const SUBMISSION_INCLUDE = {
  submitter: {
    select: {
      id: true, name: true, email: true,
      department: { select: { id: true, name: true, code: true, color: true } },
    },
  },
  reviewer: { select: { id: true, name: true } },
  comments: {
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

const DEFAULT_LIMIT = 15;
const MAX_LIMIT     = 100;

function deriveTitle(templateId: string, formData: Record<string, unknown>): string {
  const year = new Date().getFullYear();
  switch (templateId) {
    case 'BARANGAY_GPB':
      return `${(formData.barangay as string) || 'Unknown Barangay'} GPB CY${(formData.cy as number) || year}`;
    case 'BARANGAY_AR':
      return `${(formData.barangay as string) || 'Unknown Barangay'} AR FY${(formData.fy as number) || year}`;
    case 'CITY_GPB':
      return `${(formData.officeName as string) || (formData.cityMunicipality as string) || 'Unknown'} GPB FY${(formData.fy as number) || year}`;
    case 'CITY_AR':
      return `${(formData.officeName as string) || (formData.cityMunicipality as string) || 'Unknown'} AR FY${(formData.fy as number) || year} (${(formData.quarter as string) || 'Annual'})`;
    default:
      return `Submission ${new Date().toLocaleDateString()}`;
  }
}

// ─── POST /api/submissions ─────────────────────────────────────────────────

export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const parsed = createSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.issues[0]?.message ?? 'Invalid request body.', 400);
      return;
    }
    const { templateId, formData, isDraft } = parsed.data;

    const title = deriveTitle(templateId, formData);

    const submission = await prisma.formSubmission.create({
      data: {
        templateId,
        title,
        formData: formData as object,
        submittedBy: req.user!.id,
        status: isDraft ? 'DRAFT' : 'PENDING',
      },
      include: {
        submitter: {
          select: {
            id: true, name: true, email: true,
            department: { select: { id: true, name: true, code: true, color: true } },
          },
        },
      },
    });

    sendSuccess(res, submission, 'Form submitted for approval successfully.');
  } catch (err) {
    console.error('Create submission error:', err);
    sendError(res, 'Failed to submit form.', 500);
  }
}

// ─── GET /api/submissions ──────────────────────────────────────────────────
// Query params: status, page, limit
// Returns: { submissions, total, page, limit, totalPages, counts }

export async function list(req: AuthRequest, res: Response): Promise<void> {
  try {
    const isAdmin = req.user!.role === 'ADMIN';

    // ── Parse query params ───────────────────────────────────────────────
    const rawStatus = req.query['status'];
    const rawPage   = req.query['page'];
    const rawLimit  = req.query['limit'];
    const rawDept   = req.query['department'];

    const statusFilter =
      typeof rawStatus === 'string' &&
      ['DRAFT', 'PENDING', 'APPROVED', 'RETURNED'].includes(rawStatus)
        ? (rawStatus as 'DRAFT' | 'PENDING' | 'APPROVED' | 'RETURNED')
        : undefined;

    const departmentFilter = typeof rawDept === 'string' && rawDept ? rawDept : undefined;

    const page  = Math.max(1, parseInt(typeof rawPage  === 'string' ? rawPage  : '1',  10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(typeof rawLimit === 'string' ? rawLimit : String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    const skip  = (page - 1) * limit;

    // ── Build where clause ─────────────────────────────────────────────────
    // Admins never see DRAFT (private encoder work-in-progress). We use an AND
    // array so the status exclusion and any status filter don't overwrite each other.
    type WhereClause = Prisma.FormSubmissionWhereInput;
    function buildWhere(extraStatus?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'RETURNED'): WhereClause {
      const conditions: WhereClause[] = [];
      if (isAdmin) {
        conditions.push({ status: { not: 'DRAFT' } });
        if (extraStatus) conditions.push({ status: extraStatus });
      } else {
        conditions.push({ submittedBy: req.user!.id });
        if (extraStatus) conditions.push({ status: extraStatus });
      }
      if (departmentFilter) conditions.push({ submitter: { departmentId: departmentFilter } });
      return conditions.length === 1 ? conditions[0]! : { AND: conditions };
    }

    // ── Run paginated list + total for current filter + per-status counts ─
    const [submissions, total, draftCnt, pendingCnt, approvedCnt, returnedCnt] =
      await Promise.all([
        prisma.formSubmission.findMany({
          where: buildWhere(statusFilter),
          orderBy: { submittedAt: 'desc' },
          skip,
          take: limit,
          include: {
            submitter: {
              select: {
                id: true, name: true, email: true,
                department: { select: { id: true, name: true, code: true, color: true } },
              },
            },
            reviewer: { select: { id: true, name: true } },
          },
        }),
        prisma.formSubmission.count({ where: buildWhere(statusFilter) }),
        isAdmin ? Promise.resolve(0) : prisma.formSubmission.count({ where: buildWhere('DRAFT')    }),
        prisma.formSubmission.count({ where: buildWhere('PENDING')  }),
        prisma.formSubmission.count({ where: buildWhere('APPROVED') }),
        prisma.formSubmission.count({ where: buildWhere('RETURNED') }),
      ]);

    const totalPages = Math.ceil(total / limit);

    sendSuccess(
      res,
      {
        submissions,
        total,
        page,
        limit,
        totalPages,
        counts: {
          all:      draftCnt + pendingCnt + approvedCnt + returnedCnt,
          draft:    draftCnt,
          pending:  pendingCnt,
          approved: approvedCnt,
          returned: returnedCnt,
        },
      },
      'Submissions retrieved successfully.',
    );
  } catch (err) {
    console.error('List submissions error:', err);
    sendError(res, 'Failed to retrieve submissions.', 500);
  }
}

// ─── GET /api/submissions/pending-count ───────────────────────────────────

export async function pendingCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const count = await prisma.formSubmission.count({
      where: isAdmin
        ? { status: 'PENDING' }
        : { submittedBy: req.user!.id, status: 'PENDING' },
    });
    sendSuccess(res, { count }, 'Pending count retrieved.');
  } catch (err) {
    sendError(res, 'Failed to get pending count.', 500);
  }
}

// ─── GET /api/submissions/department-status ───────────────────────────────
// Admin only. For the given cycle (?year=YYYY, default current year), lists
// every active department and whether it has submitted yet. A department with
// zero submissions in the cycle is still "encoding".

export async function departmentStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (req.user!.role !== 'ADMIN') {
      sendError(res, 'Only admins can view department status.', 403); return;
    }

    const rawYear = req.query['year'];
    const year = Math.max(
      2000,
      parseInt(typeof rawYear === 'string' ? rawYear : '', 10) || new Date().getFullYear(),
    );
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year + 1, 0, 1);

    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, color: true },
      orderBy: { name: 'asc' },
    });

    // Count per department with indexed COUNT queries (bounded by the number of
    // departments, not by the number of submissions — stays light at scale).
    const counts = await Promise.all(
      departments.map((d) =>
        prisma.formSubmission.count({
          where: {
            submittedAt: { gte: yearStart, lt: yearEnd },
            submitter: { departmentId: d.id },
            status: { not: 'DRAFT' },
          },
        }),
      ),
    );

    const rows = departments.map((d, i) => ({
      ...d,
      submissionCount: counts[i],
      status: (counts[i] > 0 ? 'submitted' : 'encoding') as 'submitted' | 'encoding',
    }));

    const submitted = rows.filter((r) => r.status === 'submitted').length;

    sendSuccess(
      res,
      {
        year,
        departments: rows,
        summary: { total: rows.length, submitted, encoding: rows.length - submitted },
      },
      'Department status retrieved.',
    );
  } catch (err) {
    console.error('Department status error:', err);
    sendError(res, 'Failed to retrieve department status.', 500);
  }
}

// ─── GET /api/submissions/:id ──────────────────────────────────────────────

export async function getById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id      = req.params['id'] as string;
    const isAdmin = req.user!.role === 'ADMIN';

    const submission = await prisma.formSubmission.findUnique({
      where: { id },
      include: SUBMISSION_INCLUDE,
    });

    if (!submission) { sendError(res, 'Submission not found.', 404); return; }
    if (!isAdmin && submission.submittedBy !== req.user!.id) {
      sendError(res, 'Access denied.', 403); return;
    }

    sendSuccess(res, submission, 'Submission retrieved.');
  } catch (err) {
    sendError(res, 'Failed to retrieve submission.', 500);
  }
}

// ─── PATCH /api/submissions/:id/review ────────────────────────────────────

export async function review(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (req.user!.role !== 'ADMIN') {
      sendError(res, 'Only admins can review submissions.', 403); return;
    }

    const id = req.params['id'] as string;

    const parsed = reviewSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.issues[0]?.message ?? 'Invalid request body.', 400); return;
    }
    const { status, remarks } = parsed.data;

    // Atomic: find + update in one transaction to prevent double-review races.
    const result = await prisma.$transaction(async (tx) => {
      const submission = await tx.formSubmission.findUnique({ where: { id } });
      if (!submission) return { error: 'not_found' as const };
      if (submission.status !== 'PENDING') return { error: 'not_pending' as const };

      const updated = await tx.formSubmission.update({
        where: { id },
        data: {
          status,
          remarks:    remarks?.trim() || null,
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
        },
        include: {
          submitter: {
            select: {
              id: true, name: true, email: true,
              department: { select: { id: true, name: true, code: true, color: true } },
            },
          },
          reviewer: { select: { id: true, name: true } },
        },
      });

      if (remarks?.trim()) {
        await tx.submissionComment.create({
          data: { submissionId: id, authorId: req.user!.id, body: remarks.trim() },
        });
      }

      return { submittedBy: submission.submittedBy, title: submission.title, updated };
    });

    if ('error' in result) {
      if (result.error === 'not_found') { sendError(res, 'Submission not found.', 404); return; }
      sendError(res, 'Only pending submissions can be reviewed.', 400); return;
    }

    // Notification is non-critical — keep outside the transaction so a failure here
    // doesn't roll back the review decision.
    await prisma.notification.create({
      data: {
        userId:       result.submittedBy,
        type:         status,
        title:        status === 'APPROVED' ? 'Submission Approved ✓' : 'Submission Returned',
        message:      status === 'APPROVED'
          ? `Your submission "${result.title}" has been approved.`
          : `Your submission "${result.title}" was returned${remarks?.trim() ? `: "${remarks.trim()}"` : '.'}`,
        submissionId: id,
      },
    }).catch(() => { /* non-critical, swallow */ });

    sendSuccess(res, result.updated, `Submission ${status.toLowerCase()} successfully.`);
  } catch (err) {
    console.error('Review submission error:', err);
    sendError(res, 'Failed to review submission.', 500);
  }
}

// ─── DELETE /api/submissions/:id ──────────────────────────────────────────

export async function deleteSubmission(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id      = req.params['id'] as string;
    const isAdmin = req.user!.role === 'ADMIN';

    const submission = await prisma.formSubmission.findUnique({ where: { id } });
    if (!submission) { sendError(res, 'Submission not found.', 404); return; }

    if (!isAdmin && submission.submittedBy !== req.user!.id) {
      sendError(res, 'Access denied.', 403); return;
    }

    if (submission.status !== 'RETURNED' && submission.status !== 'DRAFT') {
      sendError(res, 'Only draft or returned submissions can be deleted.', 400); return;
    }

    await prisma.formSubmission.delete({ where: { id } });
    sendSuccess(res, { id }, 'Submission deleted successfully.');
  } catch (err) {
    console.error('Delete submission error:', err);
    sendError(res, 'Failed to delete submission.', 500);
  }
}

// ─── POST /api/submissions/:id/generate ───────────────────────────────────

export async function generate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id      = req.params['id'] as string;
    const isAdmin = req.user!.role === 'ADMIN';

    const submission = await prisma.formSubmission.findUnique({ where: { id } });
    if (!submission) { sendError(res, 'Submission not found.', 404); return; }
    if (!isAdmin && submission.submittedBy !== req.user!.id) {
      sendError(res, 'Access denied.', 403); return;
    }
    if (!isAdmin && submission.status !== 'APPROVED') {
      sendError(res, 'Submission must be approved before downloading.', 400); return;
    }

    const format = (req.query['format'] === 'pdf' || req.body?.format === 'pdf') ? 'pdf' : 'xlsx';

    if (format === 'pdf') {
      const { buffer, fileName } = await buildPdfForType(submission.templateId, submission.formData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
      return;
    }

    const { buffer, fileName } = await buildExcelForType(submission.templateId, submission.formData);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Generate from submission error:', err);
    sendError(res, 'Failed to generate file from submission.', 500);
  }
}

// ─── PATCH /api/submissions/:id ───────────────────────────────────────────
// Edit the submitted form data instead of deleting.
//   • Admin   — may edit any submission's form data.
//   • Encoder — may edit only their OWN returned submission; passing
//               resubmit:true sends it back to the admin review queue.

export async function updateFormData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id      = req.params['id'] as string;
    const isAdmin = req.user!.role === 'ADMIN';

    const parsed = updateFormDataSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.issues[0]?.message ?? 'Invalid request body.', 400); return;
    }
    const { formData, resubmit } = parsed.data;

    const submission = await prisma.formSubmission.findUnique({ where: { id } });
    if (!submission) { sendError(res, 'Submission not found.', 404); return; }

    if (!isAdmin) {
      if (submission.submittedBy !== req.user!.id) { sendError(res, 'Access denied.', 403); return; }
      if (submission.status !== 'RETURNED' && submission.status !== 'DRAFT') {
        sendError(res, 'You can only edit a submission that was returned or is a draft.', 400); return;
      }
    }

    const title = deriveTitle(submission.templateId, formData);

    const data: Record<string, unknown> = { formData: formData as object, title };
    // Encoder submitting a draft or resubmitting a returned form → PENDING review.
    if (!isAdmin && resubmit) {
      data['status']     = 'PENDING';
      data['reviewedBy'] = null;
      data['reviewedAt'] = null;
      data['remarks']    = null;
    }

    const updated = await prisma.formSubmission.update({
      where: { id },
      data,
      include: SUBMISSION_INCLUDE,
    });

    // Admin edited an encoder's form → notify the encoder.
    if (isAdmin && submission.submittedBy !== req.user!.id) {
      await prisma.notification.create({
        data: {
          userId:       submission.submittedBy,
          type:         'EDITED',
          title:        'Submission Edited',
          message:      `${req.user!.name} edited your submission "${title}".`,
          submissionId: id,
        },
      });
    }

    sendSuccess(res, updated, resubmit ? 'Submission resubmitted for review.' : 'Submission updated.');
  } catch (err) {
    console.error('Update submission error:', err);
    sendError(res, 'Failed to update submission.', 500);
  }
}

// ─── POST /api/submissions/:id/comments ───────────────────────────────────
// Add a comment (admin or the owning encoder), optionally with a file
// attachment (the reviewer's attachment). multipart/form-data: body, attachment.

export async function addComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id      = req.params['id'] as string;
    const isAdmin = req.user!.role === 'ADMIN';
    const body    = ((req.body?.body as string | undefined) ?? '').trim();
    const file    = req.file;

    const submission = await prisma.formSubmission.findUnique({ where: { id } });
    if (!submission) { sendError(res, 'Submission not found.', 404); return; }
    if (!isAdmin && submission.submittedBy !== req.user!.id) {
      sendError(res, 'Access denied.', 403); return;
    }
    if (!body && !file) {
      sendError(res, 'A comment or an attachment is required.', 400); return;
    }

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;
    if (file) {
      const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
      const key  = `submission-attachments/${id}/${randomUUID()}-${safe}`;
      await uploadToR2(key, file.buffer, file.mimetype);
      attachmentUrl  = getPublicUrl(key);
      attachmentName = file.originalname;
    }

    const comment = await prisma.submissionComment.create({
      data: {
        submissionId:   id,
        authorId:       req.user!.id,
        body:           body || (file ? `Attached ${file.originalname}` : ''),
        attachmentUrl,
        attachmentName,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    // Admin commented → notify the encoder.
    if (isAdmin && submission.submittedBy !== req.user!.id) {
      await prisma.notification.create({
        data: {
          userId:       submission.submittedBy,
          type:         'COMMENT',
          title:        'New comment on your submission',
          message:      `${req.user!.name} commented on "${submission.title}".`,
          submissionId: id,
        },
      });
    }

    sendSuccess(res, comment, 'Comment added.');
  } catch (err) {
    console.error('Add comment error:', err);
    sendError(res, 'Failed to add comment.', 500);
  }
}
