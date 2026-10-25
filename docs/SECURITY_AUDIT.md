# Vyorai (IWMS) — Application Security Audit

**System:** Vyorai — Intern Workflow Management System  
**Repository:** `Tanay-Agrawal18/AVTechnologies`  
**Branch:** `hardening/security-reliability-uiux`  
**Date:** October 2026  
**Auditor:** Senior Application Security & Systems Engineering Assessment  

---

## Executive Summary

A comprehensive application security audit of the Vyorai IWMS platform was conducted across all authentication, session handling, file upload/download pipelines, authorization models, spreadsheet import/export mechanisms, caching layers, and external integration surfaces.

The audit identified critical and high vulnerabilities in production JWT signing secret fallbacks, unauthenticated and unverified attachment downloads, CSV formula injection risks, and unconstrained import processing limits. All confirmed issues were reproduced, remediated on the dedicated feature branch, and verified with dedicated regression test suites.

---

## Detailed Findings and Remediation

### Finding SEC-01: Predictable Hardcoded JWT Signing Secret Fallback
- **Severity:** Critical (P0)
- **Affected Files:** `src/lib/auth.ts`, `src/middleware.ts`
- **Root Cause:** In the initial code, if `process.env.JWT_SECRET` was absent or empty in production, the application silently fell back to a hardcoded string (`"default_super_secret_minimum_32_characters_key_2026"`).
- **Realistic Impact:** An attacker knowing or discovering this default could forge arbitrary JWT tokens with `{ role: "admin", status: "active" }`, completely bypassing authentication and administrative controls.
- **Remediation:** Created `src/lib/jwtConfig.ts` with strict validation. In production (`NODE_ENV === "production"`), the application fails closed immediately at startup if `JWT_SECRET` is unset, shorter than 32 characters, or contains insecure default placeholder values. Refactored both `auth.ts` and `middleware.ts` to source the identical, validated `JWT_SECRET_KEY` and `SESSION_COOKIE_NAME`.
- **Status:** REMEDIATED & VERIFIED.

---

### Finding SEC-02: Silent Database Authorization Pass-Through & Stale Role Elevation
- **Severity:** High (P0)
- **Affected Files:** `src/lib/apiAuth.ts`, `src/app/api/auth/me/route.ts`
- **Root Cause:** In `requireAuth()`, when database lookups failed or raised connection exceptions, the function caught the error with a comment `// Continue or let error bubble if database is unreachable`, silently granting access based on the unverified client JWT. Additionally, if an admin changed a user's role in the DB, the token's stale role was used rather than the database role.
- **Realistic Impact:** Deactivated interns or demoted users whose sessions had not yet expired retained full API access during database transient errors.
- **Remediation:** 
  1. Updated `requireAuth()` to fail closed in production upon database errors (`503 AUTH_CHECK_FAILED`).
  2. Synced live role from `dbUser.role` rather than relying solely on the JWT payload.
  3. Updated `/api/auth/me` to fail closed in production (`503 Service Unavailable`) instead of returning stale unverified credentials.
- **Status:** REMEDIATED & VERIFIED.

---

### Finding SEC-03: Inadequate File Upload Validation & MIME-Only Trust
- **Severity:** High (P0)
- **Affected Files:** `src/app/api/files/upload/route.ts`, `src/lib/fileValidation.ts`
- **Root Cause:** Upload validation checked user-submitted `file.type` or basic regex extension matching (`/\.(pdf|zip|...)$/i`). MIME types sent in `multipart/form-data` are completely user-controlled and easily forged.
- **Realistic Impact:** Attackers could upload malicious scripts, web shells, or executable payloads disguised with acceptable MIME types (`application/pdf`) or spoofed headers.
- **Remediation:** Implemented `src/lib/fileValidation.ts` which performs holistic validation:
  1. Sanitizes filename, removing path traversal sequences (`../`, null bytes, control chars).
  2. Enforces allowed extension whitelist (`.pdf`, `.zip`, `.png`, `.jpg`, `.docx`, `.xlsx`, `.txt`).
  3. Validates file header binary magic numbers (e.g. `%PDF`, `PK\x03\x04`, `\x89PNG`, JPEG SOI).
  4. Scans `.txt` files for null bytes / binary headers.
  5. Enforces strict 10MB limits prior to buffer operations.
- **Status:** REMEDIATED & VERIFIED.

---

