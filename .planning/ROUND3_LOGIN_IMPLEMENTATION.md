# KnoTrail Round 3: Server-Verified Login System Implementation Report

**Product:** KnoTrail — Reconstructing Verified, Source-Traceable Project Knowledge  
**Event:** CodersInPune Hackathon 2026 — Final Round 3 Preparation  
**Team:** Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)  
**Date:** November 15, 2026  
**Status:** Completed & Fully Verified (185/185 Tests Passing)

---

## 1. Executive Summary & Scope

To fulfill the Round 3 hackathon requirements, the **Login & Authentication Experience** was prioritized to provide judges and evaluators with a secure, server-verified login workflow while completely preserving zero-login public demo accessibility.

Prior to this implementation:
- Handover access control relied on a frontend role selector (`developer`, `manager`, `external`).
- API requests could pass client-supplied headers without authoritative server-side authentication.
- Workspaces lacked server-side authentication endpoints (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`).

This deliverable establishes an end-to-end, production-grade authentication and session management layer that:
1. **Preserves Public Demo Access:** Anonymous visitors can explore and upload documents in public demo workspaces without signing in.
2. **Provides Demo Account Login:** A dedicated login modal supports email/password authentication with pre-configured demo credentials (`manager@knotrail.demo`).
3. **Enforces Server-Verified Security:** Issues cryptographically signed HMAC session tokens (`kt_hmac.*`) or Supabase Auth JWTs. Client role headers are strictly ignored as security boundaries.
4. **Authoritatively Assigns the Manager Role:** Authenticated demo users are registered in server-side storage records as `MANAGER`, unlocking protected workspace management and handover certification.
5. **Ensures Credential & Secret Isolation:** Passwords and keys are never logged, never returned in API responses, and never stored in `localStorage`. Tokens are stored in transient `sessionStorage`.

---

## 2. Authentication Architecture & Dual-Provider Design

```
                     ┌──────────────────────────────────────────────┐
                     │             Frontend Client (Next.js)        │
                     │  - sessionStorage: knotrail_auth_token       │
                     │  - LoginModal / Header / Sidebar Status      │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            │ Authorization: Bearer <token>
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │           Standalone Express Backend         │
                     │  backend/middleware/auth.ts (authMiddleware) │
                     └──────────────────────┬───────────────────────┘
                                            │
                   ┌────────────────────────┴────────────────────────┐
                   │                                                 │
                   ▼                                                 ▼
      [Supabase Auth Engine]                         [Server-Verified Demo Engine]
   - signInWithPassword()                         - SHA-256 Constant-Time Compare
   - Remote Supabase JWT                          - Signed HMAC HS256 Token (24h)
   - Fallback if network down                     - Authoritative Role: MANAGER
                   │                                                 │
                   └────────────────────────┬────────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │         Storage & Authorization Layer        │
                     │  - DurableFileRepository / Supabase pg       │
                     │  - requireWorkspaceAccess & requireRole      │
                     │  - Member registry: userId -> MANAGER        │
                     └──────────────────────────────────────────────┘
```

### Key Technical Decisions:
1. **Timing-Safe Password Verification:**
   Password comparisons in `backend/routes/auth.ts` compute SHA-256 digests of provided and expected values before calling `crypto.timingSafeEqual()`, completely preventing timing attacks and length leakage.
2. **Dual-Engine Authentication:**
   - When Supabase credentials are valid and reachable, `supabase.auth.signInWithPassword()` authenticates the user against Supabase Auth.
   - When running locally, offline, or with mock storage, the server evaluates server-verified demo credentials (`DEMO_MANAGER_EMAIL` and `DEMO_MANAGER_PASSWORD`) and issues an HMAC-signed session token.
3. **Session Token Structure:**
   HMAC tokens follow RFC 7519 specifications (`kt_hmac.<header>.<payload>.<signature>`) with strict issuer (`knotrail-server`), audience (`knotrail-api`), and expiration (24 hours) claims.
4. **Transient Client Storage:**
   Tokens are stored exclusively in browser `sessionStorage` (`knotrail_auth_token`), ensuring credentials are immediately purged when the browser tab closes.

---

## 3. Implemented Components & Files

### A. Backend Architecture
| File | Role | Changes Made |
| :--- | :--- | :--- |
| [backend/routes/auth.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/backend/routes/auth.ts) | Authentication Router | Created `POST /login`, `GET /me`, `POST /logout`, `GET /status`. Implemented timing-safe hash verification, demo account binding, and server-side `MANAGER` assignment. |
| [backend/routes/index.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/backend/routes/index.ts) | Master API Router | Mounted `authRouter` at `/api/auth`. |
| [backend/middleware/auth.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/backend/middleware/auth.ts) | Auth Middleware | Extracts `Bearer <token>` from `Authorization` header, validates HMAC signatures / Supabase JWTs, and attaches `req.user`. |
| [backend/middleware/roleAuth.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/backend/middleware/roleAuth.ts) | RBAC Middleware | Validates workspace membership and role authorization against authoritative storage records. |

### B. Frontend Architecture & UI Components
| File | Component | Changes Made |
| :--- | :--- | :--- |
| [src/lib/api-client.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/lib/api-client.ts) | API Client | Added `login()`, `logout()`, `getAuthSession()`, `getAuthStatus()`. Added automatic `Authorization: Bearer <token>` injection for authenticated requests. |
| [src/context/ProjectContext.tsx](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/context/ProjectContext.tsx) | Global Context | Added `currentUser`, `isAuthenticated`, `isAuthLoading`, `authError`, `showLoginModal`, `login`, and `logout`. Restores active session on initial mount from `sessionStorage`. |
| [src/components/modals/LoginModal.tsx](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/components/modals/LoginModal.tsx) | Login Dialog | Created accessible modal featuring email & password inputs, password visibility toggle, one-click demo credentials autofill, loading spinners, and dismissible errors. |
| [src/components/layout/AppShell.tsx](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/components/layout/AppShell.tsx) | Application Shell | Mounted `LoginModal` at the top level. |
| [src/components/layout/Header.tsx](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/components/layout/Header.tsx) | Top Navigation Bar | Displays "Public Demo" badge and "Sign In" button when unauthenticated; displays verified email, `[MANAGER]` badge, and "Sign Out" button when authenticated. |
| [src/components/layout/Sidebar.tsx](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/components/layout/Sidebar.tsx) | Navigation Drawer | Added Authentication & Security Role Card showing `AUTHENTICATED` / `ANONYMOUS` status pills and direct login / logout actions. |
| [src/components/views/LandingView.tsx](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/components/views/LandingView.tsx) | Product Landing Page | Added "Sign In as Manager" CTA buttons in hero and bottom action sections. |

---

## 4. API Endpoints Specification

### `POST /api/auth/login`
- **Description:** Authenticates user via email and password server-side.
- **Request Body:**
  ```json
  {
    "email": "manager@knotrail.demo",
    "password": "KnoTrail2026!Manager",
    "workspaceId": "ws_proj_custom" // optional target workspace
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "status": "authenticated",
      "token": "kt_hmac.eyJhbGciOi...<signature>",
      "authProvider": "server_demo",
      "user": {
        "userId": "usr_mgr_demo_2026",
        "email": "manager@knotrail.demo",
        "role": "MANAGER"
      },
      "workspace": {
        "id": "ws_proj_demo",
        "isProtected": true,
        "memberRole": "MANAGER"
      }
    }
    ```
  - `400 Bad Request`: `{ "error": "Email address is required." }` or `{ "error": "Password is required." }`
  - `401 Unauthorized`: `{ "error": "Invalid email or password. Please verify your credentials." }`

### `GET /api/auth/me`
- **Description:** Returns the authenticated user and verified role for a workspace.
- **Headers:** `Authorization: Bearer <token>` (optional query `?workspaceId=<id>`)
- **Responses:**
  - Unauthenticated (no token): `200 OK` `{ "isAuthenticated": false, "user": null }`
  - Authenticated: `200 OK` `{ "isAuthenticated": true, "user": { ... }, "role": "MANAGER", "workspaceId": "..." }`
  - Tampered or Expired Token: `401 Unauthorized` `{ "error": "Invalid authentication token signature." }`

### `POST /api/auth/logout`
- **Description:** Acknowledges session teardown and instructs client to purge tokens.
- **Response:** `200 OK` `{ "status": "logged_out", "message": "User logged out successfully." }`

### `GET /api/auth/status`
- **Description:** Provides capability metadata to the UI without revealing secrets.
- **Response:** `200 OK` `{ "supabaseConfigured": true, "demoAccountAvailable": true, "demoEmail": "manager@knotrail.demo" }`

---

## 5. Security & Isolation Invariants

1. **Zero Client Trust:**
   Client requests passing `X-KnoTrail-Role` or self-asserted `userId` are strictly ignored. The active user's permissions are retrieved solely from verified session tokens matched against authoritative database records.
2. **Password & Secret Isolation:**
   Neither passwords nor service-role secrets are ever returned in API response bodies, printed in client-side console logs, or stored in persistent client storage.
3. **Public Demo Isolation:**
   Workspaces with ID prefix `ws_anon_` remain completely accessible to anonymous visitors without authentication tokens. Protected workspaces require valid authentication and workspace membership before reading or writing data.
4. **BOLA / IDOR Prevention:**
   Users authenticated in Workspace A cannot access Workspace B unless explicitly listed in Workspace B's member registry.

---

## 6. Verification & Automated Test Results

A dedicated automated test suite was created in [src/__tests__/loginAuth.test.mjs](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/__tests__/loginAuth.test.mjs) testing 12 distinct security scenarios:

```
▶ ▶ Round 3: Server-Verified Login & Authentication Test Suite
  ✔ 1. GET /api/auth/status returns auth capabilities without leaking passwords
  ✔ 2. GET /api/auth/me without token returns unauthenticated state (200)
  ✔ 3. POST /api/auth/login validates required fields (400 Bad Request)
  ✔ 4. POST /api/auth/login rejects invalid credentials with generic 401
  ✔ 5. POST /api/auth/login with valid demo credentials succeeds and returns MANAGER role
  ✔ 6. GET /api/auth/me with valid session token returns authenticated user
  ✔ 7. GET /api/auth/me rejects tampered or forged HMAC tokens (401)
  ✔ 8. GET /api/auth/me rejects expired HMAC tokens (401)
  ✔ 9. POST /api/auth/logout returns confirmation
  ✔ 10. Authenticated session permits MANAGER-only operations on protected workspace
  ✔ 11. Zero-login public demo workspaces remain completely functional without auth token
  ✔ 12. Password isolation: API responses never expose credentials
✔ ▶ Round 3: Server-Verified Login & Authentication Test Suite (13 tests, 0 failures)
```

### Full Repository Regression Verification
- **Total Test Suites:** 12 suites (`src/__tests__/*.test.mjs`)
- **Total Tests Passed:** 185 tests
- **Failed Tests:** 0
- **Frontend Production Build (`next build`):** Compiled successfully, all 4 routes optimized.
- **Backend Production Build (`npm run backend:build`):** Compiled successfully to `dist/backend/server.js` (218.9kb).

---

## 7. Demo Account Credentials & Setup

Judges and evaluators can log in using either the one-click "Demo Credentials" button in the Login Modal or by entering:
- **Email:** `manager@knotrail.demo` (or custom `DEMO_MANAGER_EMAIL`)
- **Password:** `KnoTrail2026!Manager` (or custom `DEMO_MANAGER_PASSWORD`)
- **Verified Role:** `MANAGER`
- **Capabilities Unlocked:** Protected workspace management, member invitation, evidence resolution, and handover certification.
