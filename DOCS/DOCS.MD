# GAD Database — Vibe Coding Prompts
> Gender & Development Records Management System
> Sundin ang order. Copy paste lang. Cursor AI ang gagawa.

---

# BAGO MAGSIMULA — I-INSTALL MUNA

```
1. I-download ang Cursor AI → cursor.com
2. I-install Node.js → nodejs.org (LTS version)
3. I-install PostgreSQL → postgresql.org
4. I-install Git → git-scm.com
5. Buksan ang Cursor AI
```

---

# STEP 0 — GAWA NG .cursorrules FILE

Sa root folder ng project (`gad-database/`), gumawa ng file na `.cursorrules`.
Kopyahin mo lahat ng laman:

```
You are a senior full-stack developer building "GAD Database" — a Gender and Development Records Management System for a Local Government Unit in the Philippines.

PROJECT NAME: gad-database
SYSTEM NAME: GAD Database
SYSTEM FULL NAME: Gender and Development Records Management System

TECH STACK:
- Frontend: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query v5 + Axios + Recharts + React Router v6 + React Hook Form + Zod + Sonner (toasts) + Lucide React (icons)
- Backend: Node.js + Express + TypeScript + PostgreSQL + Prisma ORM + Multer + xlsx + JWT + bcrypt
- Monorepo: /client (frontend) and /server (backend) folders

ROLES: ADMIN, ENCODER only — NO viewer role
- ADMIN: full access — create/edit/delete departments, records, users, upload files, view everything
- ENCODER: can view dashboard, add records, edit records, upload Excel files. Cannot delete records, cannot manage departments, cannot manage users.

IMPORTANT — DYNAMIC DATA:
- Departments are NOT hardcoded — Admin creates them through the UI (name, code, color, head)
- Years are NOT hardcoded — year is an Int field on Record, system reads distinct years from DB automatically
- Seed file creates 1 admin user ONLY — no sample departments or records
- Records are flexible — no fixed fields except name, department, year, status
- Extra fields from Excel (gender, age, address, etc.) are stored dynamically in the data Json field
- Different departments may have different columns in their Excel — all extra columns go to data: {}

DESIGN SYSTEM — Vercel + Stripe aesthetic (clean white, minimal):
- Background: #FFFFFF
- Sidebar: #FFFFFF white, right border 1px solid #F0F0F0, width 240px, NO dark colors
- Topbar: #FFFFFF white, bottom border 1px solid #F0F0F0, height 56px
- Cards: white #FFFFFF, border 1px solid #EBEBEB, border-radius 10px, padding 20px
- Primary button: bg #18181B (near black), text white, border-radius 8px
- Ghost button: bg transparent, border 1px #EBEBEB, text #09090B
- Active nav state: bg #F4F4F5, left border 2px solid #18181B, text #09090B, font-weight 500
- Inactive nav: text #71717A, no border, hover bg #F9F9F9
- Female color: #E11D48 (rose) — for female stats, badges, chart lines
- Male color: #2563EB (blue) — for male stats, badges, chart lines
- Success: #16A34A | Warning: #D97706 | Danger: #DC2626
- Font: Inter — weights 400, 500, 600 only — NEVER 700 or 800
- Text primary: #09090B | Text secondary: #71717A | Text hint: #A1A1AA
- Style reference: vercel.com/dashboard + stripe.com/dashboard + linear.app
- All UI uses shadcn/ui — NEVER build raw HTML forms or tables from scratch

FOLDER STRUCTURE (always follow this — never create files outside this structure):
client/src/
  components/
    layout/       — DashboardLayout.tsx, Sidebar.tsx, Topbar.tsx
    modals/       — AddDepartmentModal.tsx, AddRecordModal.tsx, EditRecordModal.tsx, UploadModal.tsx
    auth/         — ProtectedRoute.tsx, RoleGuard.tsx
    charts/       — GenderBarChart.tsx, GrowthLineChart.tsx
    shared/       — LoadingSkeleton.tsx, EmptyState.tsx, ErrorBoundary.tsx
    ui/           — shadcn auto-generated files here only
  context/        — AuthContext.tsx
  hooks/          — useAuth.ts, useRole.ts, useDepartments.ts, useRecords.ts, useUpload.ts
  lib/            — axios.ts, queryClient.ts, toast.ts
  pages/
    auth/         — LoginPage.tsx
    dashboard/    — DashboardPage.tsx
    departments/  — DepartmentDetailPage.tsx
    records/      — AllRecordsPage.tsx
    reports/      — ReportsPage.tsx
    upload/       — UploadHistoryPage.tsx
  types/          — index.ts (all shared TS types)
  utils/          — formatters.ts

server/src/
  controllers/    — auth, dashboard, department, record, upload controllers
  middleware/     — auth, role, upload middleware
  routes/         — auth, dashboard, department, record, upload routes
  types/          — index.ts
  utils/          — excel.parser.ts, jwt.ts, response.ts
  index.ts        — main server entry

SHARED TYPESCRIPT TYPES (already in client/src/types/index.ts — always import from here):
- Role = 'ADMIN' | 'ENCODER'
- Status = 'ACTIVE' | 'PENDING' | 'INACTIVE'
- Gender, Status = 'ADMIN' | 'ENCODER'
- User, Department, Record, UploadLog, ApiResponse<T>, PaginatedResponse<T>
- DashboardSummary, DepartmentStat

API RESPONSE FORMAT (always follow this):
{ success: boolean, data: T, message: string }

PRISMA MODELS (reference — do not change without asking):
- User: id, name, email, password, role(ADMIN|ENCODER), isActive, createdAt, updatedAt
- Department: id, name, code(unique), color, head, isActive, createdAt, updatedAt
- Record: id, name, departmentId, year(Int), status, data(Json — all extra fields here), uploadedById, createdAt, updatedAt
- UploadLog: id, departmentId, year, fileName, inserted, skipped, status(SUCCESS|PARTIAL|FAILED), errors(Json), uploadedById, createdAt

CODE RULES — strictly follow:
- Always TypeScript — NEVER use 'any'
- Always Prisma — NEVER write raw SQL
- Always TanStack Query (useQuery / useMutation) for all frontend data fetching
- Always Zod for validation on both frontend and backend
- Always import types from client/src/types/index.ts
- Always add loading state (shadcn Skeleton), error state, and empty state (EmptyState component)
- Always handle errors with try/catch in controllers
- Always use sendSuccess() and sendError() utils in controllers
- NEVER hardcode department names, years, or gender counts — always fetch from API

EXCEL UPLOAD — FLEXIBLE FORMAT:
- Only required column: "Name"
- All other columns (whatever the department uses) are stored in data: {} as key-value pairs
- Example: PESO may upload Name + Beneficiary Type + Skills | PNP may upload Name + Case Type + Date Filed
- The system does NOT enforce specific columns — it just saves everything dynamically

WHEN I ASK FOR A FEATURE — always do this:
1. List all files to create or modify first
2. Write complete code — NEVER truncate or say "rest remains the same"
3. Follow existing patterns in the codebase (@codebase)
4. Include proper TypeScript types (from types/index.ts)
5. Include loading, error, and empty states
6. Follow the design system strictly
```

