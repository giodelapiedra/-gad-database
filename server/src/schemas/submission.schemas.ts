import { z } from 'zod';

export const createSubmissionSchema = z.object({
  templateId: z.enum(['BARANGAY_GPB', 'BARANGAY_AR', 'CITY_GPB', 'CITY_AR']),
  formData: z.record(z.string(), z.unknown()),
  isDraft: z.boolean().optional(),
});

export const reviewSubmissionSchema = z.object({
  status: z.enum(['APPROVED', 'RETURNED']),
  remarks: z.string().max(2000).optional(),
});

export const updateFormDataSchema = z.object({
  formData: z.record(z.string(), z.unknown()),
  resubmit: z.boolean().optional(),
});
