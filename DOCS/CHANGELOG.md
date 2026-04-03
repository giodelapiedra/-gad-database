# GAD Database — Changelog & Development Log

> Gender & Development Records Management System
> City Government of Tanauan, Batangas

---

## System Overview

**GAD Database** is a file management system for the Gender and Development office of Tanauan City. Departments upload and organize Excel files (and other documents) by year, similar to Google Drive but organized per department.

**Core Flow:** Login → Create Department → Create Year Folder → Upload Files → View/Download Files

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui (base-ui) |
| Backend | Node.js + Express 5 + TypeScript + Prisma ORM + PostgreSQL |
| Storage | Cloudflare R2 (S3-compatible) with custom domain |
| State | TanStack React Query v5 + React Context (auth) |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Icons | Lucide React |
| Toasts | Sonner |

---

## Database Schema

### Models

```
User        — id, name, email, password, role (ADMIN|ENCODER), isActive
Department  — id, name, code (unique), color, head, isActive
File        — id, fileName (R2 key), originalName, size, mimeType, departmentId, year, uploadedById
Record      — id, name, departmentId, year, status, data (Json)
UploadLog   — id, departmentId, year, fileName, inserted, skipped, status, errors
```

### Key Design Decisions

- **No Gender/Age/Address columns** — These are NOT fixed fields. All extra data from Excel goes into `data: {}` JSON field on Record
- **File storage, not data extraction** — System stores files as-is on R2, does not parse Excel contents
- **Soft delete on departments** — Sets `isActive: false`, does not hard delete
- **Year-based folders** — Files organized by department + year, default folders 2022-2026

---

## Features Built

### Authentication & Authorization

| Feature | Status | Details |
|---------|--------|---------|
| Login page | ✅ Done | Two-column layout, React Hook Form + Zod, JWT auth |
| Auth context | ✅ Done | Token in localStorage, auto-refresh on mount |
| Protected routes | ✅ Done | Redirect to /login if not authenticated |
| Role-based access (RBAC) | ✅ Done | ADMIN: full access, ENCODER: upload/view only |
| RoleGuard component | ✅ Done | `<RoleGuard roles={['ADMIN']}>` for conditional UI |
| useRole hook | ✅ Done | `can('delete_department')` permission check |
| Session expired toast | ✅ Done | 401 interceptor shows toast + redirects |
| Logout toast | ✅ Done | "Signed out successfully" |

### Dashboard (`/dashboard`)

| Feature | Status | Details |
|---------|--------|---------|
| Stat cards | ✅ Done | Total Files, Storage Used, Departments, Most Recent Year |
| Bar chart | ✅ Done | Files by Department (colored bars, top 10 or view all toggle) |
| Recent uploads list | ✅ Done | Last 8 files with dept badge, click to navigate |
| Department grid | ✅ Done | All departments as clickable cards with file count |
| Year filter chips | ✅ Done | Filter all stats by year |
| Loading skeletons | ✅ Done | StatCardSkeleton, ChartSkeleton, ListItemSkeleton |

### Departments

| Feature | Status | Details |
|---------|--------|---------|
| Create department | ✅ Done | Modal with name, code, color picker, head name |
| Edit department | ✅ Done | Inline edit modal (name, code, head) |
| Delete department | ✅ Done | Type "DELETE" to confirm, soft delete |
| Sidebar navigation | ✅ Done | Shows first 5 depts + "All departments" search dialog |
| Add Department button | ✅ Done | Always visible in sidebar |
| Department detail page | ✅ Done | Year folders + file grid (Google Drive style) |

### File Management (Department Detail Page)

| Feature | Status | Details |
|---------|--------|---------|
| Year folder grid | ✅ Done | Default 2022-2026 + custom folders |
| Create new folder | ✅ Done | Dialog to add year folder |
| Upload files | ✅ Done | Multi-file upload to R2 with progress bar |
| Drag & drop upload | ✅ Done | Drop zone inside folder view |
| File grid view | ✅ Done | Cards with icon, name, size, date |
| View file | ✅ Done | Office files → Microsoft Office Online Viewer, others → direct URL |
| Download file | ✅ Done | Direct download from R2 public URL |
| Delete file | ✅ Done | Type "DELETE" to confirm (ADMIN only) |
| Search files | ✅ Done | Backend search by filename |
| Pagination | ✅ Done | 20 files per page, server-side |

