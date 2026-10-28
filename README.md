# WWI Clienter — Enterprise Client Relationship & Project Management Platform

**Work Wizards Innovations Pvt Ltd (WWI)**  
A secure, unified corporate client relationship, contract tracking, invoicing, document sharing, and project delivery platform.

---

## 1. Product Identity & Design Architecture

WWI Clienter is designed with a premium, minimal, trustworthy corporate SaaS aesthetic:
- **Dominant Base:** Clean White (`#FFFFFF`)
- **Primary Typography & Emphasis:** Pitch Black (`#171717`)
- **Dividers & Structural Borders:** Neutral Gray (`#E5E5E5`)
- **Secondary Surfaces & Backgrounds:** Light Gray (`#F5F5F5`)
- **Selected Navigation:** Subtle Gray (`#EDEDED`)
- **Dark Elements & Accents:** Carbon Black (`#111111`)
- **Restrained Alerts:** Subtle Red/Amber for overdue invoices and system warnings.

---

## 2. Technology Stack

- **Frontend:** React 18, Vite, JavaScript (JSX only), Tailwind CSS, React Router v7, Lucide Icons, Recharts
- **Identity & Auth:** Firebase Authentication (Web SDK on client, Firebase Admin SDK on backend API)
- **Database:** Cloud Firestore with strict security rules (`firestore.rules`) and compound indexes (`firestore.indexes.json`)
- **Private Object Storage:** Cloudflare R2 (Private bucket `wwi-client-portal` via AWS SDK v3 `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`)
- **Serverless API:** Vercel Node.js Serverless Functions (`/api/*`)
- **PDF Invoicing:** Client-side vector PDF generation via `jspdf` and `jspdf-autotable`
- **Testing:** Vitest, React Testing Library, jsdom

---

## 3. Core Modules & Capabilities

### A. Executive Operations & Admin Dashboard (`/admin`)
- Real Firestore-backed operational metrics:
  - Active client organizations
  - Active software projects in development
  - Outstanding balances & overdue invoices in INR (`₹`)
  - Scheduled meetings in Asia/Kolkata timezone
  - Open technical support tickets & pending client approvals
- Realtime revenue distribution charts
- Built-in live Firestore seed generator (`/api/seed`) for demo and development validation

### B. Client Organization Directory (`/admin/clients`)
- Complete enterprise client directory with account identifiers (e.g. `WWI-ORG-APEX`)
- Primary contacts, official billing emails, GSTIN numbers, and physical office addresses
- Authorized user invitation workflow with secure temporary password/reset link generation
- Organization detail views with private WWI staff notes and account suspension controls

### C. Projects & Milestones Roadmap (`/admin/projects`, `/portal/projects`)
- Unique project codes (e.g. `PRJ-ERP-2026`)
- Milestone delivery checkpoints with planned vs actual completion dates
- Dynamic project completion calculation based on completed milestones
- Dual notes system: **Client-Visible Updates** vs **Private WWI Staff Notes** (never exposed to clients)

### D. Invoices & Billing Engine (`/admin/invoices`, `/portal/invoices`)
- Official GST Tax Invoices in Indian Rupees (`INR`)
- Unique invoice numbering (e.g. `WWI-INV-2026-001`)
- Line item editor (description, quantity, unit price, 18% GST calculation)
- Direct official vector PDF generation and download
- Wire/NEFT/RTGS payment instructions (HDFC Bank Ltd, IFSC, UPI)
- Client payment reference (UTR number) submission
- Staff payment recording and immutable invoice audit trail

### E. Cloudflare R2 Private Document Deliverables (`/admin/deliverables`, `/portal/deliverables`)
- Direct streaming to private bucket `wwi-client-portal` using server-authorized short-lived presigned PUT URLs
- Authenticated download streaming using short-lived presigned GET URLs
- Strict role and organization membership verification
- Internal-only files vs published client-visible deliverables
- 50MB file size limits and MIME-type validation

### F. Realtime Project Messaging & Chat (`/admin/messages`, `/portal/messages`)
- Channelized project-specific conversations
- Realtime Firestore updates with clean unmount listeners
- Strict organization boundary enforcement

### G. Support Tickets & Client Submissions (`/admin/support`, `/portal/support`, `/portal/submissions`)
- Support ticketing with unique IDs (`TCK-2026-xxx`)
- Conversation thread with client-visible replies and staff-only internal notes
- Structured client submission workflows for requirements, change requests, feedback, and UAT milestone acceptance sign-offs

---

## 4. Role-Based Access Control (RBAC)

1. `super_admin`: Full system access, staff provisioning, organization deletion, audit logs
2. `admin`: Client management, project provisioning, invoice issuance, deliverable publishing
3. `team_member`: Assigned project milestone updates, technical client chat, support replies
4. `client`: Strictly isolated to their own organization's projects, invoices, deliverables, and submissions

---

## 5. Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd client-portal-wwi
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the serverless secrets (Firebase Admin private key and Cloudflare R2 credentials).

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Automated Tests
```bash
npm run test
```

### 5. Build for Production
```bash
npm run build
```

---

## 6. One-Time Super Admin Bootstrap

To initialize the primary Super Administrator account:
1. Navigate to [http://localhost:3000/bootstrap](http://localhost:3000/bootstrap)
2. Enter your Name, official Admin Email, Master Password, and the `BOOTSTRAP_SECRET_KEY` configured in your `.env` (default: `wwi_super_secret_bootstrap_token_2026`)
3. Click **Initialize Super Administrator**
4. Sign in at `/login` with full executive privileges.
