# WWI Clienter — Deployment & Cloud Infrastructure Guide

This guide details deploying the WWI Clienter application to **Vercel** with **Firebase Authentication**, **Cloud Firestore**, and **Cloudflare R2**.

---

## 1. Cloudflare R2 Bucket Configuration

### A. Bucket Details
- **Bucket Name:** `wwi-client-portal`
- **Account ID:** `6c28b0e0827eba9ab14775371b708494`
- **S3 Endpoint:** `https://6c28b0e0827eba9ab14775371b708494.r2.cloudflarestorage.com`
- **Region:** `auto`

### B. Generate Replacement Bucket-Scoped API Tokens
To keep bucket credentials private and secure:
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** > **Manage R2 API Tokens**
3. Click **Create API Token**
4. Name the token: `wwi-clienter-production`
5. Permissions: Select **Object Read & Write**
6. Specific Bucket: Select `wwi-client-portal`
7. Click **Create API Token**
8. Copy the **Access Key ID** and **Secret Access Key**.
   Configure them in your production environment as:
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`

### C. Configure Cloudflare R2 Bucket CORS
In the Cloudflare dashboard under bucket `wwi-client-portal` > **Settings** > **CORS Policy**, add:
```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://*.vercel.app",
      "https://portal.workwizards.in"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "Authorization"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 2. Firebase Security Rules & Indexes Deployment

### A. Deploy Firestore Rules
From your terminal using the Firebase CLI:
```bash
npx firebase-tools deploy --only firestore:rules --project client-portal-9326
```

### B. Deploy Firestore Indexes
```bash
npx firebase-tools deploy --only firestore:indexes --project client-portal-9326
```

---

## 3. Vercel Deployment

### A. Deploy via Vercel CLI or Git Integration
1. Push your repository to GitHub / GitLab
2. Import the repository into your Vercel Dashboard
3. Framework Preset: **Vite**
4. Root Directory: `./`
5. Build Command: `npm run build`
6. Output Directory: `dist`

### B. Configure Vercel Environment Variables

#### Frontend Variables (Public to Browser):
- `VITE_FIREBASE_API_KEY`: `AIzaSyB25XH6sua_qkKNn_QNZP3u8uqc_xf8TWY`
- `VITE_FIREBASE_AUTH_DOMAIN`: `client-portal-9326.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID`: `client-portal-9326`
- `VITE_FIREBASE_STORAGE_BUCKET`: `client-portal-9326.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: `437012768834`
- `VITE_FIREBASE_APP_ID`: `1:437012768834:web:3fab63a88b0ff6705f25db`
- `VITE_FIREBASE_MEASUREMENT_ID`: `G-FS2D2YHWEE`
- `VITE_APP_TITLE`: `WWI Clienter`

#### Serverless Backend Variables (Encrypted Secrets — Never prefixed with VITE_):
- `FIREBASE_ADMIN_PROJECT_ID`: `client-portal-9326`
- `FIREBASE_ADMIN_CLIENT_EMAIL`: `firebase-adminsdk-xxxxx@client-portal-9326.iam.gserviceaccount.com`
- `FIREBASE_ADMIN_PRIVATE_KEY`: `"-----BEGIN PRIVATE KEY-----\nMIIE...-----END PRIVATE KEY-----\n"`
- `R2_ACCOUNT_ID`: `6c28b0e0827eba9ab14775371b708494`
- `R2_BUCKET_NAME`: `wwi-client-portal`
- `R2_ENDPOINT`: `https://6c28b0e0827eba9ab14775371b708494.r2.cloudflarestorage.com`
- `R2_ACCESS_KEY_ID`: `<your-generated-r2-access-key-id>`
- `R2_SECRET_ACCESS_KEY`: `<your-generated-r2-secret-access-key>`
- `APP_BASE_URL`: `https://portal.workwizards.in` (or your Vercel URL)
- `BOOTSTRAP_SECRET_KEY`: `<your-secure-random-token>`
- `RESEND_API_KEY`: *(Optional for automated invitation email dispatch)*
- `INVITATION_FROM_EMAIL`: `"Work Wizards Innovations <portal@workwizards.in>"`

---

## 4. Production Smoke-Test Checklist

- [ ] Visit the application URL; verify typography, minimal corporate layout, and branding.
- [ ] Initialize Super Admin account at `/bootstrap`.
- [ ] Log in with Super Admin account at `/login`.
- [ ] Run sample seed data generator from Dashboard header (`/api/seed`) to verify Firestore read/write permissions.
- [ ] Create a client organization and invite a client user. Verify copyable temporary invitation link.
- [ ] Sign in with client user; verify client only has access to their own organization's records.
- [ ] Issue an invoice with 18% GST line items; verify tax calculations in INR and download official PDF.
- [ ] Test uploading a document deliverable to Cloudflare R2 bucket.
- [ ] Test downloading deliverable via signed URL.
- [ ] Test real-time messaging between client and admin in the project conversation channel.
- [ ] Request a consultation meeting; confirm from Admin dashboard with Google Meet link.
- [ ] Submit a support ticket and formal UAT sign-off from Client Portal; approve from Admin dashboard.
- [ ] Verify audit logs in `/admin/activity`.