---

# STEP 1 — PROJECT SETUP

### Prompt 1.1 — Complete project setup + folder structure

I-open ang Cursor. Pindutin ang `Ctrl+I` (Composer).
I-paste ito:

```
Create a professional monorepo project called "gad-database" for a Gender and Development Records Management System.

STEP 1 — Create root folder and install everything:

ROOT:
gad-database/
  client/
  server/
  .gitignore
  README.md

Run these terminal commands in order:
mkdir gad-database && cd gad-database
git init

FRONTEND — run inside gad-database/:
npm create vite@latest client -- --template react-ts
cd client
npm install
npm install @tanstack/react-query@5 axios react-router-dom react-hook-form zod @hookform/resolvers recharts lucide-react sonner
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init
(shadcn options: Default style, Zinc color, yes to CSS variables)
npx shadcn@latest add button card input label select dialog alert-dialog table badge skeleton tabs progress separator avatar dropdown-menu

BACKEND — run inside gad-database/:
mkdir server && cd server
npm init -y
npm install express cors dotenv bcryptjs jsonwebtoken multer xlsx @prisma/client
npm install -D typescript ts-node-dev @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken @types/multer prisma
npx tsc --init
npx prisma init

STEP 2 — Create this EXACT folder structure:

gad-database/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Topbar.tsx
│   │   │   ├── modals/
│   │   │   │   ├── AddDepartmentModal.tsx
│   │   │   │   ├── AddRecordModal.tsx
│   │   │   │   ├── EditRecordModal.tsx
│   │   │   │   └── UploadModal.tsx
│   │   │   ├── auth/
│   │   │   │   ├── ProtectedRoute.tsx
│   │   │   │   └── RoleGuard.tsx
│   │   │   ├── ui/
│   │   │   ├── charts/
│   │   │   │   ├── GenderBarChart.tsx
│   │   │   │   └── GrowthLineChart.tsx
│   │   │   └── shared/
│   │   │       ├── LoadingSkeleton.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       └── ErrorBoundary.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useRole.ts
│   │   │   ├── useDepartments.ts
│   │   │   ├── useRecords.ts
│   │   │   └── useUpload.ts
│   │   ├── lib/
│   │   │   ├── axios.ts
│   │   │   ├── queryClient.ts
│   │   │   └── toast.ts
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.tsx
│   │   │   ├── departments/
│   │   │   │   └── DepartmentDetailPage.tsx
│   │   │   ├── records/
│   │   │   │   └── AllRecordsPage.tsx
│   │   │   ├── reports/
│   │   │   │   └── ReportsPage.tsx
│   │   │   └── upload/
│   │   │       └── UploadHistoryPage.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── formatters.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env
│   ├── .env.example
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── department.controller.ts
│   │   │   ├── record.controller.ts
│   │   │   └── upload.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── role.middleware.ts
│   │   │   └── upload.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── department.routes.ts
│   │   │   ├── record.routes.ts
│   │   │   └── upload.routes.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── excel.parser.ts
│   │   │   ├── jwt.ts
│   │   │   └── response.ts
│   │   └── index.ts
│   ├── .env
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── .gitignore
└── README.md

STEP 3 — Create these config files:

client/.env.example:
VITE_API_URL=http://localhost:3001/api

server/.env.example:
DATABASE_URL="postgresql://postgres:password@localhost:5432/gad_database"
JWT_SECRET="change-this-secret-in-production"
PORT=3001
NODE_ENV=development

.gitignore:
node_modules/
dist/
.env
.DS_Store

server/tsconfig.json:
- target: ES2020, module: commonjs
- outDir: ./dist, rootDir: ./src
- strict: true, esModuleInterop: true, skipLibCheck: true

server/package.json scripts:
"dev": "ts-node-dev --respawn --transpile-only src/index.ts"
"build": "tsc"
"start": "node dist/index.js"
"db:migrate": "prisma migrate dev"
"db:seed": "ts-node prisma/seed.ts"
"db:studio": "prisma studio"
"db:reset": "prisma migrate reset"

client/package.json scripts:
"dev": "vite"
"build": "vite build"
"preview": "vite preview"

STEP 4 — Create client/src/types/index.ts:

export type Role = 'ADMIN' | 'ENCODER'
export type Status = 'ACTIVE' | 'PENDING' | 'INACTIVE'
export type Gender = 'FEMALE' | 'MALE'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  createdAt: string
}

export interface Department {
  id: string
  name: string
  code: string
  color: string
  head: string
  isActive: boolean
  _count?: { records: number }
  createdAt: string
}

export interface GadRecord {
  id: string
  name: string
  department: Department
  departmentId: string
  year: number
  status: Status
  data: Record<string, unknown>  // all extra fields from Excel stored here
  uploadedById: string
  createdAt: string
  updatedAt: string
}

export interface UploadLog {
  id: string
  department: Department
  year: number
  fileName: string
  inserted: number
  skipped: number
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  errors: string[]
  createdAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

export interface PaginatedResponse<T> {
  records: T[]
  total: number
  page: number
  totalPages: number
}

export interface DashboardSummary {
  totalRecords: number
  totalDepartments: number
  departments: DepartmentStat[]
}

export interface DepartmentStat {
  id: string
  name: string
  code: string
  color: string
  total: number
  trend: number
}

STEP 5 — Create client/src/utils/formatters.ts:
- formatDate(date: string): string — e.g. "Mar 28, 2026"
- formatNumber(n: number): string — e.g. "1,234"
- getInitials(name: string): string — "Juan Dela Cruz" → "JD"
- getGenderColor(gender: Gender): string — FEMALE: "#E11D48", MALE: "#2563EB"
- getGenderBadgeClass(gender: Gender): object — returns tailwind bg + text classes

Show all created files and confirm complete folder structure.
```

