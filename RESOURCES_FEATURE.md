# GAD Resources & Download Tracking System

Documentation for the GAD Resources feature, download tracking, and public frontend integrations.

---

## 1. GAD Resources (Admin Dashboard)

**Route:** `http://localhost:5173/resources`  
**Sidebar:** Tools > GAD Resources

### Features
- **Folder management** — create, rename, delete nested folders (Admin only)
- **File upload** — upload PDF, Word, Excel, PowerPoint, images, etc. (Admin + Encoder)
- **File rename** — rename files directly in the system (Admin + Encoder)
- **File delete** — delete files from R2 storage + database (Admin only)
- **Select All** — checkbox on each folder/file, select all toggle
- **Bulk Move** — move selected files/folders to another folder via folder picker dialog
- **Bulk Delete** — delete multiple items at once with confirmation
- **Breadcrumb navigation** — click to navigate up the folder tree
- **View** — opens files in Office365 viewer (Office files) or new tab (PDF/images)
- **Download** — streams file from R2 through backend proxy

### Security
- All CRUD operations require JWT authentication
- Folder create/rename/delete: Admin only
- File upload/rename: Admin + Encoder
- File delete: Admin only
- Bulk move/delete: Admin only
- Executable files blocked: `.exe .bat .cmd .sh .msi .com .scr .ps1 .vbs .wsf .jar`
- Duplicate folder names prevented at the same level

### Current Folder Structure (as uploaded)
```
Resources (root)
├── Books/                    → 8 PDF files (GAD books & publications)
├── GAD Policies & Resources/
│   ├── GAD Code/             → 3 PDF files (city ordinances)
│   └── Laws on GAD/          → 10 PDF files (ordinances & JMCs)
├── GAD RESOURCES/            → 4 files
└── IEC Materials/            → 4 files (PPTX booklets + 1 PDF)
```

---

## 2. Database Models

### ResourceFolder
```
id, name, parentId (self-referencing), createdById, createdAt, updatedAt
```
- Supports unlimited nesting via parent/children relation
- Cascade delete (deleting a folder deletes all children + files)

### ResourceFile
```
id, fileName (R2 key), originalName, size, mimeType, folderId, uploadedById, createdAt
```
- Files stored in Cloudflare R2 under `resources/` prefix
- Public URL: `https://gaduploads.tanauancity.com/resources/{key}`

### DownloadLog
```
id, fileType ("resource"|"department"), fileId, fileName,
name, location, contactNo, organization, sex ("MALE"|"FEMALE"), age,
ip, createdAt
```
- Tracks every public download with user information
- Personal data only accessible via authenticated dashboard endpoint

---

## 3. Backend API Endpoints

### Authenticated Resource Routes (`/api/resources/`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/folders?parentId=` | JWT | Any | List folders + files at level |
| GET | `/folders/:id` | JWT | Any | Get folder with breadcrumb |
| POST | `/folders` | JWT | Admin | Create folder |
| PUT | `/folders/:id` | JWT | Admin | Rename folder |
| DELETE | `/folders/:id` | JWT | Admin | Delete folder (cascade) |
| POST | `/files` | JWT | Admin/Encoder | Upload files (max 20, 50MB each) |
| PUT | `/files/:id` | JWT | Admin/Encoder | Rename file |
| DELETE | `/files/:id` | JWT | Admin | Delete file |
| GET | `/files/:id/view` | JWT | Any | Redirect to public R2 URL |
| GET | `/files/:id/download` | JWT | Any | Stream file with attachment header |
| POST | `/move` | JWT | Admin | Bulk move files + folders |
| POST | `/bulk-delete` | JWT | Admin | Bulk delete files + folders |

### Public Routes (`/api/public/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/resources?parentId=` | List folder contents (folders + files) |
| GET | `/resources/folder/:id` | Get folder with breadcrumb |
| GET | `/resources/view/:id` | Stream file for viewing (used by PDF.js) |
| GET | `/resources/tree/:name` | Get root folder by name with all subfolders + files |
| POST | `/download` | Submit form + download file (logs personal info) |

