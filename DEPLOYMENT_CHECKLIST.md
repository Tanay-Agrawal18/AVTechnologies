# IWMS Production Deployment & Operations Guide

This guide covers real-world, zero-cost / free-tier deployment for the **Intern Workflow Management System (IWMS)** using **MongoDB Atlas Free Tier (M0)**, **Cloudflare R2 Free Allowance**, and an appropriate Next.js hosting solution.

---

## 1. Hosting Architecture & Platform Compatibility Assessment

### Comprehensive Technical Compatibility Matrix

| Runtime / Feature Area | Implementation in IWMS Codebase | Cloudflare Workers Compatibility | Standard Node.js Host (Vercel, Render, VPS) |
| :--- | :--- | :--- | :--- |
| **Next.js Version** | **Next.js 16.4.2** (Turbopack, React 19) | ❌ **Incompatible**: Cloudflare's `@cloudflare/next-on-pages` does not yet support Next.js 16. Cloudflare OpenNext is experimental for Next 16 and requires strict Edge runtime. | ✅ **Fully Compatible** out-of-the-box (`next build`, `next start`). |
| **Database Driver** | **Mongoose 9.11.3** / `mongodb` Node driver | ❌ **Incompatible**: Mongoose requires Node.js `net.Socket`, `tls`, and long-lived TCP/SSL connection pooling. Workers runs on V8 isolates without persistent Node TCP sockets. | ✅ **Fully Compatible**: Native Node.js TCP/TLS replica-set connection pooling. |
| **Authentication & Tokens** | `jose` (HS256) + `next/headers` cookies | ✅ Compatible (Web Crypto standard). | ✅ Fully Compatible. |
| **Password Hashing** | `bcryptjs` (pure JS implementation) | ⚠️ Partial (slow on Edge CPU limits). | ✅ Fully Compatible. |
| **Object Storage** | Cloudflare R2 via `@aws-sdk/client-s3` | ✅ Compatible (S3 REST calls). | ✅ Fully Compatible. |
| **Local Fallback Storage** | Node.js `fs/promises` & `path` | ❌ **Incompatible**: No local filesystem on Workers. | ✅ Fully Compatible (`./uploads` mount). |

### Conclusion on Cloudflare Workers

> [!CAUTION]
> **Cloudflare Workers / Pages is currently INCOMPATIBLE without rewriting core application layers.**
> **Blockers**:
> 1. **Next.js 16.4.2**: Official Cloudflare Next.js adapters (`@cloudflare/next-on-pages`) only support Next.js up to version 14. Next.js 16 with Turbopack and React 19 is not supported on Cloudflare Pages/Workers.
> 2. **Mongoose & MongoDB TCP Sockets**: MongoDB Atlas connections via Mongoose 9 require persistent Node.js TCP/TLS sockets (`net.Socket`). Cloudflare Workers operates on V8 isolate micro-runtimes that cannot maintain persistent MongoDB driver connection pools without switching to Prisma Accelerate, MongoDB Atlas Data API (deprecated by MongoDB), or Cloudflare TCP Socket polyfills that frequently break Mongoose connection events.
>
> **Recommended Compliant Alternatives (Zero App Code Rewrite)**:
> 1. **Vercel** (Pro for business operations, or Hobby strictly for personal non-commercial evaluation): Native Next.js 16 deployment with serverless Node.js runtime and complete Mongoose compatibility.
> 2. **Render Web Service (Free Tier) or Railway**: Native Node.js / Docker container running `npm run start`. Permits zero-cost deployment and respects Node.js runtime requirements.
> 3. **Self-Hosted VPS (Hetzner, DigitalOcean, Oracle Cloud Always-Free)**: Runs Next.js with complete Node.js socket, file system, and TCP pooling support.

---

## 2. Commercial-Use Compliance & Free-Tier Quotas

### Commercial Use Notice
* **Vercel Hobby Plan (Free)**: Limited strictly to personal, non-commercial use. If IWMS is used by an enterprise, startup, or business for operational intern management, upgrade to **Vercel Pro** ($20/seat/mo) or deploy onto **Render / Self-Hosted VPS**.
* **MongoDB Atlas M0**: Permitted for evaluation, low-scale operational tools, and production proof-of-concept.
* **Cloudflare R2**: Commercial use is explicitly permitted on free and pay-as-you-go tiers.

### Technical Free Limits
* **MongoDB Atlas M0**: 512 MB storage, shared RAM, 500 max connections.
* **Cloudflare R2**: 10 GB storage/month, 1M Class A operations (uploads/modifications), 10M Class B operations (reads/downloads), **$0 egress fees**.
* **Next.js Serverless Execution**: Max 10s–15s function timeouts on free serverless plans. Large file streams are piped asynchronously.

---

## 3. Environment Variables Reference

| Variable Name | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Execution mode | `production` |
| `MONGODB_URI` | **Yes** | Atlas connection URI (validated at startup) | `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/iwms?retryWrites=true&w=majority` |
| `JWT_SECRET` | **Yes** | Secret for session tokens (min 32 chars) | `openssl rand -base64 48` |
| `SESSION_EXPIRY_DAYS` | **Yes** | Cookie duration in days | `7` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Canonical domain for activation links | `https://your-app.vercel.app` |
| `INITIAL_ADMIN_EMAIL` | **Yes** | Admin email for initial bootstrap | `admin@company.com` |
| `INITIAL_ADMIN_PASSWORD` | **Yes** | Admin password for initial bootstrap | Random strong passphrase |
| `INITIAL_ADMIN_NAME` | Optional | Admin display name | `"System Administrator"` |
| `STORAGE_ADAPTER` | **Yes** | `local` for local dev, `r2` for production | `r2` |
| `R2_ACCOUNT_ID` | When `r2` | Cloudflare Account ID from dashboard | `32-character hex string` |
| `R2_ACCESS_KEY_ID` | When `r2` | R2 Token Access Key ID | `32-character hex token` |
| `R2_SECRET_ACCESS_KEY` | When `r2` | R2 Token Secret Access Key | `64-character hex secret` |
| `R2_BUCKET_NAME` | When `r2` | Private R2 bucket name | `iwms-submissions-private` |
| `LOCAL_STORAGE_DIR` | Optional | Local storage fallback path | `./uploads` |