---

### Prompt 1.2 — Configure Tailwind + Inter font

```
Read @codebase. Configure the GAD Database frontend:

1. client/tailwind.config.ts:
   - content: ["./index.html", "./src/**/*.{ts,tsx}"]
   - extend colors:
     female: '#E11D48'
     male: '#2563EB'
     surface: '#F4F4F5'

2. client/src/index.css:
   - Import Inter from Google Fonts
   - Set base: font-family Inter, bg white, text #09090B
   - Remove default Vite styles

3. client/src/main.tsx:
   - Wrap App with QueryClientProvider (import from lib/queryClient.ts)

4. client/src/lib/axios.ts:
   - Axios instance, baseURL: import.meta.env.VITE_API_URL
   - Request interceptor: attach Bearer token from localStorage('gad_token')
   - Response interceptor: on 401 → clear localStorage, redirect to /login

5. client/src/lib/queryClient.ts:
   - TanStack Query client
   - staleTime: 5 minutes
   - retry: 1

6. client/src/lib/toast.ts:
   - Import toast from sonner
   - export toastSuccess(msg: string)
   - export toastError(msg: string)
   - export toastInfo(msg: string)

Show complete code for all files.
```

---

### Prompt 1.3 — Prisma Database Schema

```
Read @codebase. Create the Prisma schema for GAD Database at server/prisma/schema.prisma:

Models:

1. User
   - id String @id @default(cuid())
   - name String
   - email String @unique
   - password String
   - role Role @default(ENCODER)
   - isActive Boolean @default(true)
   - createdAt DateTime @default(now())
   - updatedAt DateTime @updatedAt
   - records Record[]
   - uploadLogs UploadLog[]

2. Department
   - id String @id @default(cuid())
   - name String
   - code String @unique
   - color String
   - head String
   - isActive Boolean @default(true)
   - createdAt DateTime @default(now())
   - updatedAt DateTime @updatedAt
   - records Record[]
   - uploadLogs UploadLog[]

3. Record
   - id String @id @default(cuid())
   - name String
   - departmentId String
   - department Department @relation(...)
   - year Int
   - status Status @default(ACTIVE)
   - data Json @default("{}")   ← all extra fields from Excel stored here
   - uploadedById String
   - uploadedBy User @relation(...)
   - createdAt DateTime @default(now())
   - updatedAt DateTime @updatedAt

4. UploadLog
   - id String @id @default(cuid())
   - departmentId String
   - department Department @relation(...)
   - year Int
   - fileName String
   - inserted Int @default(0)
   - skipped Int @default(0)
   - uploadedById String
   - uploadedBy User @relation(...)
   - status UploadStatus @default(SUCCESS)
   - errors Json @default("[]")
   - createdAt DateTime @default(now())

Enums:
- Role: ADMIN, ENCODER
- Status: ACTIVE, PENDING, INACTIVE
- UploadStatus: SUCCESS, PARTIAL, FAILED

NO Gender enum — gender is just a regular column in data: {} if the department chooses to include it

After schema, create server/prisma/seed.ts:
- Hash password using bcryptjs
- Create 1 ADMIN user ONLY:
  name: "Administrator"
  email: "admin@gad.gov.ph"
  password: "Admin@123" (hashed)
  role: ADMIN
- DO NOT create any departments or records
- Log: "Seed complete. Login: admin@gad.gov.ph / Admin@123"

Commands to run after:
npx prisma migrate dev --name init
npx prisma db seed
```

