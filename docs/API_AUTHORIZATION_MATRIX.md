# Vyorai (IWMS) — API Authorization Matrix

This matrix documents the authorization policies, role boundaries, database ownership checks, and response data DTOs for every route across the application.

---

## Authorization Matrix

| Endpoint | Method | Allowed Roles | Ownership / DB Check | Unauthenticated | Inactive Account | Stale / Demoted Role | Data Leakage Prevention / Response DTO |
|---|---|---|---|---|---|---|---|
| `/api/auth/login` | POST | Public | Validates email & bcrypt hash in DB | Allowed | 401 Unauthorized | N/A | Excludes `passwordHash`, `activationToken`, returns sanitized `SessionUser` DTO |
| `/api/auth/logout` | POST | Public / Any | Clears session cookie | Allowed | Allowed | Allowed | Empty cookie with maxAge: 0 |
| `/api/auth/me` | GET | `admin`, `intern` | Live DB status check | 401 Unauthorized | 403 Forbidden | Re-evaluates live role | Explicit DTO (`id`, `name`, `email`, `role`, `internId`, `status`) |
| `/api/auth/setup-password` | POST | Public (with token) | SHA-256 token lookup & expiry check | Allowed | Allowed (activates account) | N/A | Does not expose tokens in response |
| `/api/health` | GET | Public | Database & Redis status ping | Allowed | Allowed | Allowed | Returns health boolean flags only |
| `/api/files/upload` | POST | `admin`, `intern` | `requireAuth(["admin", "intern"])` | 401 Unauthorized | 403 Forbidden | Live role check | Magic bytes checked, returns `{ fileKey, fileName, fileSize, mimeType }` |
| `/api/files/[fileKey]` | GET | `admin`, `intern` | File MUST exist in a submission; intern MUST be submission owner | 401 Unauthorized | 403 Forbidden | 403 Forbidden if not admin or owner | Safe stream with `nosniff`, `private, no-store`, sanitizes attachment filename |
| `/api/documents/[id]/download` | GET | `admin`, `intern` | Admin OR `recipientInternId === user.id` | 401 Unauthorized | 403 Forbidden | 403 Forbidden if role demoted | PDF binary stream with `X-Document-Hash` |
| `/api/progress-images/[id]/view` | GET | `admin`, `intern` | Task intern ownership & strict 24-hr expiry | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Private temporary Cloudinary signed URL |
| `/api/cron/cleanup-expired-images` | POST | Cron Job | `CRON_SECRET` Bearer header | 401 Unauthorized | 401 Unauthorized | N/A | Cloudinary deletion counters only |
| `/api/admin/tasks` | GET, POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Paginated task list, sanitized fields |
| `/api/admin/tasks/[id]` | GET, PATCH | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Task detail and audit trail |
| `/api/admin/tasks/[id]/unassign` | POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Task state change with AuditLog |
| `/api/admin/tasks/[id]/transfer` | POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Task transfer with snapshot tracking |
| `/api/admin/tasks/[id]/submissions/[submissionId]/review` | POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Admin review feedback record |
| `/api/admin/tasks/review-queue` | GET | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Aggregated review queue with pagination |
| `/api/admin/interns` | GET, POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | User schema excludes `passwordHash`, `activationToken` by default (`select: false`) |
| `/api/admin/interns/[id]` | GET, PATCH, DELETE | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Cascading cleanup for deletion with audit log |
| `/api/admin/interns/[id]/reset-link` | POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Generates secure one-time token link |
| `/api/admin/import` | GET, POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | 5MB & 500-row limits, structured preview DTO |
| `/api/admin/import/confirm` | POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Transactional row-by-row creation with validation |
| `/api/admin/projects` | GET, POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Validates team membership count (min 2) |
| `/api/admin/projects/[id]` | GET, PATCH | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Project metadata and team list |
| `/api/admin/projects/[id]/members` | POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Add/remove team member with audit event |
| `/api/admin/projects/[id]/tasks` | POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Creates task linked to collaborative project |
| `/api/admin/reports` | GET | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | DDE formula sanitization on CSV exports |
| `/api/admin/emails` | GET, POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Bulk email dispatch logs, provider state |
| `/api/admin/documents` | GET | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Issued documents metadata |
| `/api/admin/documents/templates` | GET, POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Document template versioning |
| `/api/admin/documents/bulk-generate` | POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Batch PDF generation with SHA-256 hash |
| `/api/admin/documents/actions` | POST | `admin` | `requireAuth(["admin"])` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Revocation / replacement actions |
| `/api/intern/tasks` | GET | `intern` | `assignedInternId === user.id` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Intern only sees tasks assigned to them |
| `/api/intern/tasks/[id]` | GET, PATCH | `intern` | `assignedInternId === user.id` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Status progression check (`assigned` -> `in_progress`) |
| `/api/intern/tasks/[id]/submit` | POST | `intern` | `assignedInternId === user.id` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Versioned submission creation |
| `/api/intern/tasks/[id]/progress-images` | POST | `intern` | `assignedInternId === user.id` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Uploads daily image with 24-hr TTL |
| `/api/intern/projects` | GET | `intern` | `teamMemberIds.includes(user.id)` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Intern only sees projects they belong to |
| `/api/intern/projects/[id]` | GET | `intern` | `teamMemberIds.includes(user.id)` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Project detail view for team members |
| `/api/intern/history` | GET | `intern` | `internId === user.id` | 401 Unauthorized | 403 Forbidden | 403 Forbidden | Historical submission record for logged-in intern |
