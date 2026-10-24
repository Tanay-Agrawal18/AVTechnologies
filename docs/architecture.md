# System Architecture Specification

## 1. System Overview
**AVTechnologies (IWMS)** is an enterprise Intern Work Management System designed with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **MongoDB (Mongoose)**. The architecture follows a modular monolith structure featuring strict role separation, layered services, and isolated storage boundaries.

```mermaid
graph TD
    Client[Browser Client: Next.js Client Components] -->|HTTP / JSON / Forms| MW[Next.js Edge/Node Proxy Middleware]
    MW -->|Route Match & JWT Validation| AppRouter[Next.js App Router]
    
    subgraph Routing Layer
        AppRouter -->|Page Render| Pages[Server / Client Pages]
        AppRouter -->|API Endpoints| ApiRoutes[API Route Handlers (/api/*)]
    end

    subgraph Service & Domain Layer
        ApiRoutes --> AuthValidation[Zod Request Validation & requireAuth()]
        AuthValidation --> Services[Domain Services]
        Services --> UserService[UserService]
        Services --> TaskService[TaskService]
        Services --> ProjectService[ProjectService]
        Services --> DocumentService[DocumentService]
        Services --> EmailService[EmailService]
    end

    subgraph Persistence & Infrastructure Layer
        Services --> MongooseCache[Cached Mongoose Pool]
        MongooseCache --> MongoDB[(MongoDB Atlas / Local)]
        Services --> StorageAdapter[StorageAdapter Factory]
        StorageAdapter --> LocalStorage[Local FS: /uploads]
        StorageAdapter --> CloudflareR2[Cloudflare R2 / S3]
        Services --> Cloudinary[Cloudinary CDN: 24h Expiring Media]
    end
```

---

## 2. Directory Layout & Module Responsibilities

```
src/
├── app/                        # Next.js App Router (pages, layouts, route handlers)
│   ├── (public)/               # Unauthenticated public entrypoints (/, /login, /setup-password)
│   ├── admin/                  # Admin portal (dashboard, tasks, interns, projects, reports, docs)
│   ├── intern/                 # Intern workspace (dashboard, tasks, projects, history, profile)
│   ├── api/                    # Server-side HTTP API routes (/api/admin, /api/intern, /api/auth, /api/files)
│   ├── globals.css             # Tailwind 4 styling system
│   └── layout.tsx              # Root HTML wrapper and Inter font setup
├── components/                 # Presentation & UI components
│   ├── AdminSidebar.tsx        # Navigation sidebar for admin routes
│   ├── InternSidebar.tsx       # Navigation sidebar for intern workspace
│   └── DashboardHeader.tsx     # Standardized dashboard header
├── lib/                        # Core system infrastructure & cross-cutting utilities
│   ├── auth.ts                 # JWT session issuance, signature, verification (jose)
│   ├── apiAuth.ts              # Server-side authorization gate (requireAuth)
│   ├── db.ts                   # Mongoose global connection cache & pool manager
│   ├── dbConfig.ts             # Database environment validation
│   ├── storage.ts              # Pluggable StorageAdapter (Local & Cloudflare R2 / S3)
│   ├── storageConfig.ts        # Storage environment validation
│   ├── cloudinary.ts           # Cloudinary SDK client for expiring daily progress snapshots
│   └── utils.ts                # Date formatting, Tailwind class merging (cn), badges
├── models/                     # Mongoose Schema definitions & TypeScript Document interfaces
│   ├── User.ts                 # Accounts (Admin, Intern), statuses, activation tokens
│   ├── Task.ts                 # Tasks, statuses, assignments, priorities, revisions
│   ├── TaskEvent.ts            # Audit log for task transitions
│   ├── Submission.ts           # Intern deliverable attachments, reviews, feedback
│   ├── Project.ts              # Team projects and member rosters
│   ├── DailyProgressImage.ts   # 24h ephemeral progress snapshots
│   ├── DocumentTemplate.ts     # PDF certificates and offer letter templates
│   ├── IssuedDocument.ts       # Generated intern documents
│   ├── AuditLog.ts             # Operational event audit trails
│   ├── EmailLog.ts             # Email dispatch records
│   └── index.ts                # Barrel export
├── services/                   # Business logic and domain workflows
│   ├── userService.ts          # Intern creation, authentication, password setups
│   ├── taskService.ts          # Task creation, submission, unassignment, transfer, reviews
│   ├── projectService.ts       # Project lifecycle and task assignment
│   ├── documentService.ts      # PDF generation (pdf-lib) & document issuance
│   ├── emailService.ts         # Multi-provider email dispatcher (SMTP, Resend, Mock)
│   ├── importService.ts        # CSV/XLSX bulk intern onboarding parser
│   ├── reportService.ts        # KPI analytics and CSV audit exports
│   └── taskStateService.ts     # Task transition validation state machine
├── types/                      # Application-wide TypeScript contracts
│   └── index.ts                # SessionUser, TaskStatus, TaskPriority, etc.
└── validators/                 # Runtime schema validation with Zod
    └── index.ts                # Request payloads, passwords, bulk CSV schemas
```