---

### Prompt 1.4 — Backend Server Setup

```
Read @codebase. Create the complete Express TypeScript server for GAD Database:

server/src/index.ts:
- Express app
- CORS: allow http://localhost:5173
- JSON + urlencoded body parser
- Routes: /api/auth, /api/departments, /api/records, /api/upload, /api/dashboard
- Global error handler middleware
- PORT from .env, default 3001
- Log on start: "GAD Database API running on port 3001"

server/src/types/index.ts:
- ApiResponse<T> interface
- AuthRequest interface (extends Express Request, adds user: JwtPayload)
- JwtPayload: { id, email, role, name }
- Role, Gender, Status enums matching Prisma

server/src/utils/response.ts:
- sendSuccess<T>(res, data: T, message: string, statusCode = 200)
- sendError(res, message: string, statusCode = 400)

server/src/utils/jwt.ts:
- generateToken(payload: JwtPayload): string — 7 days expiry
- verifyToken(token: string): JwtPayload — throws on invalid

server/src/middleware/auth.middleware.ts:
- Extract Bearer token from Authorization header
- Verify with verifyToken
- Attach decoded payload to req.user
- Return 401 if missing or invalid

server/src/middleware/role.middleware.ts:
- roleGuard(...roles: Role[]) — factory function returns middleware
- Returns 403 "Insufficient permissions" if req.user.role not in allowed roles

Show complete code for all files.
```

---

# STEP 2 — AUTHENTICATION

### Prompt 2.1 — Auth API

```
Read @codebase. Create auth API for GAD Database:

server/src/controllers/auth.controller.ts:

login(req, res):
- POST /api/auth/login
- Body: { email: string, password: string }
- Zod validation on body
- Find user by email — 401 if not found or isActive=false
- bcrypt.compare password — 401 "Invalid credentials" if wrong
- generateToken({ id, email, role, name })
- Return: { token, user: { id, name, email, role } }

me(req, res):
- GET /api/auth/me (protected)
- Find user by req.user.id from DB
- Return user without password field

server/src/routes/auth.routes.ts:
- POST /login → login
- GET /me → authMiddleware → me

Use sendSuccess and sendError for all responses.
Include try/catch on all functions.
Show complete code.
```

---

### Prompt 2.2 — Login Page Frontend

```
Read @codebase. Create Login page for GAD Database:

client/src/pages/auth/LoginPage.tsx:
Full screen two-column layout:

LEFT PANEL (35% width, bg #09090B near black):
- "GAD" large white logo text, bold
- "Gender & Development Database" white subtitle
- 3 bullet points with check icons (white):
  "Department-based records management"
  "Female & Male beneficiary tracking"
  "Excel upload & export support"
- Bottom: LGU name muted gray text

RIGHT PANEL (65% width, white bg):
- Centered form, max-width 400px
- "Welcome back" — 24px font-weight 600 #09090B
- "Sign in to your account" — muted subtitle
- Email field (shadcn Input + Label)
- Password field with show/hide toggle (Eye/EyeOff lucide icon)
- "Sign In" button — full width, bg #18181B text white
- Loading spinner inside button while submitting
- Error Alert (shadcn Alert, variant destructive) below button on error

React Hook Form + Zod validation:
- email: z.string().email("Valid email required")
- password: z.string().min(6, "Min 6 characters")

On submit:
- POST to /api/auth/login via axios instance
- Success: save token to localStorage('gad_token'), save user to AuthContext, navigate('/dashboard')
- Error: show error message from API

client/src/context/AuthContext.tsx:
- user: User | null state
- login(token: string, user: User): void — saves to localStorage + state
- logout(): void — clears localStorage('gad_token', 'gad_user'), navigate('/login')
- isAuthenticated: boolean
- isLoading: boolean (true while checking localStorage on mount)

client/src/hooks/useAuth.ts:
- returns { user, login, logout, isAuthenticated, isLoading }

client/src/components/auth/ProtectedRoute.tsx:
- isLoading → full screen centered spinner
- !isAuthenticated → <Navigate to="/login" />
- else → <Outlet />

client/src/App.tsx:
- Wrap with AuthProvider + QueryClientProvider + <Toaster /> (sonner, position top-right)
- Routes:
  /login → LoginPage (no auth needed)
  / → <Navigate to="/dashboard" />
  Protected routes via ProtectedRoute:
    /dashboard → DashboardPage
    /departments/:code → DepartmentDetailPage
    /records → AllRecordsPage
    /reports → ReportsPage
    /upload-history → UploadHistoryPage

Show complete code for all files.
```

