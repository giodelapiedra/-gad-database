# Database Sync Guide — Windows Local → Ubuntu VPS (via GitHub)

This guide explains how to transfer your local PostgreSQL data from your **Windows development machine** to the **Ubuntu production server** (`gadapi.tanauancity.com`) using GitHub as the transport mechanism.

---

## Overview

```
Windows (local)               GitHub                   Ubuntu VPS
─────────────────             ──────                   ──────────
PostgreSQL                                             PostgreSQL
gaddatabase        ──pg_dump──> full_data_seed.sql ──pull──> psql import
                                (committed to repo)
```

**Why GitHub instead of SCP?**
- Versioned — you can track database snapshots over time.
- No need to expose SSH/SCP credentials.
- Reproducible — anyone with repo access can replicate the data.

---

## Prerequisites

- PostgreSQL installed on both Windows and Ubuntu.
- `pg_dump` and `psql` available in PATH (or use full path on Windows).
- Git installed and authenticated on both machines.
- Backend (PM2 process `gad-server`) running on Ubuntu.
- The repo `https://github.com/giodelapiedra/-gad-database.git` already cloned at `/var/www/gad` on Ubuntu.

---

## Step 1 — Export local database (Windows)

Open **CMD** or **PowerShell** on your Windows machine and run:

```bash
pg_dump -U postgres -d gaddatabase --data-only --inserts --column-inserts -f D:\GAD2026\gad-database\server\prisma\full_data_seed.sql
```

When prompted, enter password: `2210`

### Flags explained

| Flag | Purpose |
|---|---|
| `--data-only` | Dump data only, skip schema (Prisma migrations handle the schema) |
| `--inserts` | Generate INSERT statements (human-readable, git-friendly) |
| `--column-inserts` | Use explicit column names (safer if schema changes) |

### If `pg_dump` is not in PATH

Use the full path to your PostgreSQL installation:

```bash
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d gaddatabase --data-only --inserts --column-inserts -f D:\GAD2026\gad-database\server\prisma\full_data_seed.sql
```

Replace `16` with your PostgreSQL version (`14`, `15`, `17`, etc.).

To check your version:
```bash
psql --version
```

### Verify the file was created

The file should appear at:
```
D:\GAD2026\gad-database\server\prisma\full_data_seed.sql
```

Open it in a text editor — you should see `INSERT INTO public."Department" ...`, `INSERT INTO public."User" ...`, etc.

---

## Step 2 — Commit and push to GitHub (Windows)

```bash
cd D:\GAD2026\gad-database
git add server/prisma/full_data_seed.sql
git commit -m "Update full data seed for VPS database sync"
git push origin main
```

---

## Step 3 — Pull and import on Ubuntu

SSH into your Ubuntu server, then run:

### 3.1 Pull latest code
```bash
cd /var/www/gad
git pull origin main
```

### 3.2 Stop the backend
```bash
pm2 stop gad-server
```

### 3.3 Backup current Ubuntu database (safety net)
```bash
sudo -u postgres pg_dump gaddatabase -F c -f /root/gaddatabase_ubuntu_backup_$(date +%Y%m%d_%H%M%S).dump
```

This creates a timestamped backup like `/root/gaddatabase_ubuntu_backup_20260410_143022.dump` so you can rollback if anything goes wrong.

### 3.4 Clear existing data (keep schema)
```bash
sudo -u postgres psql -d gaddatabase <<EOF
TRUNCATE TABLE "DownloadLog", "ResourceFile", "ResourceFolder", "File", "UploadLog", "Record", "Department", "User" RESTART IDENTITY CASCADE;
EOF
```

**WARNING:** This wipes ALL data on the Ubuntu PostgreSQL. Make sure Step 3.3 backup succeeded first.

### 3.5 Import the seed data
```bash
sudo -u postgres psql -d gaddatabase -f /var/www/gad/server/prisma/full_data_seed.sql
```

### 3.6 Restart the backend
```bash
pm2 start gad-server
```

---

## Step 4 — Verify the sync

Test the API to confirm the data is live:

```bash
curl https://gadapi.tanauancity.com/api/public/departments
```

You should see your local department list returned as JSON. Open the public website and check that the records, files, and resources match your local environment.

---

## Rollback (if something breaks)

