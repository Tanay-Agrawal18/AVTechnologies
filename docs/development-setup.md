# Development & Environment Setup Guide

## 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or free MongoDB Atlas cluster
- **Package Manager**: `npm` (v10+)

---

## 2. Quickstart Installation

1. **Clone & Switch to Branch**:
   ```bash
   git clone https://github.com/Tanay-Agrawal18/AVTechnologies.git
   cd AVTechnologies
   git checkout refactor/production-architecture
   ```

2. **Install Dependencies**:
   Due to an upstream peer dependency mismatch between `vitest` and `@types/node`, install using:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure Environment Variables**:
   Copy the example template to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   At minimum for local development:
   ```env
   NODE_ENV=development
   MONGODB_URI=mongodb://127.0.0.1:27017/iwms_dev
   JWT_SECRET=super_secret_dev_session_signing_key_32_chars_minimum!
   STORAGE_ADAPTER=local
   INITIAL_ADMIN_EMAIL=admin@company.com
   INITIAL_ADMIN_PASSWORD=adminpassword123
   ```

4. **Bootstrap Initial Administrator**:
   ```bash
   npm run bootstrap:admin
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the portal.

---

## 3. Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts local Next.js dev server with Turbopack |
| `npm run build` | Compiles optimized Next.js production build |
| `npm run start` | Serves compiled Next.js build |
| `npm run lint` | Runs ESLint 9 checks |
| `npm run test` | Executes Vitest unit and integration suites |
| `npm run test:e2e` | Runs Playwright end-to-end tests |
| `npm run bootstrap:admin` | Seeds or updates the initial administrator account |

---

## 4. Production Deployment Best Practices
- Refer to `DEPLOYMENT_CHECKLIST.md` for complete guides on deploying to Vercel, Render, or VPS.
- When configuring Cloudflare R2 for production object storage, switch `STORAGE_ADAPTER=r2` and provide `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`.