---

# STEP 3 — DASHBOARD

### Prompt 3.1 — Dashboard API

```
Read @codebase. Create dashboard API for GAD Database:

server/src/controllers/dashboard.controller.ts:

getSummary(req, res) — GET /api/dashboard/summary?year=2026
- Count total records (filter by year if provided)
- Count active departments
- Per department: total record count
- Compute trend: compare current year count vs previous year
- Return DashboardSummary shape

getGrowth(req, res) — GET /api/dashboard/growth
- Group records by year AND department
- For each year: total count per department
- Return: { labels: string[], datasets: [{ dept, code, color, data: number[] }] }

getAvailableYears(req, res) — GET /api/dashboard/years
- SELECT DISTINCT year FROM records ORDER BY year ASC
- Return: number[] — empty array if no records yet

getRecent(req, res) — GET /api/dashboard/recent?limit=10
- Latest records by createdAt DESC
- Include department (name, code, color)
- Return array of GadRecord

server/src/routes/dashboard.routes.ts:
GET /summary → authMiddleware → getSummary
GET /growth → authMiddleware → getGrowth
GET /years → authMiddleware → getAvailableYears
GET /recent → authMiddleware → getRecent

Show complete code.
```

---

### Prompt 3.2 — Dashboard Layout

```
Read @codebase. Create the layout shell for GAD Database:

client/src/components/layout/DashboardLayout.tsx:
- Flex row, full height screen
- Left: <Sidebar /> fixed 240px
- Right: flex column — <Topbar /> fixed 56px + scrollable content area
- Pass title and breadcrumb as props to Topbar

client/src/components/layout/Sidebar.tsx:
Design: white bg, right border 1px #F0F0F0, 240px width

TOP BRAND (64px, border-bottom):
- Black rounded square icon (28px) with "G" white letter
- "GAD Database" font-weight 600 #09090B 14px
- "Gender & Development" #71717A 11px

NAV GROUPS (use NavLink from react-router-dom for active detection):
Group "Overview":
- Dashboard (LayoutDashboard icon)
- All Beneficiaries (Users icon) — gray count pill on right

Group "Departments" — fetched from useGetDepartments():
- Loading: 3 skeleton items (shadcn Skeleton, 32px height)
- Empty: muted "No departments" text + dashed "Add Department" button
- Each dept: colored square 8x8 + name + gray count pill
- Active: bg #F4F4F5, left border 2px solid #18181B, text #09090B 500

Group "Tools":
- Upload Data (Upload icon)
- Add Department (Plus icon)
- Reports (BarChart3 icon)
- Upload History (Clock icon)

Nav item active class: bg-[#F4F4F5] border-l-2 border-[#18181B] text-[#09090B] font-medium
Nav item base class: text-[#71717A] hover:bg-[#F9F9F9] rounded-md

FOOTER (border-top):
- Avatar (initials, gray circle, 30px) + name + role
- LogOut icon button on right → calls logout()

client/src/components/layout/Topbar.tsx:
Props: { title: string, breadcrumb: string, onUpload?: () => void, onAddDept?: () => void }
- White bg, border-bottom 1px #F0F0F0, height 56px, px-6
- Left: title 15px 600 + breadcrumb 11px muted below
- Right: search input (gray bg, Search icon) + bell icon + "Upload" ghost btn + "Add Record" black btn

Show complete code for all 3 files.
```

---

### Prompt 3.3 — Dashboard Page

