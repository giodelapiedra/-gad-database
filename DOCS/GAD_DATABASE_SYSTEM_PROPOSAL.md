# GAD Database System
## System Documentation & IT Maintenance Proposal

**City Government of Tanauan, Batangas**
**Gender and Development (GAD) Office**
**Prepared by: GAD Information Technology Unit**
**Year: 2026**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Problems Being Solved](#2-problems-being-solved)
3. [System Features](#3-system-features)
   - 3.1 Authentication & Access Control
   - 3.2 Dashboard & Analytics
   - 3.3 Department Management
   - 3.4 Beneficiary Records Management
   - 3.5 File Upload & Upload History
   - 3.6 Reports
   - 3.7 GAD Resources (File Library)
   - 3.8 GAD Templates & Form Submission
   - 3.9 Submissions Review (Admin)
   - 3.10 Notification System
   - 3.11 User Management
4. [User Roles](#4-user-roles)
5. [Technology Stack](#5-technology-stack)
6. [Why Annual IT Maintenance is Required](#6-why-annual-it-maintenance-is-required)
7. [Proposed Annual Maintenance Activities](#7-proposed-annual-maintenance-activities)
8. [Risks of No Maintenance](#8-risks-of-no-maintenance)
9. [Conclusion](#9-conclusion)

---

## 1. System Overview

The **GAD Database System** is a web-based information management platform developed exclusively for the Gender and Development (GAD) Office of the City Government of Tanauan, Batangas. It digitizes and centralizes all GAD-related records, reports, documents, and planning forms that were previously managed manually through paper forms, spreadsheets, and physical filing systems.

The system is accessible through any modern web browser and is hosted on the city's dedicated server, making it available to all authorized government personnel at any time.

**Key Purpose:**
> To provide the GAD Office with a secure, organized, and efficient digital system for managing beneficiary data, generating official DILG-compliant reports, processing GAD form submissions, and storing GAD resources — reducing manual workload, eliminating data loss, and ensuring accountability in GAD operations.

---

## 2. Problems Being Solved

| Old / Manual Problem | How the System Solves It |
|----------------------|--------------------------|
| GAD beneficiary records stored in separate Excel files per department | Centralized database with search, filter, and export |
| No way to track who uploaded what and when | Complete upload history with uploader, date, and status logs |
| GAD planning forms (GPB, AR) done manually on paper or Excel | Online form filling with auto-computed totals, directly submitted for approval |
| No approval workflow — forms passed through hand or email | Built-in submission → review → approve/return-with-comments → edit & resubmit → download workflow |
| Admins not informed of pending submissions | Real-time notification system with bell indicator |
| Encoders don't know if their submission was approved or returned | Instant in-app notifications with the admin's comments and attachments |
| No visibility into which departments have yet to submit | Encoding Progress bar and department filter showing who is still encoding |
| GAD files and resources scattered across email and drives | Centralized GAD Resources library with folder structure |
| No control over who accesses sensitive data | Role-based access: Encoders can only see their own data; only Admins see everything |
| Reports generated manually from multiple Excel files | Automated dashboard and reports with charts generated from live data |
| Hard to track which department submitted a GAD form | Every submission is tagged with the encoder's department |

---

## 3. System Features

---

### 3.1 Authentication & Access Control

The system uses a **secure login system** to ensure that only authorized City Government personnel can access it.

**Key Capabilities:**
- Email and password login with validation
- Session stored in a secure browser cookie (not localStorage) with a 7-day expiry
- Automatic session verification on every page load via the `/auth/me` API
- Expired or invalid sessions automatically log the user out and redirect to login
- Already-logged-in users are redirected away from the login page to their appropriate dashboard
- Each role is sent to their correct home page on login (Admin → Dashboard, Encoder → Templates)

**Security Features:**
- Passwords are hashed using **bcrypt** (industry-standard, cannot be reversed)
- Admins can reset passwords but cannot view existing passwords
- Inactive accounts cannot log in even with correct credentials

---

### 3.2 Dashboard & Analytics

Accessible to **Admins only**, the Dashboard provides a real-time overview of the entire GAD database.

**Key Capabilities:**
- Total beneficiary record counts across all departments
- Department-by-department breakdown with record counts and charts
- Year-over-year comparison of GAD data
- Status distribution (Active, Pending, Inactive)
- Visual charts powered by Recharts for easy data reading during presentations

---

### 3.3 Department Management

The system manages all city departments that participate in GAD data collection.

**Key Capabilities:**
- Add, edit, and manage departments with name, code, color tag, and department head
- Activate or deactivate departments
- Each department has a dedicated page showing all its beneficiary records
- Department color tags are used throughout the system for quick visual identification
- Search and filter departments from the sidebar
- Departments are linked to users, records, upload logs, and file uploads

---

### 3.4 Beneficiary Records Management

The core data of the system — all GAD beneficiary records across all departments.

**Key Capabilities:**
- View all records across all departments (Admin) or per department
- Filter records by department, year, and status
- Search records by name or other fields
- Add individual records manually
- Edit and update existing records
- Soft-delete (mark inactive) to preserve data history
- Export records to Excel
- Records are associated with the department, year, and the user who uploaded them

---

### 3.5 File Upload & Upload History

Batch uploading of beneficiary records via Excel files — the most common data entry method for departments with many beneficiaries.

**Key Capabilities:**
- Upload Excel (.xlsx) files containing beneficiary data
- The system validates each row and reports errors, skipped entries, and successful insertions
- **Upload History** page shows a complete log of every upload ever performed:
  - Department and year covered
  - File name uploaded
  - Number of records inserted, skipped, and failed
  - Upload status (Success, Partial, Failed)
  - Who uploaded it and when
- Admins can review upload history to audit data entry and spot errors

---

### 3.6 Reports

Automated report generation from the live database — no manual computation needed.

**Key Capabilities:**
- Generate reports filtered by year, department, or status
- Visual charts and data tables for presentations and DILG compliance reporting
- Exportable report data for external use
- Reports reflect real-time database contents — always up to date

---

### 3.7 GAD Resources (File Library)

A centralized digital library for all official GAD files, references, memoranda, and downloadable materials.

**Key Capabilities:**
- Organized into **folders** with a hierarchical structure (folders within folders)
- Upload files of any type (PDF, Word, Excel, images, etc.)
- Download files directly from the system
- **Recycle Bin** — deleted files are moved to the recycle bin first; permanent deletion requires a second confirmation
- Restore accidentally deleted files from the recycle bin before permanent deletion
- Tracks who uploaded each file and when
- Download logging — records the name, organization, and contact of anyone who downloads a file (for accountability)

---

### 3.8 GAD Templates & Form Submission

The most comprehensive feature — allows encoders to complete official DILG GAD planning and accomplishment forms entirely online, without needing to manually fill out Excel templates.

**Supported Forms:**

| # | Form Name | Level | Type |
|---|-----------|-------|------|
| 1 | Annual GAD Plan and Budget (GPB) | Barangay | Planning |
| 2 | Annual GAD Accomplishment Report (AR) | Barangay | Accomplishment |
| 3 | Annual GAD Plan and Budget — Annex D | City/Municipality | Planning |
| 4 | GAD Accomplishment Report — Annex E | City/Municipality | Accomplishment |

**Form Features:**
- All official DILG column structures are replicated in the online form
- Column numbers match the printed DILG template (e.g., Column 1, 2, 3…) for easy cross-reference
- Sections: CLIENT-FOCUSED, ORGANIZATION-FOCUSED, ATTRIBUTED PROGRAMS
- Rows can be dynamically added and removed (delete button only appears when there is more than one row)
- Sub-totals and grand totals computed automatically as values are entered
- Signatory fields (Prepared by, Approved by)

**Submission Workflow:**
1. Encoder fills out the form
2. Clicks "Submit for Approval" — a confirmation dialog appears
3. Upon confirmation, the form is sent to the Admin review queue (status **Pending**)
4. Admin reviews and either **Approves** or **Returns** the submission with comments (comments are required when returning)
5. Encoder is notified of the decision in-app
6. If **Returned**, the encoder corrects the form and **resubmits** it (back to Pending) — submissions are never deleted
7. If **Approved**, the encoder can download the official DILG-formatted Excel file anytime

---

### 3.9 Submissions Review (Admin)

The admin-side counterpart of the Form Submission feature, presented as a focused **approvals inbox**.

**Admin landing (workspace chooser):**
- After logging in, the admin sees a **chooser screen** with two cards — **Dashboard** and **Form Submissions** (with a pending-count badge) — and picks where to go. The two areas are kept separate; the main Dashboard never mixes in form-submission content. A **"Back to Menu"** link switches workspaces.

**Layout inside Form Submissions:**
- **Focused sidebar:** when in this workspace the app sidebar shows only **All Submissions** plus a **searchable Department filter** (color-coded; a small orange dot marks departments still encoding; long lists are minimized with "Show all").
- **Status tabs:** To Approve, Approved by Budget/GAD, Returned with comments, All — each with a live count — plus a **Still Encoding** tab.
- **Submissions table** with columns: Encoder (avatar + name + department code), Submission (title + form type), Submitted date, Status (color pill), and Actions.

**Key Capabilities:**
- View all submissions from all encoders, filterable by **status** and **department**
- **Quick actions** on pending rows: **Approve** (one click, green) and **Return** (orange — opens a dialog where **comments are required**)
- **⋮ (three-dot) actions menu** per row keeps the table clean: **View**, **Download PDF**, **Download Excel**, and **Edit** (for returned)
- **Still Encoding tab:** shows, for the current cycle, **how many departments have not yet submitted**, with a progress bar and a per-department breakdown (encoding ones first)
- **Two download formats:** every submission can be downloaded as the official DILG **Excel (.xlsx)** or a matching **PDF (.pdf)** — same columns, colors, totals, and signatory layout
- **Comments & reviewer attachments:** on a submission's View page, the admin and encoder can exchange comments, each optionally with a **file attachment** (the reviewer's attachment)
- **Editing instead of deleting:** returned submissions are corrected and resubmitted rather than permanently deleted

---

### 3.10 Notification System

Keeps encoders informed of the status of their submissions in real time.

**How It Works:**
- When an admin **Approves** a submission → the encoder receives a notification: *"Your submission '[title]' has been approved."*
- When an admin **Returns** a submission → the encoder receives a notification: *"Your submission '[title]' was returned: '[comments]'"*
- When an admin **edits** or **comments** on a submission → the encoder is also notified
- An admin can view, at a glance, which departments are **still encoding** (have not yet submitted for the cycle) via the **Still Encoding** tab and the department sidebar

**Notification Panel (Bell Icon in Topbar):**
- Red badge shows the number of unread notifications
- Click the bell to open the notification panel
- Each notification shows:
  - Type icon (green check for approved, returned shows the admin's comments)
  - Title and message
  - Time elapsed (e.g., "5m ago", "2h ago", "Jun 1")
  - Blue dot indicator for unread notifications
- Click any notification → marks it as read and goes directly to the submission
- "Mark all read" button to clear all at once
- Paginated — loads 10 at a time with a "Load more" button
- Auto-refreshes every 10 seconds — no need to manually reload

---

### 3.11 User Management

Full user account management for the Admin.

**Key Capabilities:**
- Create new user accounts (name, email, password, role, department)
- Edit user details and reset passwords
- **A department is required for every Encoder** — so their submissions always route to the correct department (only Admins may be left without one). The form enforces this on both create and edit.
- Assign each user to their department for proper identification on submissions
- Assign roles: **Admin** or **Encoder**
- Activate or deactivate accounts (deactivated users cannot log in)
- Delete accounts (data submitted by the user is preserved)
- View all users in a table with department, role, and active status
- Sidebar footer shows the logged-in user's name and department for instant identification

---

## 4. User Roles

The system has two roles with distinct access levels:

### Encoder
- Can log in and access only encoder-specific features
- Can fill out and submit GAD template forms
- Can track and view their own submissions only (each card expands to a **progress stepper** showing where the form is in its lifecycle)
- Can download an approved submission as **Excel or PDF**
- Can **edit and resubmit** their own **returned** submissions, and reply with comments/attachments
- **Must be assigned a department** (their submissions route to that department)
- Cannot access admin features (Dashboard, Records, Departments, Users, etc.)
- Sees their **department name** displayed in the sidebar

### Admin
- Full access to all system features
- Can manage all departments, records, uploads, resources, and users
- Can review, approve, return (with comments), and edit all encoder submissions
- Can download any submission as **Excel or PDF**, attach files, and monitor which departments are still encoding
- Lands on a **workspace chooser** (Dashboard vs Form Submissions) after login
- Can assign departments to user accounts
- Cannot access the GAD Templates page (for encoders only)
- Sees all submissions from all encoders across all departments

---

## 5. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript | User interface |
| Styling | Tailwind CSS | Design and layout |
| State Management | TanStack React Query v5 | API data fetching and caching |
| Routing | React Router v7 | Page navigation |
| Backend | Node.js + Express | API server |
| Database | PostgreSQL | Data storage |
| ORM | Prisma | Database access and migrations |
| Authentication | JWT + bcrypt | Secure login |
| Excel Generation | ExcelJS / SheetJS | Excel file creation |
| PDF Generation | pdfmake | DILG-formatted PDF export (mirrors the Excel) |
| File Storage | Cloudflare R2 (S3) | Uploads & reviewer attachments |
| Hosting | VPS (Linux) + Nginx | Server and reverse proxy |
| Deployment | Vercel (frontend) + VPS (backend) | Live production environment |

---

## 6. Why Annual IT Maintenance is Required

### 6.1 Security Updates

Technology evolves constantly. The libraries and frameworks used in this system receive **regular security patches** from their developers. Without applying these updates:

- **Known vulnerabilities** in outdated packages can be exploited by attackers
- Database credentials, user data, and confidential GAD records could be exposed
- The login system could be bypassed if authentication libraries are not kept current
- Government data breaches can result in legal liability under the **Data Privacy Act of 2012 (RA 10173)**

> **Example:** A widely-used library like React, Node.js, or Prisma may release a critical security patch. If the system is not updated, it remains exposed to that vulnerability indefinitely.

---

### 6.2 Dependency Updates and Compatibility

The system depends on dozens of third-party libraries. Over time:

- Older versions reach **end-of-life** (no longer supported by their developers)
- New versions of Node.js and PostgreSQL may introduce breaking changes
- The server's operating system (Linux) requires regular kernel and package updates
- Browsers update their security policies — outdated code may stop working correctly

Annual maintenance ensures all components remain compatible and supported.

---

### 6.3 Database Maintenance

The PostgreSQL database requires regular care:

- **Data backups** must be verified and tested (a backup that was never tested may be corrupt)
- **Database vacuuming** — PostgreSQL accumulates dead rows over time that slow down queries
- **Index optimization** — as data grows, query performance degrades without index tuning
- **Storage monitoring** — the VPS server has limited disk space; old logs and files must be managed
- Annual review of data that can be **archived** to keep the active database lean and fast

---

### 6.4 Annual Data Reset and Configuration

The GAD system is year-based — every year, the system needs to be prepared for the new fiscal year:

- **Calendar Year (CY) and Fiscal Year (FY)** defaults need to be updated in templates
- Prior year's data must be archived or marked appropriately
- New departments or department name changes from the Sanggunian must be reflected
- New user accounts must be created for new encoders; old accounts deactivated
- Upload templates may need adjustments if DILG updates the official Excel format

---

### 6.5 Feature Updates and DILG Compliance

The DILG periodically updates official GAD forms, annexes, and reporting requirements. The system must be updated to reflect:

- New official form formats (column changes, new required fields)
- New DILG memoranda or circulars affecting GAD reporting
- Additional form types that may be mandated in future years
- Changes in the PCW (Philippine Commission on Women) reporting guidelines

Without maintenance, the system may generate forms that are **no longer compliant** with the latest DILG standards.

---

### 6.6 Performance Monitoring and Optimization

As more data is entered year after year, the system load increases:

- More beneficiary records = slower queries if indexes are not optimized
- More file uploads = increased storage consumption on the VPS
- More users = increased server load
- Annual performance review ensures the system remains fast and responsive

---

### 6.7 Bug Fixes and User Feedback

Day-to-day usage by encoders and admins will inevitably surface minor issues:

- Edge cases in form validation not caught during development
- Browser compatibility issues with new browser versions
- Minor UI/UX improvements based on actual user feedback
- Fixes to report calculation logic as more data types are encountered

Annual maintenance provides a scheduled window to address accumulated feedback.

---

### 6.8 Server and Domain Renewal

The system's live infrastructure requires annual renewal:

- **VPS server subscription** — the physical server that hosts the backend and database
- **Domain name renewal** — the web address used to access the system
- **SSL certificate** — ensures the system connection is encrypted (HTTPS); expires annually if not renewed
- Failure to renew any of these means the system becomes **inaccessible** to all users

---

## 7. Proposed Annual Maintenance Activities

| Activity | Frequency | Purpose |
|----------|-----------|---------|
| Security patch and dependency updates | Annual (or sooner if critical) | Prevent vulnerabilities |
| Database backup verification and cleanup | Annual | Data integrity and recovery |
| Database performance optimization (vacuum, reindex) | Annual | Query speed |
| New fiscal year configuration (year defaults, templates) | Every January | Operational readiness |
| DILG form compliance review and updates | Annual | Regulatory compliance |
| New user accounts setup, old accounts deactivation | Annual | Access control hygiene |
| VPS server and SSL certificate renewal | Annual | System availability |
| Domain name renewal | Annual | System accessibility |
| Storage audit and archive of old files | Annual | Disk space management |
| Bug fixes from accumulated user feedback | Annual | User experience |
| Feature additions based on new requirements | Annual | System improvement |
| Full system documentation update | Annual | Institutional knowledge |

---

## 8. Risks of No Maintenance

Neglecting annual IT maintenance poses the following risks to the City Government:

| Risk | Likelihood | Impact |
|------|-----------|--------|
| Data breach due to unpatched security vulnerability | Medium → High over time | Confidential beneficiary data exposed; legal liability |
| System downtime due to expired SSL or domain | High (annual expiry) | System inaccessible to all users |
| Database corruption or data loss without verified backups | Medium | Permanent loss of years of GAD records |
| Non-compliant GAD forms if DILG updates templates | High (DILG updates annually) | Rejected submissions during DILG audit |
| System crash due to incompatible software dependencies | Medium | Full system failure |
| Performance degradation as data grows without optimization | High | Slow, unusable system |
| Security audit failure during COA inspection | Medium | Administrative liability |

---

## 9. Conclusion

The **GAD Database System** is a significant digital investment for the City Government of Tanauan, Batangas. It replaces years of manual, paper-based, and spreadsheet-based GAD operations with a unified, secure, and efficient digital platform that serves all departments.

Like all information technology systems, it requires **regular maintenance** to remain secure, compliant, performant, and aligned with the evolving requirements of the DILG, PCW, and the city's own organizational needs.

Annual IT maintenance is not an optional expense — it is a **mandatory requirement** to protect the integrity of government data, ensure the continuity of GAD operations, and safeguard the City Government's compliance with national regulations including the **Data Privacy Act of 2012**, the **Magna Carta of Women (RA 9710)**, and DILG GAD reporting mandates.

The cost of maintenance is significantly lower than the cost of data loss, system failure, or regulatory non-compliance.

---

*This document was prepared to support the budget proposal and justification for the continued operation and maintenance of the GAD Database System of the City Government of Tanauan, Batangas.*

*For technical inquiries, contact the GAD Information Technology Unit.*

---

**Document Version:** 1.0
**Date Prepared:** June 2026
**System Version:** GAD Database v1.0