### Upload History (`/upload-history`)

| Feature | Status | Details |
|---------|--------|---------|
| File table | ✅ Done | Name, Department, Year, Size, Uploaded by, Date, Actions |
| Search | ✅ Done | Backend search by filename |
| Filter by department | ✅ Done | Dropdown with all departments |
| Filter by year | ✅ Done | Dropdown with available years |
| Clear filters | ✅ Done | One-click reset |
| Pagination | ✅ Done | 20 per page, server-side |
| View/Download actions | ✅ Done | Eye icon + download icon per row |

### Cloudflare R2 Storage

| Feature | Status | Details |
|---------|--------|---------|
| S3-compatible upload | ✅ Done | `@aws-sdk/client-s3` with R2 endpoint |
| Public URL via custom domain | ✅ Done | `https://gaduploads.tanauancity.com/[key]` |
| File key structure | ✅ Done | `DEPT_CODE/YEAR/uniqueid-filename.xlsx` |
| Delete from R2 | ✅ Done | Removes from both R2 and database |
| Lazy S3 client init | ✅ Done | Ensures dotenv loads before credentials read |

### UI Components & Polish

| Feature | Status | Details |
|---------|--------|---------|
| shadcn Dialog/AlertDialog | ✅ Done | z-index fixed (z-[99] overlay, z-[100] popup) |
| shadcn Select in dialogs | ✅ Done | z-[200] to render above dialog overlay |
| CSS variables (shadcn theme) | ✅ Done | Full theme in index.css (popover, card, muted, etc.) |
| tw-animate-css | ✅ Done | Dialog open/close animations |
| EmptyState component | ✅ Done | Configurable icon, title, subtitle, action |
| LoadingSkeleton variants | ✅ Done | StatCard, TableRow, Chart, ListItem, SidebarItem |
| ErrorBoundary | ✅ Done | Class component, "Something went wrong" + Reload |
| Toast notifications | ✅ Done | Success/Error/Info via Sonner |
| DashboardLayout | ✅ Done | Sidebar + Topbar + scrollable content |

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/login` | No | — | Login with email/password |
| GET | `/api/auth/me` | Yes | Any | Get current user |

### Departments
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/departments` | Yes | Any | List active departments |
| GET | `/api/departments/:code` | Yes | Any | Get one by code |
| POST | `/api/departments` | Yes | ADMIN | Create department |
| PUT | `/api/departments/:id` | Yes | ADMIN | Update department |
| DELETE | `/api/departments/:id` | Yes | ADMIN | Soft delete (isActive=false) |

### Files
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/files` | Yes | Any | List files (paginated, filterable) |
| GET | `/api/files/years` | Yes | Any | Get distinct years |
| GET | `/api/files/:id/view` | Yes | Any | Redirect to public URL |
| POST | `/api/files` | Yes | ADMIN/ENCODER | Upload files to R2 |
| DELETE | `/api/files/:id` | Yes | ADMIN | Delete file from R2 + DB |

### Dashboard
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/dashboard/summary` | Yes | Any | Stats (totalFiles, totalSize, departments) |
| GET | `/api/dashboard/growth` | Yes | Any | Files per dept per year |
| GET | `/api/dashboard/years` | Yes | Any | Available years |
| GET | `/api/dashboard/recent` | Yes | Any | Latest uploaded files |

### Records (legacy, kept for compatibility)
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/records` | Yes | Any | List records (paginated) |
| POST | `/api/records` | Yes | ADMIN/ENCODER | Create record |
| PUT | `/api/records/:id` | Yes | ADMIN/ENCODER | Update record |
| DELETE | `/api/records/:id` | Yes | ADMIN | Delete record |
| GET | `/api/records/export` | Yes | Any | Export to Excel |

---

## Environment Variables

### Server (`server/.env`)
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/gaddatabase"
JWT_SECRET="your-secret-key"
PORT=3001
NODE_ENV=development
R2_BUCKET=gad-database
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_PUBLIC_URL=https://gaduploads.tanauancity.com
```