```
Read @codebase. Create the main Dashboard page for GAD Database:

client/src/pages/dashboard/DashboardPage.tsx:

Use DashboardLayout wrapper.
Data: useQuery for /api/dashboard/summary, /api/dashboard/growth, /api/dashboard/years, /api/dashboard/recent

PAGE HEADER:
- "Overview" h1 font-weight 600 + "Gender & Development Dashboard" muted subtitle
- Right: "Upload Data" ghost button + "Add Record" black button
- Both buttons open their respective modals (useState for modal open/close)

YEAR FILTER BAR:
- "Year" label muted + dynamic chips from GET /api/dashboard/years
- Always show "All" chip first
- Active chip: bg #18181B text white rounded-full px-4 py-1
- Inactive chip: bg #F4F4F5 text #71717A rounded-full hover:#EBEBEB
- selectedYear state — passed to summary query as ?year=

STAT CARDS (4 equal columns, white cards):
1. Total Records — FileText icon black, big number, "Total records" label
2. Active Records — green dot, count, percentage of total
3. Departments — Grid icon, count, "Active departments" label
4. Latest Year — Calendar icon, most recent year in DB, "Most recent upload" label
Loading: shadcn Skeleton matching card shape

TWO COLUMN (60% left, 40% right):

LEFT — Records per Department bar chart (Recharts):
- Title "Records by Department"
- Horizontal bar chart, one bar per department, each bar uses dept color
- X axis: count | Y axis: department names
- Grid lines: #F4F4F5
- Tooltip on hover
- Empty state if no departments yet

RIGHT — Recent entries list:
- Title "Recent Entries" + "View all →" link to /records
- Each row: initials Avatar (gray) + name bold + dept colored badge + year muted
- Divider between rows 1px #F4F4F5
- 8 rows max
- Loading: 8 skeleton rows
- Empty: "No records yet" centered

BOTTOM — GrowthLineChart component (Recharts full width):
- Title "Record Growth by Year"
- One line per department, each using its own dept color
- X axis: dynamic years from API
- Smooth monotone curves, dot radius 4
- Light gray grid lines #F4F4F5
- Custom HTML legend showing dept name + colored dot
- Height 200px ResponsiveContainer
- Empty: "Upload data to see growth chart"

All loading via shadcn Skeleton. Error state shows Alert.
Show complete code.
```

---

# STEP 4 — DEPARTMENTS

### Prompt 4.1 — Department API

```
Read @codebase. Create Department CRUD API for GAD Database:

server/src/controllers/department.controller.ts:

getAll — GET /api/departments
- All active departments (isActive=true)
- Include _count: { records: true }
- All roles allowed

getOne — GET /api/departments/:code
- Find by code (toUpperCase)
- Include record count + female/male breakdown
- 404 if not found

create — POST /api/departments (ADMIN only)
Zod body schema:
- name: z.string().min(3)
- code: z.string().min(2).max(6).regex(/^[A-Z0-9]+$/, "Uppercase alphanumeric only")
- color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex color")
- head: z.string().min(3)
- Check duplicate code → 409 if exists
- code always saved as uppercase

update — PUT /api/departments/:id (ADMIN only)
- Partial update with same Zod validation
- Cannot change code to existing one

softDelete — DELETE /api/departments/:id (ADMIN only)
- isActive = false
- Return success message

server/src/routes/department.routes.ts — wire with auth + role middleware.
Show complete code.
```

---

### Prompt 4.2 — Add Department Modal

```
Read @codebase. Create AddDepartmentModal for GAD Database:

client/src/components/modals/AddDepartmentModal.tsx:
Props: { open: boolean, onClose: () => void, onSuccess: () => void }

Use shadcn Dialog.

FORM (React Hook Form + Zod):
Fields:
1. Full name — Input, min 3 chars
2. Short code — Input, max 6, auto-uppercase on change, alphanumeric only
3. Department head — Input
4. Color picker — 8 circle swatches (28px), click to select, checkmark overlay on selected:
   #3B82F6 #22C55E #EF4444 #F59E0B #A855F7 #06B6D4 #F97316 #EC4899

LIVE PREVIEW (updates real-time):
- Card showing: colored square (first 2 letters of code) + dept name + head name

FOOTER: Cancel ghost + "Add Department" black button (spinner while loading)

ON SUBMIT:
- useMutation POST /api/departments
- Success: invalidate ['departments'] query, toastSuccess("Department [CODE] added"), onSuccess(), onClose()
- Error: toastError(error message)

client/src/hooks/useDepartments.ts:
- useGetDepartments() → useQuery GET /api/departments
- useCreateDepartment() → useMutation POST /api/departments
- useUpdateDepartment() → useMutation PUT /api/departments/:id
- useDeleteDepartment() → useMutation DELETE /api/departments/:id

Show complete code.
```

---

# STEP 5 — RECORDS & UPLOAD

### Prompt 5.1 — Records API

```
Read @codebase. Create Records CRUD API for GAD Database:

server/src/controllers/record.controller.ts:

getAll — GET /api/records
Query params: dept, year, status, gender, search, page (default 1), limit (default 20)
- Filter by department code if dept provided
- Filter by year, status, gender if provided
- Search by name (contains, case insensitive)
- Paginate with skip/take
- Include department (name, code, color) in each record
- Return: { records, total, page, totalPages }

create — POST /api/records (ADMIN, ENCODER)
Zod body:
- name: string min 2
- departmentId: string
- year: number min 1900 max 2100
- status: ACTIVE | PENDING | INACTIVE
- data: object optional — any extra key-value fields

update — PUT /api/records/:id (ADMIN, ENCODER)
- Partial Zod validation

remove — DELETE /api/records/:id (ADMIN only)

export — GET /api/records/export?dept=PESO&year=2026
- Fetch all matching records (no pagination)
- Generate Excel using xlsx library
- Columns: Name, Gender, Age, Address, Department, Year, Status, Date Added
- Return downloadable file: [DEPT]_gad_records_[YEAR].xlsx

server/src/routes/record.routes.ts — wire all routes.
Show complete code.
```

---

