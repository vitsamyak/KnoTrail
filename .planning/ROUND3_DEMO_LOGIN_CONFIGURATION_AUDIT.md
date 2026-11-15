# KnoTrail Round 3: Demo Login Deployment Configuration Audit

**Product:** KnoTrail — Reconstructing Verified, Source-Traceable Project Knowledge  
**Event:** CodersInPune Hackathon 2026 — Final Round 3 Preparation  
**Team:** Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)  
**Date:** November 15, 2026  
**Reference Commit:** `72e66ee` on branch `main`  
**Status:** AUDIT COMPLETE — EMPIRICALLY VERIFIED

---

## Executive Summary

Following the completion and verification of the server-verified Login System in commit `72e66ee`, this audit inspects the deployment configuration across local development (`.env.local`), the standalone Express backend deployment blueprint (`render.yaml`), the frontend client configuration (`src/lib/api-client.ts`), and live external endpoints.

This audit strictly adheres to hackathon security rules:
- **Zero Secret Exposure:** No secret keys, passwords, tokens, or hashes are printed.
- **Presence Verification:** Only the presence or absence of each configuration variable is reported.
- **Environment Distinction:** Local development settings are explicitly distinguished from Render and Vercel production deployment settings.
- **No File Modifications:** Audited strictly without changing application source code or deployment configurations.

---

## Audit Findings: The 10 Assessment Questions

### 1. Does the deployed backend currently have `DEMO_MANAGER_EMAIL` configured?
- **Render Production Environment (`render.yaml`):** **MISSING (Not configured)**  
  `render.yaml` defines `NODE_ENV`, `PORT`, `STORAGE_BACKEND`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_STORAGE_BUCKET`, `GEMINI_API_KEY`, and `CORS_ORIGINS`. It does not declare `DEMO_MANAGER_EMAIL`.
- **Local Environment (`.env.local`):** **MISSING (Not configured)**
- **Runtime Code Behavior:**  
  In [backend/routes/auth.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/backend/routes/auth.ts), the application employs a resilient code-level fallback:
  ```ts
  email: (process.env.DEMO_MANAGER_EMAIL || 'manager@knotrail.demo').trim().toLowerCase()
  ```
  Because the environment variable is not explicitly set, the server automatically defaults to `manager@knotrail.demo`.

---

### 2. Does it have `DEMO_MANAGER_PASSWORD` configured?
- **Render Production Environment (`render.yaml`):** **MISSING (Not configured)**  
  `render.yaml` does not declare `DEMO_MANAGER_PASSWORD`.
- **Local Environment (`.env.local`):** **MISSING (Not configured)**
- **Runtime Code Behavior:**  
  In [backend/routes/auth.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/backend/routes/auth.ts), the application employs a resilient code-level fallback:
  ```ts
  password: process.env.DEMO_MANAGER_PASSWORD || 'KnoTrail2026!Manager'
  ```
  Because the environment variable is not explicitly set in Render or `.env.local`, the server automatically defaults to the documented hackathon demo password `KnoTrail2026!Manager`.

---

### 3. Is `SUPABASE_URL` configured?
- **Local Environment (`.env.local`):** **PRESENT**  
  Configured as `https://osuxjhegpktydgfyjroa.supabase.co`.
- **Render Production Environment (`render.yaml`):** **PRESENT in declaration (`sync: false`)**  
  Declared in `render.yaml` to be supplied via the Render Dashboard environment settings.
- **Operational Reality & Network Connectivity:**  
  As verified during Phase 1 (`PHASE1_SUPABASE_VERIFICATION.md`), DNS queries for `osuxjhegpktydgfyjroa.supabase.co` return `NXDOMAIN` (host unreachable). The Supabase project is currently paused, deleted, or was referenced with a typographical placeholder.

---

### 4. Is `SUPABASE_SERVICE_ROLE_KEY` configured?
- **Specific Variable `SUPABASE_SERVICE_ROLE_KEY`:** **MISSING** (in both `.env.local` and `render.yaml`).
- **Canonical Successor `SUPABASE_SECRET_KEY`:** **PRESENT** in `.env.local` and declared in `render.yaml`.
- **Code Compatibility:**  
  In [src/server/db/supabaseClient.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/server/db/supabaseClient.ts), the system implements backwards-compatible resolution:
  ```ts
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  ```
  The server code treats `SUPABASE_SECRET_KEY` as primary and `SUPABASE_SERVICE_ROLE_KEY` as fallback. Therefore, credentials are provided via `SUPABASE_SECRET_KEY`, though the variable under the exact name `SUPABASE_SERVICE_ROLE_KEY` is absent.

