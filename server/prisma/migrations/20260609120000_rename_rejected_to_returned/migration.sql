-- Rename the REJECTED submission status to RETURNED in place.
-- Using ALTER TYPE ... RENAME VALUE preserves existing rows (no drop/recreate, no backfill).
ALTER TYPE "SubmissionStatus" RENAME VALUE 'REJECTED' TO 'RETURNED';