### Finding SEC-04: Unauthorized / IDOR File Download & Unverified Attachment Access
- **Severity:** High (P0)
- **Affected Files:** `src/app/api/files/[fileKey]/route.ts`
- **Root Cause:** The endpoint retrieved files directly if the storage adapter found them. If a file was not part of a submission, or if an attacker guessed or discovered an orphaned fileKey, it was returned without verifying that the file was registered to a legitimate task submission.
- **Realistic Impact:** An intern could enumerate fileKeys and access files from other interns or unlinked system files.
- **Remediation:**
  1. Required strict metadata verification: `Submission.findOne({ "attachments.fileKey": fileKey })`. Orphaned or unlinked keys are rejected with 404.
  2. Server-side intern ownership enforcement: `submission.internId.toString() === auth.user.id`. Other interns receive a 403 Forbidden.
  3. Sanitize `fileKey` to reject path traversal characters (`..`, `/`, `\`).
  4. Added secure download headers: `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment; filename="safeName"`, and `Cache-Control: private, no-cache, no-store, must-revalidate`.
- **Status:** REMEDIATED & VERIFIED.

---

### Finding SEC-05: CSV Formula Injection (DDE / Spreadsheet Macro Injection)
- **Severity:** Medium (P1)
- **Affected Files:** `src/services/reportService.ts`
- **Root Cause:** Exporting tasks to CSV directly formatted user-controlled titles, descriptions, and intern names into spreadsheet cells without escaping leading formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`).
- **Realistic Impact:** When an administrator opens an exported CSV in Microsoft Excel or LibreOffice Calc, malicious payloads starting with `=cmd|...` or `@SUM(...)` could execute arbitrary commands or leak data via external HTTP requests.
- **Remediation:** Implemented `sanitizeFormulaCell()` in `ReportService` that prefixes any cell beginning with formula triggers with a single quote (`'`), neutralizing automatic formula execution in spreadsheet software.
- **Status:** REMEDIATED & VERIFIED.

---

### Finding SEC-06: Unbounded Import File and Row Processing
- **Severity:** Medium (P1)
- **Affected Files:** `src/services/importService.ts`, `src/app/api/admin/import/route.ts`
- **Root Cause:** The CSV and XLSX parsing functions had no strict upper bounds on file size or row counts, potentially allowing a malicious administrator or compromised admin account to cause a memory-exhaustion Denial of Service (DoS) via gigabyte-sized spreadsheets or "billion laughs" XML entity expansion.
- **Realistic Impact:** Server worker crash, high CPU, or event-loop starvation.
- **Remediation:**
  1. Enforced `MAX_IMPORT_BYTES = 5MB`.
  2. Enforced `MAX_IMPORT_ROWS = 500`.
  3. Configured XLSX parser with `cellFormula: false` and `cellHTML: false` to disable formula evaluation during ingestion.
  4. Provided clear, structured per-row validation feedback.
- **Status:** REMEDIATED & VERIFIED.

---

### Finding SEC-07: Unnecessary Hardcoded Global DNS Overrides
- **Severity:** Low (P2)
- **Affected Files:** `src/lib/db.ts`
- **Root Cause:** `dns.setServers(["8.8.8.8", "1.1.1.1"])` was unconditionally executed during module load and inside `connectDB()`.
- **Realistic Impact:** Overrode host platform DNS (such as Kubernetes CoreDNS, AWS Route 53 VPC resolvers, or enterprise internal DNS), potentially breaking connection to private MongoDB endpoints or intranet services.
- **Remediation:** Removed hardcoded calls. Defaulted to native platform DNS resolution, providing an optional opt-in environment variable `DNS_SERVERS` for environments that specifically need custom DNS.
- **Status:** REMEDIATED & VERIFIED.

---

### Finding SEC-08: Dependency Vulnerability in `xlsx` (SheetJS)
- **Severity:** High (Advisory GHSA-4r6h-8v6p-xvw6 / GHSA-5pgg-2g8v-p4x9)
- **Affected Module:** `xlsx@0.18.5`
- **Impact:** Prototype pollution and ReDoS in legacy SheetJS library when parsing untrusted formulas/HTML.
- **Mitigation Applied:** Disabled formula and HTML parsing flags (`cellFormula: false`, `cellHTML: false`) in `XLSX.read()`, added strict 5MB and 500-row size guardrails, and sanitized export fields against formula injection.
- **Status:** MITIGATED VIA APPLICATION-LEVEL GUARDRAILS.
