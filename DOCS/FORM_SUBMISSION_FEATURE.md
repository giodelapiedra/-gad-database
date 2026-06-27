# GAD Form Submission Feature
**City Government of Tanauan, Batangas — GAD Database System**

---

## Overview

The Form Submission feature allows department encoders to fill out official DILG GAD forms online and submit them directly to the GAD admin for review and approval. This eliminates the need for manual paper forms and provides a complete digital workflow from data entry to approval.

---

## Who Uses This Feature

| Role | What They Can Do |
|------|-----------------|
| **Encoder** | Fill out GAD forms, submit for approval, track status, correct & resubmit returned forms, download approved forms |
| **Admin** | Review submissions, approve or return with comments, edit submitted forms, attach files, monitor which departments are still encoding |

---

## Part 1 — For Encoders

### Step 1: Open a GAD Template

The encoder navigates to **GAD Templates** from the sidebar. Four official DILG GAD forms are available:

1. **Barangay Annual GAD Plan and Budget (GPB)** — Annex for barangay-level planning
2. **Barangay Annual GAD Accomplishment Report (AR)** — Barangay accomplishment reporting
3. **Annual GAD Plan and Budget — City/Municipality (Annex D)** — City-level GPB
4. **GAD Accomplishment Report — City/Municipality (Annex E)** — City-level AR

Each template card shows the form type, level (Barangay or City), and the official annex reference.

---

### Step 2: Fill the Form Online

After selecting a template, the encoder fills out the form directly in the browser. The form includes:

- **Header Information** — Region, Province, City/Municipality, Calendar Year, Budget figures
- **CLIENT-FOCUSED Programs** — PPAs (Programs, Projects, Activities) that directly benefit women and men clients
- **ORGANIZATION-FOCUSED Programs** — PPAs that strengthen the GAD mandate within the organization
- **ATTRIBUTED PROGRAMS** — Programs with GAD components scored using the HGDG tool
- **Signatories** — Prepared by and Approved by fields

The form automatically computes sub-totals and grand totals in real time as the encoder types in budget figures.

> **Note:** Rows can be added at any time using the "+ Add Row" button. The delete button on each row only appears when there is more than one row, preventing accidental removal of the only entry.

---

### Step 3: Submit for Approval

Once the form is complete, the encoder clicks **"Submit for Approval"** at the top or bottom of the form.

A confirmation dialog appears asking:

> *"Submit for Approval? Once submitted, your form will be sent to the admin for review. Make sure all fields are filled in correctly before proceeding."*

The encoder can either:
- **Go Back and Check** — returns to the form to review entries
- **Yes, Submit** — sends the form to the admin review queue

After submission, the encoder is returned to the Templates page and the submission is logged.

> **Important:** While a submission is **Pending**, it cannot be edited. If the admin **returns** it with comments, the encoder can edit and resubmit it.

---

### Step 4: Track Submission Status

The encoder can monitor all their submissions under **My Submissions** in the sidebar.

Each submission shows:
- The **form title** (auto-generated from the data, e.g., "Barangay Poblacion GPB CY2026")
- The **template type** (Barangay GPB, City AR, etc.)
- The **date submitted**
- The current **status badge**:
  - 🟡 **Pending** — Waiting for admin review
  - 🟢 **Approved** — The admin has approved the submission
  - 🟠 **Returned** — The admin has returned the submission with comments to correct

If returned, the admin's comments are displayed directly on the submission card so the encoder knows what to correct.

**Progress stepper:** clicking a submission card expands it to reveal a visual **progress stepper** showing where the form is in its lifecycle:

- **Pending** — *Submitted* ✓ → *Under Review* (active) → *Decision* (upcoming)
- **Approved** — *Submitted* ✓ → *Reviewed* ✓ → *Approved* ✓
- **Returned** — *Submitted* ✓ → *Reviewed* ✓ → *Returned* ↩ (with a prompt to Edit & Resubmit)

**Stat cards** at the top of the page show a summary: Total, Pending, Approved, and Returned counts.

---

### Downloading the Approved File (Excel or PDF)

Once a submission is **Approved**, the encoder can download it in two formats from the submission's **View** page:

- **Download Excel** — the official DILG-formatted spreadsheet (.xlsx)
- **Download PDF** — the same official DILG layout rendered as a PDF (.pdf): identical columns and column numbers, black headers, olive section bands, yellow grand total, and blue signatory block — landscape A4, ready for printing or filing

Both are generated server-side from the submitted data, so the PDF matches the Excel format exactly.

---

### Correcting a Returned Submission

Returned submissions are **never deleted**. Instead, when a submission is **Returned**, an **"Edit & Resubmit"** button appears. The encoder reopens the form (prefilled with their original data), corrects it based on the admin's comments, and resubmits — which sends it back to the admin review queue as **Pending**. The full comment history stays attached to the submission.

---

## Part 2 — For Admins

### Admin Landing — Choose Your Workspace

When an admin logs in, they land on a **chooser screen** with two cards:

- **📊 Dashboard** — beneficiary records, file uploads, reports, and analytics
- **📄 Form Submissions** — review, approve, and return GAD form submissions (shows a **pending count** badge)

Picking one enters that workspace. The two areas are kept separate — the main Dashboard never mixes in form-submission content. A **"Back to Menu"** link in the sidebar returns to the chooser to switch workspaces.

### Submissions Review Page

Inside the **Form Submissions** workspace, the sidebar is focused — it shows only **All Submissions** plus a searchable **Department** filter (color-coded, with an orange dot marking departments still encoding). The list itself is a clean table.

**Status tabs** organize the submissions:

- **To Approve** — Submissions awaiting review (default)
- **Approved by Budget/GAD** — Already approved submissions
- **Returned with comments** — Submissions sent back for correction
- **All** — Complete list
- **Still Encoding** — a dedicated tab showing, for the current cycle, **how many departments have not yet submitted** (with a progress bar and a per-department breakdown — encoding ones surfaced first)

Each table row shows the **encoder** (avatar + department code), the **submission** (title + form type), the **submitted date**, and a **status pill**.

**Row actions** live in a **⋮ (three-dot) menu** to keep the table clean — **View**, **Download PDF**, **Download Excel**, and **Edit** (for returned). Pending rows additionally show quick **Approve** and **Return** buttons.

---

### Reviewing a Submission

For each **Pending** submission, the admin acts directly from the row:

**Approve**
- Clicks the quick **"Approve"** (green button) — one click, no dialog
- The submission status changes to Approved
- The encoder is automatically notified

**Return**
- Clicks **"Return"** (orange button)
- **Comments are required** — the form will not submit without a note for the encoder
- The submission status changes to Returned and the comment is saved to the thread
- The encoder is automatically notified with the comment

**Comments & reviewer attachments**
- On the submission's **View** page, both the admin and the encoder can post comments back and forth
- Each comment may include a **file attachment** (the reviewer's attachment) — e.g. a marked-up reference or supporting document

---

### Editing a Returned Submission

Returned submissions are **not deleted**. Admins can click **"Edit"** on a returned submission to open the form prefilled and correct the data directly, then save the changes. The encoder is notified of the edit. This replaces the old permanent-delete behavior so no work is ever lost.

---

## Part 3 — Notification System

### Real-Time Notifications for Encoders

Whenever an admin approves, returns, edits, or comments on a submission, the encoder receives an **in-app notification** automatically.

The notification bell icon in the top navigation bar shows a **red badge** with the number of unread notifications.

Clicking the bell opens a notification panel showing:

- 🟢 **Approved** notifications — with a green check icon
- 🟠 **Returned** notifications — with the admin's comment
- The submission title and the admin's comment (for returns)
- A **time ago** indicator (e.g., "2m ago", "3h ago", "Jun 1")
- A **blue dot** on unread notifications

### Notification Actions

- **Click a notification** — marks it as read and navigates directly to the related submission
- **"Mark all read"** — marks all notifications as read at once
- **"Load more"** — loads older notifications (10 per page, paginated)
- Notifications auto-refresh every 10 seconds

---

## Summary of the Complete Workflow

```
Encoder fills out GAD form online
        ↓
Clicks "Submit for Approval"
        ↓
Confirmation dialog → confirms submission
        ↓
Submission enters Admin review queue (Pending)
        ↓
Admin reviews → Approve  or  Return (with comments)
        ↓
     ┌──────────────────────────┐
     │                          │
  APPROVED                  RETURNED
     │                          │
Encoder notified ✓     Encoder notified ↩
     │                    (with comments)
Download Excel / PDF    Edit & Resubmit
  available                → back to Pending
```

---

## Technical Notes

- All form data is saved in the database (PostgreSQL) in structured JSON format
- A submission can be downloaded as the official **Excel (.xlsx)** or a matching **PDF (.pdf)**, both generated server-side from the same data — the PDF mirrors the Excel layout (columns, colors, totals, signatory)
- The system supports all 4 official DILG GAD form types
- Column numbers in the online form match the official printed DILG templates (1), (2), (3)…
- Sub-totals and grand totals are computed automatically
- Every submission is tied to the **encoder's department** (a department is required for encoders), so submissions route to and filter by the correct department
- **Comments and reviewer attachments** are stored per submission; attachment files are uploaded to object storage (Cloudflare R2)
- Pending counts, notifications, and the encoding status refresh automatically (~10s)

---

## Change Log (Form Submission feature)

Recent enhancements to this feature:

- **Terminology:** "Rejected" replaced with **"Returned"** throughout
- **Edit instead of delete:** returned submissions are corrected & resubmitted; nothing is permanently deleted
- **Comments & reviewer attachments** thread on each submission
- **Department routing & filtering**, with a **Still Encoding** tab and progress view
- **Admin workspace chooser** + focused Form Submissions sidebar
- **Progress stepper** on the encoder's submission cards
- **PDF download** matching the official DILG Excel format
- **⋮ three-dot actions menu** (View / Download PDF / Download Excel / Edit)

---

*GAD Database System — City Government of Tanauan, Batangas © 2026*
