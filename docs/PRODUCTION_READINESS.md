# Vyorai (IWMS) — Production Readiness & Deployment Verification

This document evaluates the runtime readiness, caching architecture, database configuration, security posture, PWA behavior, and automated smoke test procedures for Vyorai.

---

## 1. Environment & Configuration Verification

| Variable | Environment | Required | Validation Rule |
|---|---|---|---|
| `JWT_SECRET` | Production | Yes (Fatal if missing) | Minimum 32 characters, cryptographically random, no default placeholders. |
| `MONGODB_URI` | Production | Yes (Fatal if missing) | Valid MongoDB connection string (`mongodb://` or `mongodb+srv://`). |
| `STORAGE_ADAPTER` | Production | Yes | Must be `"r2"`, `"s3"`, or `"local"`. In multi-instance serverless deployments, `"r2"` or `"s3"` is mandatory. |
| `R2_ACCOUNT_ID` / `R2_ENDPOINT` | Production (R2) | Yes | Valid Cloudflare account ID or endpoint. |
| `R2_ACCESS_KEY_ID` | Production (R2) | Yes | S3-compatible Access Key. |
| `R2_SECRET_ACCESS_KEY` | Production (R2) | Yes | S3-compatible Secret Access Key. |
| `R2_BUCKET_NAME` | Production (R2) | Yes | Target storage bucket. |
| `UPSTASH_REDIS_REST_URL` / `vyorai_KV_REST_API_URL` | Production | Optional (Recommended) | Upstash Redis REST URL. Graceful fallback to MongoDB if absent. |
| `UPSTASH_REDIS_REST_TOKEN` / `vyorai_KV_REST_API_TOKEN` | Production | Optional (Recommended) | Upstash Redis REST Token. |
| `CRON_SECRET` | Production | Yes | Secret token for authorized invocation of `/api/cron/cleanup-expired-images`. |

---

## 2. PWA Lifecycle & Cache Resilience

- **Service Worker (`public/sw.js`):**
  - All `/api/` and `/_next/data/` paths bypass the service worker cache entirely (Pass-through to network).
  - Navigation requests use Network-First strategy to ensure authentication state and active sessions are always fresh.
  - Offline fallback page (`/offline.html`) is served if the user is disconnected from the internet.
  - Static hashed build assets in `/_next/static/` are safely cached with Cache-First strategy.
- **Manifest (`public/manifest.json`):**
  - Validated icons, theme color (`#0B1F3A`), background color (`#F5F8FF`), and standalone display mode.

---

## 3. Database & Caching Architecture

- **Connection Management:**
  - MongoDB connection pooling configured with `maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000`.
  - Global DNS overrides removed, relying on standard host/cloud platform DNS resolution.
- **Cache Invalidation:**
  - `invalidateKpiCache()` triggers on task status changes, intern activations, and task completions.
  - `invalidateProjectsCache(projectId)` purges cached project details and project listing sets upon mutations.
  - Safe degradation: If Redis is unavailable or times out, all endpoints automatically fallback to MongoDB queries without throwing unhandled exceptions.

---

## 4. Automated Verification Results

- **TypeScript Typecheck:** Passed (`npx tsc --noEmit` exited with code 0).
- **ESLint Quality Check:** Passed (0 errors, warnings checked).
- **Vitest Unit & Integration Suite:** 13 test files passed, 78/78 tests passed.
- **Next.js Production Build:** Completed successfully with Turbopack (28 static and dynamic routes compiled).
- **Dependency Audit:** High-severity SheetJS advisory mitigated via strict formula/HTML parsing barriers and payload bounds.

---

## 5. Production Smoke Test Checklist

Before opening traffic to production users, perform the following verification steps:

1. **Health Check:** `curl -f https://<domain>/api/health` returns `{ "database": true, "redis": true }`.
2. **Login & Session:** Log in as an administrator; verify that `iwms_session` cookie is set with `HttpOnly`, `SameSite=Lax`, and `Secure` (over HTTPS).
3. **Deactivation Check:** In an administrative session, toggle an intern to inactive; verify that the intern's active API requests immediately return `403 Forbidden` and force logout.
4. **File Download IDOR Check:** Attempt to download an attachment using another intern's account; verify that the response is `403 Forbidden`.
5. **Spreadsheet Ingestion:** Upload an intern template XLSX with valid and invalid rows; verify that previews display correct validation errors and do not crash the runtime.
6. **Cron Cleanup:** Trigger `/api/cron/cleanup-expired-images` with `Authorization: Bearer <CRON_SECRET>`; verify expired images older than 24 hours are pruned.
