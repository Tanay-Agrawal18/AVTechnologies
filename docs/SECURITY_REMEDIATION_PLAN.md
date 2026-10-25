# Vyorai (IWMS) — Security Remediation Plan

This document outlines the systematic remediation plan implemented to address all security vulnerabilities, authorization gaps, and resilience risks identified in the audit.

---

## Remediation Roadmap & Status

| ID | Finding | Target Milestone | Priority | Status | Verification Test |
|---|---|---|---|---|---|
| **SEC-01** | Predictable JWT Signing Secret Fallback | Phase 1 (Auth) | Critical (P0) | **REMEDIATED** | `tests/dbConfig.test.ts`, `src/lib/jwtConfig.ts` |
| **SEC-02** | Fail-Open on DB Auth Failure & Stale Role Checks | Phase 1 (Auth) | High (P0) | **REMEDIATED** | `tests/fileAuthAndValidation.test.ts` |
| **SEC-03** | Insecure File Upload Validation (MIME spoofing) | Phase 1 (Storage) | High (P0) | **REMEDIATED** | `tests/fileAuthAndValidation.test.ts` |
| **SEC-04** | File Key IDOR & Orphaned Attachment Exposure | Phase 1 (Storage) | High (P0) | **REMEDIATED** | `tests/fileAuthAndValidation.test.ts` |
| **SEC-05** | CSV Formula Injection (DDE injection) | Phase 1 (Data) | Medium (P1) | **REMEDIATED** | `tests/fileAuthAndValidation.test.ts`, `reportService.ts` |
| **SEC-06** | Unbounded Spreadsheet Import Ingestion | Phase 1 (Import) | Medium (P1) | **REMEDIATED** | `tests/validation.test.ts`, `importService.ts` |
| **SEC-07** | Hardcoded Platform DNS Overrides | Phase 2 (Runtime) | Low (P2) | **REMEDIATED** | `src/lib/db.ts` |
| **SEC-08** | `xlsx` Dependency Vulnerability Mitigations | Phase 1 (Deps) | High (P0) | **MITIGATED** | `src/services/importService.ts` |
| **UX-01** | Header Dead-Click Icons & Mobile Menu Accessibility | Phase 3 (UI/UX) | Medium (P1) | **REMEDIATED** | `DashboardHeader.tsx`, `AdminSidebar.tsx` |
| **PWA-01** | Sensitive Data Pass-through & Network-First HTML | Phase 4 (PWA) | Medium (P1) | **VERIFIED** | `public/sw.js` |

---

## Detailed Remediation Actions

### 1. Unified JWT Configuration (`src/lib/jwtConfig.ts`)
- Implemented strict startup validation for `JWT_SECRET`.
- Production requires a cryptographically strong secret (minimum 32 characters).
- Throws fatal configuration error in production if the secret is missing or insecure default.
- Shared between edge middleware and Node.js backend.

### 2. Strict Live Authorization (`src/lib/apiAuth.ts`)
- Fails closed in production if MongoDB connectivity is lost during an authorization check (`503 AUTH_CHECK_FAILED`).
- Re-reads live user status and live user role directly from database to immediately catch administrative deactivations and permission revocations.

### 3. Deep File Safety Validation (`src/lib/fileValidation.ts`)
- Added magic number signature verification for `.pdf`, `.zip`, `.png`, `.jpg`, `.docx`, and `.xlsx`.
- Whitelisted allowed extensions and enforced MIME compatibility.
- Stripped path traversal tokens (`..`, `/`, `\`) from incoming filenames.
- Enforced strict 10MB upload ceiling.

### 4. Zero-Trust File Retrieval Authorization (`src/app/api/files/[fileKey]/route.ts`)
- Validated that requested `fileKey` exists in a recorded `Submission` attachment.
- Enforced role and ownership boundaries: interns can ONLY download attachments associated with their own submissions.
- Added hardened security headers: `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store, must-revalidate`, and `Content-Disposition: attachment; filename="..."`.

### 5. DDE / CSV Formula Sanitization (`src/services/reportService.ts`)
- Neutralized spreadsheet macro injections by prefixing dangerous initial characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with a single quote (`'`).

### 6. Bounded Import Pipeline (`src/services/importService.ts`)
- Enforced `MAX_IMPORT_BYTES = 5MB` and `MAX_IMPORT_ROWS = 500`.
- Disabled formula parsing (`cellFormula: false`) and HTML interpretation (`cellHTML: false`) to neutralize prototype pollution attack vectors in `xlsx`.