### Prompt 5.2 — Upload Excel API

```
Read @codebase. Create Excel upload for GAD Database:

server/src/middleware/upload.middleware.ts:
- Multer memory storage
- Accept: .xlsx, .xls, .csv only
- Max size: 10MB
- Return 400 on wrong file type

server/src/utils/excel.parser.ts:
parseExcelFile(buffer: Buffer): ParsedRow[]
- Read first sheet with xlsx library
- First row = headers (whatever columns the dept uses)
- Only required column: "Name" (case insensitive check)
- Optional system columns: "Status" (default ACTIVE), "Year" (default current year)
- ALL other columns → stored as key-value pairs in data: {}
- Example: if dept uploads Name + Beneficiary Type + Skills → data: { "Beneficiary Type": "...", "Skills": "..." }
- Return { rowNumber, name, status, year, data, error? }

server/src/controllers/upload.controller.ts:

uploadFile — POST /api/upload (ADMIN, ENCODER)
Multipart: file, departmentId, year (override year for all rows if provided)
- Validate departmentId exists
- Parse file
- Validate each row (name required, gender must be FEMALE|MALE)
- Bulk insert valid rows (Prisma createMany)
- Create UploadLog entry
- Return: { inserted, skipped, errors: string[] }

getTemplate — GET /api/upload/template
- Generate a simple Excel with only 3 columns: Name | Status | Year
- Add note in row 2: "You can add any extra columns after Year — they will be saved automatically"
- Add 2 sample rows
- Return downloadable gad_upload_template.xlsx

getLogs — GET /api/upload/logs?page=1&limit=20
- Paginated UploadLog with department + uploader info

server/src/routes/upload.routes.ts — wire all routes.
Show complete code.
```

---

### Prompt 5.3 — Upload Modal Frontend

```
Read @codebase. Create UploadModal for GAD Database:

client/src/components/modals/UploadModal.tsx:
Props: { open: boolean, onClose: () => void, onSuccess: () => void }

Use shadcn Dialog. Two-step flow.

STEP 1 — Configure:
- Department dropdown (from useGetDepartments)
- Year number input (type="number" min=1900 max=2100, placeholder current year)
- "Download Template" link → GET /api/upload/template
- Next button (disabled if no dept selected)

STEP 2 — Upload File:
- Drag & drop zone (dashed border 2px #EBEBEB, rounded-lg)
  - dragover: border turns #18181B
  - drop/click: accept .xlsx .csv .xls only
  - After select: show file icon + name + size + "Remove" button
- Notes textarea optional
- Upload button (black, full width)

ON UPLOAD:
- FormData: { file, departmentId, year }
- POST with Axios onUploadProgress → shadcn Progress bar
- Success: show summary card "45 inserted, 2 skipped" + errors list
  Auto-close after 2s, call onSuccess(), invalidate records + dashboard queries
- Error: show error Alert, stay on modal

client/src/hooks/useUpload.ts:
- useUploadFile() — useMutation POST /api/upload
- useUploadLogs() — useQuery GET /api/upload/logs

Show complete code.
```

---

# STEP 6 — DEPARTMENT DETAIL PAGE

### Prompt 6.1 — Department Detail Page

```
Read @codebase. Create Department Detail page for GAD Database:

Route: /departments/:code
client/src/pages/departments/DepartmentDetailPage.tsx:

HEADER:
- Colored left border (4px, dept color) + dept full name h1 + code badge
- Head name muted + total count chip
- Right: "Export" ghost button + "Add Record" black button

YEAR TABS (shadcn Tabs):
- Fetch years from GET /api/dashboard/years
- "All" tab always first, then dynamic year tabs
- Switching refetches records

STAT CARDS ROW (4 cards):
Total | Female (rose) | Male (blue) | Pending (amber)
- Derived from fetched records

RECORDS TABLE (shadcn Table):
Columns: # | Name | Year | Status (badge) | Date Added | Actions
- Dynamic data columns from data: {} are NOT shown in main table (too many possible columns)
- Clicking a row → opens a detail drawer/modal showing all data: {} fields as key-value list
- Search bar (debounced 300ms) + Status filter
- 20 rows per page, shadcn Pagination
- Edit → EditRecordModal
- Delete → shadcn AlertDialog confirm → DELETE (ADMIN only via RoleGuard)

EMPTY STATE: EmptyState component with upload prompt

EXPORT: triggers GET /api/records/export?dept=[code]&year=[year] file download

client/src/hooks/useRecords.ts:
- useGetRecords(filters) — paginated
- useCreateRecord() — invalidates records + dashboard
- useUpdateRecord() — invalidates records
- useDeleteRecord() — invalidates records + dashboard

Show complete code.
```

---

# STEP 7 — ROLE BASED ACCESS

### Prompt 7.1 — Role Guard

