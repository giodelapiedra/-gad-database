-- Indexes to keep submission pagination/counts light as data grows.
-- list() orders by submittedAt DESC; status tabs filter by status; the
-- department-status endpoint counts by a submittedAt date range.
CREATE INDEX "form_submissions_submittedAt_idx" ON "form_submissions"("submittedAt");
CREATE INDEX "form_submissions_status_submittedAt_idx" ON "form_submissions"("status", "submittedAt");
