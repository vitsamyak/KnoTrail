# KnoTrail — Production Deployment Runbook

**Architecture:** Decoupled Frontend (Vercel) + Standalone Backend (Render) + Persistent Database & Files (Supabase)  
**Repository:** `vitsamyak/KnoTrail`  
**Primary Production Branch:** `main`  
**Implementation Branch:** `deployment/render-vercel`  

---

## 1. Architecture Overview

KnoTrail operates as a decoupled, multi-cloud web application designed for high availability, fast asset delivery, compute isolation, and strict secret boundaries:

```
                  ┌────────────────────────────────────────┐
                  │            End User / Judge            │
                  └───────────────────┬────────────────────┘
                                      │
                   HTTPS Request      │     Direct API Requests
               (HTML/JS/CSS/Assets)   │     (CORS Authorized)
                                      ▼
                        ┌───────────────────────────┐
                        │       Frontend (Vercel)    │
                        │   Next.js 14 App Router   │
                        │   Pure Client / SSR       │
                        │   Zero Secrets Stored     │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │      Backend (Render)     │
                        │   Node.js 24 + Express    │
                        │   Region: Singapore       │
                        │   AI / PDF / OCR / Storage│
                        └──────┬─────────────┬──────┘
                               │             │
              PostgreSQL Data  │             │  Private File Storage
              (JSONB & Shares) │             │  (Workspace-Scoped)
                               ▼             ▼
                        ┌───────────────────────────┐
                        │     Database & Storage    │
                        │      (Supabase Mumbai)    │
                        │   PostgreSQL 15 + OCC     │
                        │   Bucket: knotrail-...    │
                        └───────────────────────────┘
```

### Component Responsibilities:
1. **Frontend (Vercel):** Serves the Next.js single-page interactive application, responsive Tailwind UI, client routing, and the public `/share/[token]` viewer. Connects exclusively to the Render API via `NEXT_PUBLIC_API_BASE_URL`. Holds zero backend secrets.
2. **Backend (Render):** Standalone Express HTTP service (`backend/`). Executes heavy CPU/IO tasks: Gemini 2.5 Flash AI extraction, PDF page extraction via `unpdf`, evidence verification, conflict detection, review gating, handover generation, and exports.
3. **Database & Storage (Supabase):** PostgreSQL with canonical JSONB aggregate state, optimistic concurrency control (`save_workspace_state`), SHA-256 hashed share token table (`handover_shares`), and private file storage (`knotrail-source-files`).

---

## 2. Local Development Commands

To run both services locally on your machine:

```bash
# 1. Install dependencies
npm install

# 2. Start the standalone backend (runs on http://localhost:4000)
npm run backend:dev

# 3. In a separate terminal, start the Next.js frontend (runs on http://localhost:3000)
npm run dev

# 4. Run the full automated test suite (149 tests across 9 suites)
npm test

# 5. Build production artifacts
npm run backend:build
npm run frontend:build
```

---

## 3. Render Service Setup (Backend API)

### Step 3.1: Create Web Service
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Select **Build and deploy from a Git repository** and connect `vitsamyak/KnoTrail`.
4. Configure the following service settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `knotrail-backend` |
| **Region** | **Singapore (Southeast Asia)** *(lowest latency to Supabase Mumbai)* |
| **Branch** | `main` (or `deployment/render-vercel` during staging) |
| **Root Directory** | *(leave empty / repository root)* |
| **Runtime** | **Node** |
| **Build Command** | `npm ci && npm run backend:build` |
| **Start Command** | `npm run backend:start` |
| **Plan Type** | **Starter** (or Free) |

### Step 3.2: Configure Health Check Path
- Under **Advanced Settings**, set **Health Check Path** to:  
  `/health/live`  
  *(This ensures Render marks the container healthy as soon as Express binds to `0.0.0.0:$PORT` without blocking on third-party databases).*

---

## 4. Render Environment Variables Table

Configure the following environment variables in the Render Dashboard (**Environment** tab):

| Variable Name | Required | Example / Recommended Value | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables production optimizations. |
| `PORT` | **Yes** | `4000` | Port for Express to bind (Render automatically routes traffic to this port). |
| `STORAGE_BACKEND` | **Yes** | `supabase` | Enables persistent cloud storage. |
| `SUPABASE_URL` | **Yes** | `https://osuxjhegpktydgfyjroa.supabase.co` | Your Supabase project URL (Project Settings → API). |
| `SUPABASE_SECRET_KEY` | **Yes** | `eyJhbGciOi...` *(service_role secret)* | Supabase **service_role** JWT secret key. Never expose in frontend. |
| `SUPABASE_STORAGE_BUCKET` | **Yes** | `knotrail-source-files` | Name of the private Supabase Storage bucket. |
| `GEMINI_API_KEY` | **Yes** | `AIzaSy...` | Google GenAI API key for Gemini 2.5 Flash knowledge extraction. |
| `CORS_ORIGINS` | **Yes** | `https://knotrail.vercel.app,http://localhost:3000` | Comma-separated list of allowed frontend origins (no trailing slashes). |