```
Read @codebase. Implement RBAC for GAD Database:

ADMIN: all actions
ENCODER: view, add records, edit records, upload — NO delete, NO dept management, NO user management

client/src/hooks/useRole.ts:
Returns { isAdmin, isEncoder, can(action) }

Actions map:
'create_department' → ['ADMIN']
'edit_department'   → ['ADMIN']
'delete_department' → ['ADMIN']
'create_record'     → ['ADMIN', 'ENCODER']
'edit_record'       → ['ADMIN', 'ENCODER']
'delete_record'     → ['ADMIN']
'upload_file'       → ['ADMIN', 'ENCODER']
'manage_users'      → ['ADMIN']

client/src/components/auth/RoleGuard.tsx:
Props: { roles: Role[], children: ReactNode, fallback?: ReactNode }
- Render children if user.role in roles
- Render fallback (or null) otherwise

Apply in these places:
1. Delete button in records table → RoleGuard roles={['ADMIN']}
2. Add Department button → RoleGuard roles={['ADMIN']}
3. Edit/Delete department → RoleGuard roles={['ADMIN']}

Backend — confirm these guards are applied:
- POST /api/departments → roleGuard('ADMIN')
- DELETE /api/records/:id → roleGuard('ADMIN')
- DELETE /api/departments/:id → roleGuard('ADMIN')

Show complete code.
```

---

# STEP 8 — FINAL POLISH

### Prompt 8.1 — Skeletons + Empty States

```
Read @codebase. Add loading and empty states across GAD Database:

client/src/components/shared/LoadingSkeleton.tsx:
Export these skeleton variants using shadcn Skeleton:
- StatCardSkeleton — matches stat card shape (4 per row)
- TableRowSkeleton(columns: number) — matches table row
- ChartSkeleton — rectangle 200px height
- ListItemSkeleton — matches recent entries row

client/src/components/shared/EmptyState.tsx:
Props: { icon?: LucideIcon, title: string, subtitle?: string, action?: ReactNode }
- Centered, muted icon (48px, #A1A1AA), title 500, subtitle muted
- Optional action button below

Apply:
- DashboardPage: StatCardSkeleton x4, TableRowSkeleton x8, ChartSkeleton
- DepartmentDetailPage: StatCardSkeleton x4, TableRowSkeleton x10
- Sidebar departments: 3x Skeleton items while loading
- All empty states use EmptyState component

client/src/components/shared/ErrorBoundary.tsx:
- Class component, catches render errors
- Shows: "Something went wrong" + Reload button
- Logs error to console

Show complete code.
```

---

### Prompt 8.2 — Toast Notifications

```
Read @codebase. Wire up all toast notifications in GAD Database using lib/toast.ts:

Add toastSuccess / toastError / toastInfo calls to:

Departments:
- Create success: "Department [CODE] added successfully"
- Create error: error.message from API
- Delete success: "Department deactivated"

Records:
- Create success: "Record added successfully"
- Update success: "Record updated"
- Delete success: "Record deleted"

Upload:
- Success: "Upload complete — [n] inserted, [n] skipped"
- Error: "Upload failed: [reason]"

Auth:
- Login error: error message from API
- 401 interceptor in axios.ts: toastError("Session expired. Please sign in again.")
- Logout: toastInfo("Signed out successfully")

Also add <Toaster richColors position="top-right" /> in App.tsx if not already there.

Show all files that need changes and the exact lines to add.
```

---

### Prompt 8.3 — Final Config + README

```
Read @codebase. Create final config and documentation for GAD Database:

server/.env (example values):
DATABASE_URL="postgresql://postgres:password@localhost:5432/gad_database"
JWT_SECRET="gad-super-secret-jwt-key-change-in-production"
PORT=3001
NODE_ENV=development

client/.env (example values):
VITE_API_URL=http://localhost:3001/api

README.md (root):
# GAD Database
Gender and Development Records Management System

## Tech Stack
[list frontend and backend stack]

## Prerequisites
- Node.js 18+
- PostgreSQL 14+

## Setup Instructions
1. Clone the repo
2. Setup server: cd server, copy .env.example to .env, fill in values
3. Setup client: cd client, copy .env.example to .env
4. Install deps: cd server && npm install | cd client && npm install
5. Run migrations: cd server && npm run db:migrate
6. Seed DB: npm run db:seed
7. Run server: npm run dev (port 3001)
8. Run client: npm run dev (port 5173)

## Default Login
Email: admin@gad.gov.ph
Password: Admin@123

## Useful Commands
npm run db:studio — open Prisma Studio (DB GUI)
npm run db:reset — reset and re-seed database

Show complete README and confirm all .env files are correct.
```

---

# BONUS — DEBUG PROMPTS

### Error sa terminal:
```
I am building GAD Database. I got this error:

[PASTE EXACT ERROR HERE]

This happened when I ran: [command]
Relevant file: @[filepath]

Fix the error and explain what caused it in simple terms.
```

### API hindi gumagana:
```
Read @codebase. API endpoint not working.

Endpoint: [METHOD] /api/[route]
Expected: [what should happen]
Actual: [what happens]
Postman response: [paste response]

Files: @server/src/controllers/[file] @server/src/routes/[file]

Find the bug and fix it.
```

### TypeScript error:
```
Read @codebase. TypeScript error:

Error: [paste error]
File: @[filepath]

Fix without using 'any'. Explain the cause.
```