### Authenticated Dashboard Route

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard/download-stats?page=&limit=` | JWT | Download statistics with pagination |

---

## 4. Download Tracking System

### Flow
1. User clicks **Download** on public site (Policies, Database, Library, IEC Materials)
2. **Popup form** appears requiring: Full Name, Sex, Age, Location, Contact Number, Organization
3. User fills form and clicks Download
4. Backend saves info to `download_logs` table → streams file to browser
5. Admin views stats at `/reports` in the dashboard

### POST `/api/public/download` Body
```json
{
  "fileId": "cuid",
  "fileType": "resource" | "department",
  "name": "Juan Dela Cruz",
  "location": "Tanauan, Batangas",
  "contactNo": "09xxxxxxxxx",
  "organization": "City Government",
  "sex": "MALE" | "FEMALE",
  "age": "25"
}
```
Response: Streams the file as attachment (Content-Disposition: attachment).

---

## 5. Reports Page (Admin Dashboard)

**Route:** `http://localhost:5173/reports`

### Charts & Stats
- **4 stat cards** — Total Downloads, Resource Downloads, Department Downloads, Unique Files
- **Daily downloads bar chart** — last 30 days
- **Downloads by Sex** — pie chart (Male vs Female with percentages)
- **Downloads by Source** — pie chart (Resources vs Department)
- **Top 10 Downloaded Files** — ranked list with download counts
- **Recent Downloads table** — paginated (20 per page) with columns:
  Name, Sex, Age, Organization, Location, Contact, File, Source, Date

### Security
- Endpoint requires JWT authentication (`/api/dashboard/download-stats`)
- Personal data (names, contacts) never exposed on public routes

---

## 6. Public Frontend Integrations

### Shared Utilities (`src/utils/gadApi.js`)
- `GAD_API_BASE` — single source for API URL
- `getViewUrl(file)` — returns Office365 viewer URL for Office files, direct URL for others
- `formatSize(bytes)` — human-readable file size

### Pages Updated

#### Policies Page (`/Policies`)
- **Data source:** `GET /api/public/resources/tree/GAD Policies & Resources`
- Shows subfolders (GAD Code, Laws on GAD) as gradient-header sections
- Files listed with View + Download buttons
- Download triggers form modal → tracked

#### Library Page (`/Library`)
- **Books tab:** Now pulls from GAD Resources API (`Books` folder) instead of WordPress
- Publications, Articles, Blog tabs still from WordPress
- Book downloads trigger form modal → tracked

#### Database Page (`/database`)
- Download button triggers form modal → tracked
- Uses shared `formatSize` from `gadApi.js`

#### IEC Materials Page (`/iec-materials`)
- **New page** added to navbar
- Fetches from GAD Resources API (`IEC Materials` folder)
- Card grid with file type icons, View + Download buttons
- Downloads tracked via form modal

#### Homepage Books Section (`/`)
- **New section** after Featured News
- Horizontal scroll carousel of books from `Books` folder
- PDF cover thumbnails rendered via PDF.js (loaded from CDN, proxied through backend to avoid CORS)
- Gradient fallback covers for non-PDF or load failures
- Download link triggers form modal

### Download Form Modal (`src/components/DownloadFormModal.js`)
- Shared component used across all public pages
- Fields: Full Name, Sex, Age, Location, Contact Number, Organization
- Submits to `POST /api/public/download` → streams file as blob → triggers browser save

---

## 7. Architecture Decisions

### Prisma Singleton
All controllers use a shared PrismaClient instance from `server/src/utils/db.ts` instead of creating separate instances.

### R2 Storage
- Files stored in Cloudflare R2 bucket `gad-database`
- Resource files use `resources/` prefix to avoid conflicts with department files
- Public URL base: `https://gaduploads.tanauancity.com`

### File Security
- Executable file types blocked at multer level (both resource and department upload routes)
- Files streamed through backend proxy for downloads (enables tracking + CORS bypass)
- Direct R2 URLs used only for viewing (no tracking needed)

### Circular Move Protection
When moving folders, the backend walks the parent chain from the target folder to root to ensure a folder is never moved into itself or one of its own descendants.

---

## 8. Environment Variables

### Backend (`server/.env`)
- `DATABASE_URL` — PostgreSQL connection string
- `R2_ACCESS_KEY_ID` — Cloudflare R2 access key
- `R2_SECRET_ACCESS_KEY` — Cloudflare R2 secret key
- `R2_BUCKET` — R2 bucket name (default: `gad-database`)
- `R2_PUBLIC_URL` — Public URL base (default: `https://gaduploads.tanauancity.com`)

### Admin Frontend (`client/.env`)
- `VITE_API_URL` — Backend API URL (e.g., `http://localhost:3001/api`)

### Public Frontend (`mld/.env`)
- `REACT_APP_GAD_API_URL` — Backend public API URL (e.g., `http://localhost:3001/api/public`)