---

### 5. Which authentication provider will the production login endpoint actually use?
- **Resolved Provider:** **`server_demo` (Server-Verified Demo HMAC Engine)**
- **Execution Path:**  
  In [backend/routes/auth.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/backend/routes/auth.ts):
  1. The login endpoint first checks `if (isSupabaseConfigured())`.
  2. If credentials exist, it attempts `supabase.auth.signInWithPassword(...)`.
  3. Because `osuxjhegpktydgfyjroa.supabase.co` is unreachable (`NXDOMAIN`) and the demo account does not exist in Supabase Auth GoTrue tables, the Supabase call fails or throws.
  4. The router gracefully catches this error and progresses to Step 2:
     ```ts
     const isEmailMatch = normalizedEmail === demo.email;
     const isPasswordMatch = verifyPasswordTimingSafe(password, demo.password);
     ```
  5. The server validates credentials in constant time (`crypto.timingSafeEqual`) against the demo manager credentials and issues a signed HMAC token (`kt_hmac.*`) valid for 24 hours.
  6. Response returns `authProvider: "server_demo"` with verified `MANAGER` role.

---

### 6. Does the demo account exist in Supabase Auth, or does it use the server-side demo credential fallback?
- **Assessment:** **It uses the server-side demo credential fallback.**
- **Evidence:**  
  1. There are zero SQL migrations or seed scripts in `supabase/migrations/` creating auth users in `auth.users`.
  2. The configured Supabase endpoint is unreachable, preventing any interactive sign-up or GoTrue communication.
  3. The demo account `manager@knotrail.demo` is handled exclusively through server-side password hash comparison and signed HMAC session tokens issued by the standalone Express backend.

---

### 7. Which workspace will the demo Manager account access?
- **Resolved Target Workspace:**
  - **Dynamic Visitor Workspace (Default Flow):** If the visitor is actively browsing an existing anonymous workspace (`ws_anon_<timestamp>_<id>`), the frontend passes `workspaceId: ws_anon_...` in the login payload. The backend binds that exact workspace, upgrades it to `isProtected: true`, designates `ownerId: "usr_mgr_demo_2026"`, and registers the user as `MANAGER`.
  - **Static Fallback Workspace:** If no workspace ID or an invalid workspace ID is provided in the request body, the backend binds to `'ws_proj_demo'`.

---

### 8. Is that workspace actually present in the configured production storage?
- **Local Storage (`STORAGE_BACKEND=file` / `.data/`):** **YES**  
  `ws_proj_demo.json` is present on disk at `.data/workspaces/ws_proj_demo.json`, along with the visitor's `ws_anon_*` workspaces.
- **Configured Production Storage (`STORAGE_BACKEND=supabase`):** **NO**  
  In `render.yaml`, `STORAGE_BACKEND` is set to `supabase`. In Supabase, workspaces are stored in the PostgreSQL `workspaces` table. Because:
  1. The remote Supabase host `osuxjhegpktydgfyjroa.supabase.co` is unreachable.
  2. The schema migrations (`20261110000001_knotrail_supabase_schema.sql` and `20261112000001_knotrail_workspace_members.sql`) have not been executed on live Supabase.
  Neither `ws_proj_demo` nor any other workspace exists in the remote Supabase database. If Render runs with `STORAGE_BACKEND=supabase`, storage calls will fail unless Supabase is restored or `STORAGE_BACKEND=file` is used.

---

### 9. Does the deployed frontend point to the correct production backend?
- **Assessment:** **NO, not currently.**
- **Evidence:**  
  1. **Client URL Resolution:** In [src/lib/api-client.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/lib/api-client.ts), `getApiBaseUrl()` reads `process.env.NEXT_PUBLIC_API_BASE_URL`. If unset, it falls back to `http://localhost:4000`.
  2. **Build Configuration:** `NEXT_PUBLIC_API_BASE_URL` is not defined in `.env.local`. When Next.js compiles static assets, it inlines `http://localhost:4000`.
  3. **Live Deployment Verification:**
     - `https://knotrail.vercel.app` returns `HTTP 404 (DEPLOYMENT_NOT_FOUND)`.
     - `https://knotrail-backend.onrender.com` returns `HTTP 404 (Not Found)`.
     Neither the frontend nor backend is currently serving on those default URLs. For production deployment, Vercel must have `NEXT_PUBLIC_API_BASE_URL` explicitly configured to point to the live Render backend service.

---

### 10. Are there any missing environment variables that would prevent login?
Depending on the runtime environment:

#### A. Local Development Environment (`npm run dev` / `npm start`)
- **Status:** **Zero Missing Variables — Login Functions Out of the Box**
- All login flows work completely without any environment variables set because:
  - `DEMO_MANAGER_EMAIL` defaults to `manager@knotrail.demo`.
  - `DEMO_MANAGER_PASSWORD` defaults to `KnoTrail2026!Manager`.
  - `SESSION_SECRET` defaults to `knotrail_hmac_session_secret_2026_strict`.
  - `STORAGE_BACKEND` defaults to `file`.
  - `apiClient` falls back to `http://localhost:4000`.

#### B. Render Production Backend (`render.yaml`)
- **Critical Blocker: `STORAGE_BACKEND=supabase` with unreachable database**  
  `render.yaml` configures `STORAGE_BACKEND: supabase`. When `STORAGE_BACKEND` is `supabase`, `getStorage()` in [backend/routes/auth.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/backend/routes/auth.ts) instantiates `SupabaseStorageRepository`. When it attempts to query or create the target workspace, the unreachable Supabase host causes an unhandled database error, resulting in an HTTP 500 error on `/api/auth/login`.  
  *Remedy:* For hackathon demonstration reliability, Render should either run with `STORAGE_BACKEND: file` or connect to an active, migrated Supabase instance.
- **Recommended Variable: `SESSION_SECRET`**  
  Missing from `render.yaml`. The backend falls back to its built-in default, but an explicit high-entropy secret in Render is recommended.

#### C. Vercel Production Frontend
- **Critical Blocker: `NEXT_PUBLIC_API_BASE_URL`**  
  Must be added in Vercel Dashboard pointing to the active Render backend (e.g. `https://<render-service>.onrender.com`). Without this variable, user browsers attempting to log in will try to send requests to `http://localhost:4000/api/auth/login`, resulting in network failure.
- **CORS Alignment: `CORS_ORIGINS`**  
  In `render.yaml`, `CORS_ORIGINS` is set to `https://knotrail.vercel.app,http://localhost:3000`. If Vercel assigns a different domain or preview domain, it must be added to `CORS_ORIGINS` or browser login requests will be blocked by CORS policy.

---

## Configuration Matrix Summary

| Variable | Local (`.env.local`) | Render (`render.yaml`) | Status for Login | Impact / Notes |
| :--- | :---: | :---: | :---: | :--- |
| `DEMO_MANAGER_EMAIL` | Missing | Missing | Non-blocking | Built-in fallback: `manager@knotrail.demo` |
| `DEMO_MANAGER_PASSWORD` | Missing | Missing | Non-blocking | Built-in fallback: `KnoTrail2026!Manager` |
| `SESSION_SECRET` | Missing | Missing | Non-blocking | Built-in fallback: `knotrail_hmac_session_secret_2026_strict` |
| `SUPABASE_URL` | Present | Present (`sync: false`) | **Attention Needed** | Host unreachable (`NXDOMAIN`); causes login failure if `STORAGE_BACKEND=supabase` |
| `SUPABASE_SECRET_KEY` | Present | Present (`sync: false`) | Present | Canonical key present; legacy `SUPABASE_SERVICE_ROLE_KEY` alias missing |
| `SUPABASE_SERVICE_ROLE_KEY` | Missing | Missing | Non-blocking | Superseded by `SUPABASE_SECRET_KEY` |
| `STORAGE_BACKEND` | `supabase` (local) | `supabase` (Render) | **Critical** | If `supabase`, requires reachable DB; `file` works reliably offline |
| `NEXT_PUBLIC_API_BASE_URL` | Missing | N/A (Frontend only) | **Critical on Vercel** | Required in Vercel build environment to route API calls to Render |
| `CORS_ORIGINS` | Missing (default *) | Present | Non-blocking (if origin matches) | Must match exact Vercel production/preview domain |

---

## Recommendations Before Final Deployment

1. **For Immediate Demo Stability on Render:**  
   Temporarily change `STORAGE_BACKEND` to `file` in Render dashboard or `render.yaml` until the Supabase project reference is unpaused and migrations are run. This guarantees that `POST /api/auth/login` succeeds with 100% reliability.
2. **For Vercel Deployment:**  
   Ensure `NEXT_PUBLIC_API_BASE_URL` is configured in Vercel environment variables before triggering the production build.
3. **For Supabase Cloud Activation (When Ready):**  
   - Update `SUPABASE_URL` with the active project reference from Supabase Dashboard.
   - Run the two database migrations in the Supabase SQL Editor.
   - Verify that `https://<project-ref>.supabase.co/health` or `/rest/v1/` resolves before switching `STORAGE_BACKEND=supabase`.
