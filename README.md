# iPOMS – Infoziant Placement Operations Management System

> Internal placement-operations CRM, workflow engine, and BI portal for Infoziant IT Solutions Inc.
> **Repository:** [github.com/mohanaradha-13/ipoms](https://github.com/mohanaradha-13/ipoms)
> **Status:** 🚧 In active development — **~50% complete**. This README describes what is actually built and running today, not the original specification.

---

## About this document

The `version 1/` folder holds the original design specs (chapters, module docs, roadmap). Those were written **before any code existed** and have since diverged from what actually got built — sometimes because the spec was superseded by a later decision, sometimes because a piece simply hasn't been built yet.

**[CLAUDE.md](./CLAUDE.md)** is the reconciled source of truth: it was written by walking the live database and the real code, and it records exactly where reality differs from the spec and why. If you're picking this project up, read that file first. This README is a summary of it for anyone landing on the repo without that context.

---

## What iPOMS actually is

A placement-operations tool for Infoziant's internal team: coordinators log outreach calls, track weekly placement pipelines, manage a shared company/HR-contact database, capture daily leads, generate reports, and now coordinate with each other over an internal team chat. Four roles use it — an Administrator, Team Leaders, Placement Coordinators (the primary daily users), and external, read-only TPOs (college placement officers) who only see their own college's finalized weekly report.

---

## Actual tech stack (as run today)

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS — `http://localhost:3000` |
| Backend | Express + TypeScript, single entry point `backend/src/server.ts` — `http://localhost:5000` |
| Database | MongoDB, database name **`ipoms_db`** |
| Auth | Stateless JWT — 8h access token, optional 30-day httpOnly refresh cookie ("remember this device") |
| API | REST, base path `/api/v1` |
| Design | Light-mode neumorphic/clay UI, IBM Plex Sans, Infoziant navy `#1E3A8A`. No dark mode. |

**This is deliberately not** the layered `Controller → Service → Repository` architecture the original spec describes. The backend today is one ~4,200-line `server.ts` handling 66+ REST endpoints directly. That's the largest known piece of technical debt in the project (see [Known gaps](#known-gaps-and-what-blocks-a-release) below) — refactoring it into proper layers is a planned, not-yet-started, high-risk change.

### Real backend layout
```
backend/src/
  server.ts        — all 66+ routes, currently monolithic
  lib/              — auth middleware, route policy, chat routes, password policy, etc.
  models/           — Mongoose schemas
  jobs/             — cron jobs (1 of the originally planned 4 is built)
  scripts/          — one-off/admin CLI scripts (unlock a locked admin, fix role-code drift, seed data)
  config/, types/
```

### Real frontend layout
```
frontend/src/app/
  login/  signup/  dashboard/  tracker/  weekly-tracker/
  daily-leads/  metadata/  reports/  chat/  notifications/  settings/
```

---

## Auth model (as built)

Three separate gates run on every request, in order:

1. **`authenticateJWT`** — is this a valid, signed-in user? (401 if not)
2. **`authorizeRoute`** (`backend/src/lib/routePolicy.ts`) — is this user's *role* allowed to call this endpoint at all? Implemented as a **default-deny table**: an endpoint with no entry in the policy fails closed rather than silently opening to any logged-in user. Run `npm run verify:policy` in `backend/` after adding any route — it fails the build if a route has no policy entry.
3. **Ownership scoping** (in the handlers) — is this user allowed to see *this specific record*? E.g. a coordinator is pinned to their own `coordinator_id` regardless of query params.

**Role codes** (uppercase, exactly four): `ADMINISTRATOR`, `TEAM_LEADER`, `PLACEMENT_COORDINATOR`, `TPO`.

**Login** is by email (`name@infoziant.com`, auto-completed for staff), not username. **Password policy**: minimum 9 characters, at least one uppercase, one lowercase, one digit, and one of `@`/`.` — no other special characters allowed. Three failed logins are tolerated; the fourth locks the account. A locked coordinator recovers via a 6-digit emailed OTP; a locked administrator is recovered only via a server-side CLI script (`npm run unlock`), by design — an email-only recovery path would lock the whole org out if the admin mailbox itself were unreachable.

---

## Modules — what's built vs. what isn't

| Module | Status | Notes |
|---|---|---|
| User & Access (login, signup, settings) | ✅ Built | Email login, lockout, OTP recovery, self-service profile |
| Master Company Database (`/metadata`) | ✅ Built | ~3,560 companies seeded so far, not the "50,000+" the roadmap targets |
| Daily Tracker (`/tracker`) | ✅ Built | Core daily call-logging workflow, auto-save, soft validation |
| Weekly Tracker (`/weekly-tracker`) | ✅ Built | 6 pipeline sections (spec called for 7 — see gaps) |
| Daily Leads (`/daily-leads`) | ✅ Built | Manual, coordinator-only, deliberately not auto-synced |
| Reports & Analytics (`/reports`) | ⚠️ Partial | 4 report templates generate; real PDF/Excel/PNG export is not — CSV is currently labelled "Excel", PDF is `window.print()` |
| Dashboards (`/dashboard`) | ✅ Built | Read-only landing page |
| Team Chat (`/chat`) | ✅ Built (new) | Real-time messaging, reactions, doubt-tagging, SSE live updates — added this cycle, not in the original 10-module spec |
| System Admin | ❌ Largely unbuilt | Health/data-quality/announcements not implemented |
| Automated background jobs | ⚠️ 1 of 4 built | Only the end-of-day tracker finalization job (23:59:59 IST) runs; recycle-bin purge and two others are unbuilt because their target collections don't exist yet |
| Automated tests | ❌ None | No test directory, no test framework wired in yet |

---

## Known gaps and what blocks a release

Ordered by severity, not by module number:

1. **Security hygiene:** `backend/.env` is currently tracked in git (rotate secrets, untrack it); a couple of JWT-secret fallbacks are hardcoded rather than required from env.
2. **Data safety:** `recycle_bin` and `import_processing_history` collections don't exist yet — soft-delete restore and import audit trails can't work until they do.
3. **Background jobs:** 3 of the 4 planned cron jobs are unbuilt.
4. **Tests:** zero automated test coverage. This alone blocks sign-off per the original quality gate.
5. **Exports:** CSV/`window.print()` stand in for real PDF/Excel/PNG generation.
6. **Observability:** no request-id tracing, structured logging, rate limiting, or security headers yet.
7. **Weekly Tracker:** spec wants 7 pipeline sections including Hold-by-TPO/HR; only 6 exist and the extra two have no data source defined.
8. **Architecture:** the single `server.ts` needs decomposing into a proper layered structure — a large, deliberately-deferred change.

Full detail, plus a running log of bugs found and fixed as the team works, lives in [CLAUDE.md](./CLAUDE.md).

---

## Local setup

### Prerequisites
- Node.js 18+ and npm
- MongoDB running locally (or reachable via `MONGODB_URI`)

### Backend
```bash
cd backend
npm install
# .env needs: PORT, NODE_ENV, MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
# CORS_ORIGIN, LOG_LEVEL, SMTP_HOST/PORT/USER/PASS/FROM (for OTP email)
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:5000`, API under `/api/v1`.

### Useful backend scripts
```bash
npm run verify:policy   # fails the build if any route is missing from the RBAC policy table
npm run unlock -- <email> [newPassword]   # CLI-only recovery for a locked administrator
npm run fix:roles -- --apply              # repairs role-code drift (dry-run by default)
npm run seed:admin       # seed roles + the default admin account
npm run seed:meta        # seed the master company database
```

---

## Historical specifications

The original design documents (`version 1/`, chapter and module `.md` files, the executive roadmap, the master checklist) remain in the repo for business-intent context — they explain *why* a feature exists. They are **not** a reliable guide to current implementation status; several describe things as complete that aren't, and some describe decisions (login by username, 8-character passwords, a 6-role hierarchy, 14 collections) that were later deliberately overridden. Where a spec and the running system disagree, [CLAUDE.md](./CLAUDE.md) records which one is correct and why.

---

## Organization

* **Project:** iPOMS — Infoziant Placement Operations Management System
* **Organization:** Infoziant.
* **Repository:** [github.com/mohanaradha-13/ipoms](https://github.com/mohanaradha-13/ipoms)