---

## 4. Health Endpoint & Security Audit

* **Route**: `GET /api/health`
* **Access**: Public (unauthenticated, whitelisted in middleware)
* **Safety Audit**:
  * Executes a non-destructive database ping: `mongoose.connection.db.command({ ping: 1 })`.
  * Returns `200 OK` with `{ status: "healthy", database: "connected", timestamp: "..." }`.
  * Returns `503 Service Unavailable` with sanitized status `{ status: "unhealthy", database: "error", message: "Database ping failed" }`.
  * **Zero Credential / URI Leakage**: Connection URIs, database credentials, replica topology, cluster hosts, and internal stack traces are strictly scrubbed and never exposed in responses or server headers.

---

## 5. Cloudflare R2 Setup (Step-by-Step)

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **R2 Object Storage**.
2. Click **Create Bucket**:
   * Name: `iwms-submissions-private`.
   * **Keep Public Access OFF**. Never enable public URL or custom domains.
3. Click **Manage R2 API Tokens > Create API Token**:
   * Permissions: **Object Read & Write**.
   * Bucket: `iwms-submissions-private`.
   * Click **Create API Token**.
4. Note credentials:
   * **Account ID** (found on R2 overview right sidebar)
   * **Access Key ID**
   * **Secret Access Key**

---

## 6. End-to-End Production Smoke-Test Protocol

Execute this protocol immediately following production deployment to verify the entire system:

### 1. Database Health & Core Connectivity
* Open `https://<your-app-domain>/api/health` in your browser.
* [ ] Verify HTTP 200 with `{ status: "healthy", database: "connected" }`.
* [ ] Confirm no connection strings, cluster IDs, or database internal details appear in response headers or body.

### 2. Initial Admin Bootstrap
* Run one-time bootstrap against production database:
  ```bash
  MONGODB_URI="mongodb+srv://<user>:<pass>@cluster0.mongodb.net/iwms?retryWrites=true&w=majority" \
  INITIAL_ADMIN_EMAIL="admin@company.com" \
  INITIAL_ADMIN_PASSWORD="<strong-password>" \
  node scripts/bootstrap-admin.mjs
  ```
* [ ] Verify clean exit: "Admin user created successfully" or "Admin user already exists".

### 3. Admin Authentication & Role Boundary
* Navigate to `https://<your-app-domain>/login`.
* Sign in with the bootstrapped admin credentials.
* [ ] Verify successful redirection to `/admin/dashboard`.
* [ ] Verify that unauthenticated requests to `/admin/dashboard` redirect to `/login`.

### 4. Intern Creation & Activation
* Navigate to `/admin/interns` and click **Add Intern**.
* Fill out the intern profile (Name, Email, Intern ID, Department).
* [ ] Verify intern appears in directory with status `pending_setup`.
* [ ] Copy the generated one-time activation link (`/setup-password?token=...`).
* Open the link in a private/incognito browser window.
* [ ] Set a secure password and submit.
* [ ] Verify account activates (`active`) and redirects directly to `/intern/dashboard`.

### 5. Task Assignment & Workflow Lifecycle
* In Admin portal (`/admin/tasks`), create a new task:
  * Title: `Q1 Milestone Deliverable`
  * Assign to: Newly created intern.
* [ ] In Intern portal (`/intern/tasks`), confirm task appears under `assigned` status.
* [ ] Click task details (`/intern/tasks/[id]`) and click **Start Task** (status transitions to `in_progress`).

### 6. Deliverable Upload & Private Cloudflare R2 Storage
* In the intern task details view, upload a deliverable file (e.g. PDF or PNG < 10 MB).
* [ ] Verify upload completes successfully via `POST /api/files/upload`.
* [ ] Submit task for review (status transitions to `submitted`).
* [ ] Log into Cloudflare R2 Dashboard: confirm object exists in `iwms-submissions-private` under a randomized cryptographic key (e.g. `1740000000-a1b2c3...pdf`).
* [ ] Confirm public access is disabled on the bucket.

### 7. File Download Authorization & Cross-Intern Security Denial
* In the intern portal, click to download the uploaded deliverable attachment:
  * [ ] Verify file streams directly from `GET /api/files/[fileKey]` with correct MIME type and filename.
* Log into or register a **second intern account (Intern B)**:
  * [ ] Attempt to access the same file URL `https://<your-app-domain>/api/files/[fileKey]`.
  * [ ] **Verify HTTP 403 Forbidden**: "Access denied: You do not have permission to view this file".
* In the Admin portal (`/admin/tasks/[id]`):
  * [ ] Click the deliverable link: verify Admin can download and view the submission attachment.

### 8. Admin Review & Final Approval
* From the Admin review modal, enter feedback and select **Approve**.
* [ ] Verify task transitions to `approved`.
* [ ] Verify intern history reflects task completion and score updates.