*(Note: Secrets should never be committed to git. Use Render's Environment Variables UI or Render Secret Groups).*

---

## 5. Vercel Project Setup (Frontend UI)

### Step 5.1: Create Vercel Project
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import the `vitsamyak/KnoTrail` repository.
4. Configure the project settings:

| Setting | Value |
| :--- | :--- |
| **Project Name** | `knotrail` |
| **Framework Preset** | **Next.js** |
| **Root Directory** | `./` |
| **Build Command** | `npm run frontend:build` *(or default `next build`)* |
| **Output Directory** | `.next` *(default)* |
| **Install Command** | `npm ci` |

### Step 5.2: Configure Vercel Environment Variables
Add only the public API base URL in the Vercel **Environment Variables** panel:

| Variable Name | Environment | Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | Production & Preview | `https://knotrail-backend.onrender.com` *(your actual Render backend URL)* |

> [!CAUTION]
> **DO NOT** add `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `GEMINI_API_KEY` to Vercel!  
> All database and AI operations occur exclusively on Render. The frontend requires **only** `NEXT_PUBLIC_API_BASE_URL`.

---

## 6. CORS Configuration Procedure

1. Obtain your official Vercel production domain (e.g. `https://knotrail.vercel.app`).
2. If using custom domains, add them to the comma-separated list.
3. In the Render Dashboard under **Environment**, set `CORS_ORIGINS`:
   ```env
   CORS_ORIGINS=https://knotrail.vercel.app,https://knotrail-preview.vercel.app,http://localhost:3000
   ```
4. Save and deploy. The backend will automatically allow preflight `OPTIONS` requests from these origins with status 204 and reject unauthorized origins with HTTP 403.

---

## 7. Supabase Database Migration Procedure

Before routing production traffic to Supabase, apply the idempotent schema migration:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Ensure the project is active (if paused, click **Restore project** and wait 2 minutes for DNS to resolve).
3. Open the **SQL Editor** in the left sidebar.
4. Copy the entire contents of:  
   [`supabase/migrations/20261110000001_knotrail_supabase_schema.sql`](../supabase/migrations/20261110000001_knotrail_supabase_schema.sql)
5. Paste into the SQL Editor and click **Run**.
6. Verify output confirms:
   - Table `workspaces` created with `project_data` JSONB and `version` integer column.
   - Stored procedure `save_workspace_state` created.
   - Table `handover_shares` created with `token_hash` primary key.
   - RLS enabled on all tables, denying anonymous public access.

---

## 8. Supabase Storage Bucket Verification

1. In Supabase Dashboard, navigate to **Storage**.
2. Verify the bucket `knotrail-source-files` exists.
3. If not present, click **New Bucket**:
   - Name: `knotrail-source-files`
   - Public bucket: **Disabled** *(MUST BE PRIVATE)*
4. Ensure files are stored under workspace-scoped relative paths: `<workspaceId>/<sourceId>.<ext>`.

---

## 9. Health & Verification Endpoints

You can verify service status at any time via curl or browser:

```bash
# 1. Process Liveness Check (Always returns 200 if container is running)
curl -i https://<your-render-backend>.onrender.com/health/live
# Expected: HTTP 200 {"status":"ok","uptime":...,"timestamp":"..."}

# 2. Readiness Check (Probes database connectivity)
curl -i https://<your-render-backend>.onrender.com/health/ready
# Expected: HTTP 200 {"status":"ready","storage":"supabase","ready":true,...}
# If Supabase is paused/unreachable: HTTP 503 {"status":"degraded",...}
```

---

## 10. Security Checklist

- [x] **Zero Secret Leaks**: Neither `SUPABASE_SECRET_KEY` nor `GEMINI_API_KEY` are present in frontend bundles, public code, or Next.js serverless functions.
- [x] **Zero Plaintext Tokens**: Share links (`kt_share_<uuid>`) are stored in PostgreSQL exclusively as SHA-256 cryptographic hashes.
- [x] **Strict CORS**: Origin whitelist enforced; wildcard (`*`) origins blocked in production.
- [x] **Capability Workspace IDs**: Unguessable high-entropy IDs (`^[a-zA-Z0-9_-]{3,64}$`) isolate visitors without login walls.
- [x] **Optimistic Concurrency Control**: Prevents dirty writes via atomic version comparison in `save_workspace_state`.
- [x] **Safe Document Storage**: All uploaded files are stored in a private Supabase Storage bucket; unauthenticated public access is denied.

---

## 11. Production Smoke-Test Checklist

After deploying both Vercel and Render:

1. [ ] Open `https://<your-vercel-domain>` in a fresh **Incognito Window**.
2. [ ] Verify Landing Page loads without login or signup prompts.
3. [ ] Click **Try Live Demo** or open workspace; verify demo data populates.
4. [ ] Upload a test document (`.pdf`, `.txt`, or `.md`) in **Source Manager**; verify text extraction succeeds.
5. [ ] In **AI Analysis**, click **Run Analysis**; verify findings populate and groundings link to source coordinates.
6. [ ] In **Review Center**, edit a finding and resolve a conflict; verify changes save to Render backend.
7. [ ] In **Handover Dossier**, click **Certify Handover**; verify certified badge and hash are generated.
8. [ ] Click **Create Share Link**; copy the `/share/[token]` URL and open in another browser; verify public read-only dossier renders.
9. [ ] Revoke the share link; verify subsequent access displays "Handover Unavailable".

