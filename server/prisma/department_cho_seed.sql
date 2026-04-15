-- ============================================================================
-- City Health Office (CHO) — restore missing department on Ubuntu
-- ============================================================================
-- Safe to re-run: ON CONFLICT (code) DO NOTHING
-- Uses the same id as local so any existing records/files referencing CHO
-- on Ubuntu (if any) continue to work.
--
-- Run on Ubuntu:
--   sudo -u postgres psql -d gaddatabase -f /var/www/gad/server/prisma/department_cho_seed.sql
-- ============================================================================

INSERT INTO departments (id, name, code, color, head, "isActive", "createdAt", "updatedAt")
VALUES (
  'cmnesetr20007tycsokxvzjxo',
  'City Health Office',
  'CHO',
  '#EC4899',
  'Department Head',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;