If the import fails or data is wrong, restore from the backup created in Step 3.3:

```bash
pm2 stop gad-server

sudo -u postgres psql -c "DROP DATABASE gaddatabase;"
sudo -u postgres psql -c "CREATE DATABASE gaddatabase;"
sudo -u postgres pg_restore -d gaddatabase /root/gaddatabase_ubuntu_backup_YYYYMMDD_HHMMSS.dump

pm2 start gad-server
```

Replace `YYYYMMDD_HHMMSS` with the actual backup filename.

---

## Important Notes

### File storage (Cloudflare R2)
Uploaded files (Excel, PDFs, etc.) are stored in **Cloudflare R2**, not on the local filesystem. The R2 bucket is shared between local and production, so when you sync the database, the file references in the `File` and `ResourceFile` tables will still resolve correctly on the Ubuntu server.

R2 config (server `.env`):
```
R2_BUCKET=gad-database
R2_PUBLIC_URL=https://gaduploads.tanauancity.com
```

### What gets synced
The `full_data_seed.sql` includes data from these tables:
- `User` — accounts and roles
- `Department` — department list
- `Record` — records with JSON data
- `UploadLog` — upload history
- `File` — department file metadata
- `ResourceFolder` — public resource folder tree
- `ResourceFile` — public resource files
- `DownloadLog` — public download tracking

### What does NOT get synced
- The actual files in R2 (no need — same bucket).
- Schema changes (handled by Prisma migrations via `npx prisma migrate deploy`).
- `.env` files (machine-specific, kept out of git).

### Schema changes
If you added new migrations on Windows since the last Ubuntu deploy, run this BEFORE Step 3.4:

```bash
cd /var/www/gad/server
npx prisma migrate deploy
npx prisma generate
```

---

## Quick Reference — One-liner commands

### Windows (export + push)
```bash
pg_dump -U postgres -d gaddatabase --data-only --inserts --column-inserts -f D:\GAD2026\gad-database\server\prisma\full_data_seed.sql && cd D:\GAD2026\gad-database && git add server/prisma/full_data_seed.sql && git commit -m "Sync database snapshot" && git push origin main
```

### Ubuntu (pull + import)
```bash
cd /var/www/gad && git pull origin main && pm2 stop gad-server && sudo -u postgres pg_dump gaddatabase -F c -f /root/gaddatabase_ubuntu_backup_$(date +%Y%m%d_%H%M%S).dump && sudo -u postgres psql -d gaddatabase -c 'TRUNCATE TABLE "DownloadLog", "ResourceFile", "ResourceFolder", "File", "UploadLog", "Record", "Department", "User" RESTART IDENTITY CASCADE;' && sudo -u postgres psql -d gaddatabase -f /var/www/gad/server/prisma/full_data_seed.sql && pm2 start gad-server
```

---

## Troubleshooting

### "pg_dump: error: connection to server failed"
- Check that PostgreSQL service is running (`services.msc` on Windows, `sudo systemctl status postgresql` on Ubuntu).
- Verify the password matches what's in your `server/.env` (`DATABASE_URL`).

### "permission denied" on Ubuntu psql commands
- Always prefix with `sudo -u postgres` when running `psql` or `pg_dump` directly.

### "duplicate key value violates unique constraint"
- This means TRUNCATE didn't run successfully. Re-run Step 3.4 before Step 3.5.

### Backend won't start after import
- Check logs: `pm2 logs gad-server`
- Common cause: schema mismatch. Run `npx prisma migrate deploy` and `npx prisma generate` in `/var/www/gad/server`.

### `git pull` fails with merge conflict on `full_data_seed.sql`
- The seed file changes every export. On Ubuntu, force overwrite with the remote version:
  ```bash
  git checkout origin/main -- server/prisma/full_data_seed.sql
  git pull origin main
  ```

---

## When to run a sync

Run this sync workflow whenever:
- You've added significant data on local that needs to go live.
- You're preparing for a demo/presentation and need production to match local.
- You've reset the production database and need to repopulate it.

**Do NOT run this sync if:**
- Production already has newer data than local (you'll lose production data).
- Multiple people are encoding directly on production (you'll overwrite their work).

For ongoing production data, the proper flow is **the other way around** — export from production and import to local for development.