### Client (`client/.env`)
```
VITE_API_URL=http://localhost:3001/api
```

---

## Default Login
```
Email:    admin@gad.gov.ph
Password: Admin@123
```

---

## Seeded Departments (25)

| Code | Name |
|------|------|
| BAO | Barangay Affairs Office |
| BJMP | Bureau of Jail Management and Penology |
| BPLO | Business Permit and Licensing Office |
| CAO | City Agriculture Office |
| CCO | City Cooperative Office |
| CDRRMO | City Disaster Risk Reduction and Management Office |
| CENRO | City Environment and Natural Resources Office |
| CHO | City Health Office |
| CIO | City Information Office |
| CLO | City Legal Office |
| CPDO | City Planning and Development Office |
| CSWDO | City Social Welfare and Development Office |
| DEPED | Department of Education - Tanauan City |
| GAD | Gender and Development |
| HRMDO | HRMDO |
| LCRO | Local Civil Registry Office |
| LYO | LOCAL YOUTH OFFICE |
| OCVET | Office of the City Veterinarian |
| OSCA | Office of the Senior Citizens Affairs |
| PDAO | Persons with Disability Affairs Office |
| PNP | Philippine National Police - Tanauan City |
| PESO | Public Employment Service Office |
| SPO | Sangguniang Panlungsod Office |
| SDO | Sports Development Office |
| TCC | Tanauan City College |

---

## File Structure

```
gad-database/
├── client/
│   └── src/
│       ├── components/
│       │   ├── auth/          — ProtectedRoute, RoleGuard
│       │   ├── layout/        — DashboardLayout, Sidebar, Topbar
│       │   ├── modals/        — AddDepartmentModal, AddRecordModal, EditRecordModal, UploadModal
│       │   ├── shared/        — EmptyState, LoadingSkeleton, ErrorBoundary
│       │   └── ui/            — shadcn components (dialog, table, badge, etc.)
│       ├── context/           — AuthContext
│       ├── hooks/             — useAuth, useRole, useDepartments, useFiles, useRecords, useDashboard, useUpload
│       ├── lib/               — axios, queryClient, toast, utils
│       ├── pages/
│       │   ├── auth/          — LoginPage
│       │   ├── dashboard/     — DashboardPage
│       │   ├── departments/   — DepartmentDetailPage
│       │   ├── records/       — AllRecordsPage (placeholder)
│       │   ├── reports/       — ReportsPage (placeholder)
│       │   └── upload/        — UploadHistoryPage
│       ├── types/             — TypeScript interfaces
│       └── utils/             — formatters
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   └── src/
│       ├── controllers/       — auth, dashboard, department, file, record, upload
│       ├── middleware/        — auth, role, upload
│       ├── routes/            — auth, dashboard, department, file, record, upload
│       ├── types/             — TypeScript types
│       ├── utils/             — excel.parser, jwt, response, s3
│       └── index.ts
└── DOCS/
    ├── DOCS.MD               — Original vibe coding prompts
    └── CHANGELOG.md           — This file
```

---

## Migrations Applied

| Date | Migration | Description |
|------|-----------|-------------|
| 2026-03-31 | `init` | Initial schema (User, Department, Record, UploadLog) |
| 2026-03-31 | `remove_gender_columns` | Removed gender, age, address from Record model |
| 2026-03-31 | `add_files_table` | Added File model for R2 file storage |

---

## Known Issues / TODO

- [ ] R2 API token needs **Admin Read & Write** permission (currently may be read-only)
- [ ] AllRecordsPage — placeholder, needs implementation if record-based features are needed
- [ ] ReportsPage — placeholder, needs report generation features
- [ ] Topbar search — visual only, not wired to any functionality
- [ ] Topbar bell (notifications) — visual only, no notification system
- [ ] Multiple file upload progress — shows overall progress, not per-file
- [ ] File preview for non-Office formats (CSV) — downloads instead of previewing

---

*Last updated: April 1, 2026*