---

## 3. Request-to-Database Data Flow

1. **Client Request**: The browser issues a request to an endpoint, e.g., `POST /api/intern/tasks/:id/submit`.
2. **Middleware Layer (`src/middleware.ts`)**:
   - Matches route against protected matchers (`/admin/*`, `/intern/*`, `/api/*`).
   - Validates existence and signature of the `iwms_session` HTTP-only cookie using `jose`.
   - Confirms user role matches target zone (`intern` vs `admin`) and that account status is `active`.
3. **Route Handler Layer (`src/app/api/...`)**:
   - Calls `await requireAuth(["intern"])` in `src/lib/apiAuth.ts` for Defense-in-Depth authentication within the handler.
   - Parses the JSON or multipart body using the appropriate Zod schema (e.g., `CreateSubmissionSchema`).
4. **Service Layer (`src/services/...`)**:
   - Dispatches business workflow to `TaskService.submitWork()`.
   - Checks task ownership (verifies `assignedInternId === sessionUser.id`), validates status transition (`in_progress` &rarr; `submitted`).
   - Logs task audit event in `TaskEvent` collection.
5. **Persistence Layer (`src/lib/db.ts` & `src/models/...`)**:
   - Reuses cached Mongoose connection pool via `global.mongooseCache`.
   - Executes atomic updates on `Task` and creates new `Submission` document.
6. **Storage Layer (`src/lib/storage.ts`)**:
   - If files are attached, the pluggable `StorageAdapter` streams bytes to Cloudflare R2 or local private filesystem.
   - Returns a secure `fileKey` stored on the submission.
7. **Response**: Sanitized JSON response returned with appropriate status codes (`200 OK`, `201 Created`, or `400/403/500`).

---

## 4. Authentication and Authorization Boundaries

- **Session Tokens**: Signed using `jose` with HS256 and server-only `JWT_SECRET`. Minimum key length requirement is 32 characters.
- **Cookie Security**: HTTP-only, `sameSite: "lax"`, `secure` in production, path `/`.
- **Role Isolation**:
  - `admin`: Full organizational oversight, user provisioning, document issuing, task assignment.
  - `intern`: Restricted exclusively to assigned tasks, projects, personal history, and own profile.
- **Direct Object Reference Protection**: File download routes (`/api/files/[fileKey]`) verify that the requesting user is either an admin or the intern who uploaded the submission before streaming bytes.

---

## 5. Adding a New Feature

When adding a new feature (e.g., "Time Tracking"):
1. **Schema & Model**: Create `src/models/TimeEntry.ts` and register it in `src/models/index.ts`.
2. **Validator**: Define Zod request contracts in `src/validators/index.ts`.
3. **Domain Service**: Implement business rules and database mutations in `src/services/timeTrackingService.ts`.
4. **API Route**: Create route handler in `src/app/api/intern/time-entries/route.ts` with `requireAuth()` and Zod parsing.
5. **UI Component / Page**: Add view in `src/app/intern/time-entries/page.tsx` using `DashboardHeader` and feature components.
6. **Unit / Integration Tests**: Write test specifications in `tests/timeTracking.test.ts` and verify with `npm run test`.
