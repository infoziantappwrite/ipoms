# iPOMS — Project Brain

Infoziant Placement Operations Management System. Internal placement-operations CRM +
workflow engine + BI portal for Infoziant IT Solutions Inc.

**Read this file before answering anything about iPOMS.** It is the reconciled truth:
the specs say one thing, the running system sometimes says another, and this file records
which one wins and why. Where it and a spec disagree about *what is built*, this file is
right — it was verified against the running database and code. Where they disagree about
*what should be built*, follow the precedence chain below.

---

## 1. Precedence — how to resolve conflicting instructions

The specs contradict each other in many places. Resolve in this order, highest first:

| # | Authority | Notes |
|---|---|---|
| 1 | **A direct instruction from the user in the current conversation** | Overrides every document. Record it here afterwards. |
| 2 | **`version 1/V1_DECISIONS.md`** | Carries the explicit Precedence Clause ("where an older spec conflicts with a later approved V1 decision, the later decision wins"). |
| 3 | **Chapters 04–07** (backend, DB/API, architecture, dev standards) | Later and more concrete than the module specs. |
| 4 | **Module 01–10 specs, Chapters 01–03** | Historical business design. Level 1 = historical context, *not* implementation authority. |
| 5 | **`project_analysis.md`** | **Stale.** Written when no code existed ("GitHub repo is essentially empty"). Useful for business intent only — never for status. |

`MASTER_IMPLEMENTATION_CHECKLIST.md`, `DEVELOPMENT_ORDER.md` and the two copies of
`iPOMS_EXECUTIVE_MASTER_ROADMAP.md` (root and `version 1/module md files/` — identical)
are planning/gate documents, not design authority.

**Never cite a Level-4 spec as justification for a change without checking Levels 1–3
first.** That is how the password-policy and login-identifier regressions below happen.

---

## 2. Canonical constants — get these exactly right

| Thing | Value |
|---|---|
| Backend | `http://localhost:5000`, Express + Mongoose + TypeScript, entry `backend/src/server.ts` |
| Frontend | `http://localhost:3000`, Next.js 14 App Router + Tailwind + TypeScript |
| Database | MongoDB, **`ipoms_db`** (Chapter 04 says `ipoms` — wrong, the live DB is `ipoms_db`) |
| API base | `/api/v1` |
| Admin account | `placement_management@infoziant.com` |
| Standard password (all seeded accounts) | `iPOMS@123` — capital **P**, capital **OMS**. Not `Ipoms@123`. |
| Staff email domain | `@infoziant.com` (login auto-completes a bare username to this) |
| Role codes | `ADMINISTRATOR`, `TEAM_LEADER`, `PLACEMENT_COORDINATOR`, `TPO` — **UPPERCASE** |
| Timezone for jobs | IST (`Asia/Kolkata`) |
| Design system | Light-mode neumorphic/clay, IBM Plex Sans, Infoziant navy `#1E3A8A` |

### Password policy (user-mandated, supersedes Module 08)
Minimum **9** characters; at least one lowercase, one uppercase, one digit, and at least
one of **`@` or `.`** — and **no other special characters** (deliberate allowlist).
Single source of truth: `backend/src/lib/passwordPolicy.ts`. Mirrored, non-authoritative,
in `frontend/src/lib/passwordPolicy.ts` — **change both together.**

> Module 08 §8 says "8 characters, one special character". That is superseded. Do not
> revert to it.

### Lockout & recovery (user-mandated)
- 3 failed attempts allowed; the **4th blocks the account**.
- Blocked **staff** recover by 6-digit email OTP (10-min expiry, bcrypt-hashed, 5 attempt cap).
- Blocked **administrator** does **not** get an email OTP — recovery is server CLI only:
  `npm run unlock -- <email> [newPassword]` (`backend/src/scripts/unlockUser.ts`).
  Rationale: an email-only path locks the org out if the admin mailbox is unreachable.

---

## 3. Ground truth — what is actually built

Verified against the running database and code. Trust this over any status claim in the
roadmap (which reports several things as complete that are not).

**Collections: 12 live, not the 14 specified.**

```
assigned_work 7   audit_logs 63   colleges 24        company_metadata 3560
daily_leads 11    daily_tracker 15  notifications 6  report_library 5
roles 4           system_settings 1 users 8          weekly_tracker 8
```

- **Missing entirely:** `recycle_bin`, `import_processing_history`
- **Renamed from spec:** `assignments` → `assigned_work`; `app_settings` → `system_settings`
- `company_metadata` holds **3,560** companies. The roadmap's "50,000+" is a target,
  Module 02's "5,000–8,000" is an estimate. Neither is the current number.

**Backend:** 66 REST endpoints, all in one **~4,080-line `server.ts`**.

**Auth — three separate gates, in this order:**
1. `authenticateJWT` (`server.ts`) — *who are you?* 401. Universal across `/api/v1`
   except `/health` and `/auth/*`.
2. `authorizeRoute` (`lib/routePolicy.ts`) — *may your role do this?* 403.
   **Default-deny**: an endpoint absent from the policy table is refused, so a new route
   fails closed rather than silently opening to every logged-in user. Covers **65/65**.
3. **Ownership scoping** — *may you see this record?* `scopeToSelf()` pins a coordinator
   to their own id regardless of `?coordinator_id=`; `refuseForeignProfile()` guards
   `/profile/:id`. Role checks alone cannot do this.

Run `npm run verify:policy` after adding any endpoint — it fails the build if a route has
no policy.

**JWT:** access token, **8h**, `JWT_ACCESS_SECRET`. **Refresh token added 22 Aug 2026**:
opt-in via "Remember this device for 30 days" at login, `JWT_REFRESH_SECRET`, stateless
30-day token in an httpOnly cookie scoped to `/api/v1/auth`, sliding window (renewed on
each use via `POST /auth/refresh`), cleared by `POST /auth/logout`. No DB-backed
revocation list — matches the rest of this app's stateless-JWT model.
**Jobs:** 1 of 4 (`finalizeDailyTracker`, 23:59:59).
**Tests:** none. No test directory, no test script, no framework.

---

## 4. Spec ↔ reality divergence ledger

Every row is a real, verified gap. When you touch one of these areas, read the row first.

| # | Spec requires | Reality | Verdict |
|---|---|---|---|
| 1 | Strict 3-tier `Controller → Service → Repository` in `controllers/ services/ repositories/ routes/ validators/ middleware/` (Ch.6 §1.3, Ch.7 §7.1.1 #2/#4/#10, V1_DECISIONS §1.3) | One ~4,080-line `server.ts`. None of those directories exist. | **Largest architectural debt.** Refactoring is a big, risky change — propose it, never start it unasked. |
| 2 | Dual-token JWT: 15-min access + 7-day HTTP-only refresh cookie | 8h access token + **opt-in 30-day httpOnly refresh cookie (added 22 Aug 2026)**, stateless, sliding window | **Closed**, on different numbers than the spec (8h/30d vs 15min/7d) — a deliberate choice, not an oversight. |
| 3 | 14 collections | 12 (see §3) | `recycle_bin` and `import_processing_history` unbuilt → soft-delete restore and import audit cannot work |
| 4 | 4 cron jobs (00:00, 02:00, 02:30, 03:00 IST) | 1 job at 23:59:59 | 3 unbuilt. Two of them purge collections that don't exist yet. |
| 5 | Weekly Tracker **7** sections incl. *Hold by TPO* and *Hold by HR* (Ch.6 §1.3 Recon #2) | Enum has **6**: `pipeline, in_progress, completed, top_companies, rejected_by_hr, rejected_by_college` | The Weekly Placement **Report** needs Holds-by-TPO/HR sections that have **no data source**. |
| 6 | Login by **username** (Ch.1 §7.2, M01 §6.2, M08 §16) | Login by **email**, with `@infoziant.com` auto-complete | **Email is correct** — later user decision. Specs are stale. |
| 7 | Password: 8 chars, any special (M08 §8) | 9 chars, only `@` and `.` | **Implementation is correct** — later user decision. |
| 8 | `role_code` lowercase regex `/^[a-z0-9_]+$/` (Ch.5 §5.5); Ch.4 lists 6 codes incl. `director`, `ceo` | 4 UPPERCASE codes | **UPPERCASE 4-role set is correct** (roadmap + live DB + all code). Ch.5's regex and Ch.4's list are stale. |
| 9 | Error envelope `{success, error:{code, message, details, requestId}}` (Checklist §4) vs `{success, statusCode, errorCode, message, errors[]}` (Ch.5 §5.3) | Code uses the **Checklist** shape, minus `requestId` | Checklist shape wins. `requestId` tracing is unbuilt. |
| 10 | `x-request-id` on every request, Winston JSON logs, Helmet, rate limiting | Not implemented | Open gap (Ch.7 §7.3, Checklist §4) |
| 11 | Endpoints `kebab-case` plural (Ch.7 §7.1.6) | Mixed: `/daily-leads` ✓ but `/metadata`, `/assigned-work/:id/complete` | Cosmetic; don't churn URLs without a reason |
| 12 | Files `kebab-case.tsx`, backend `camelCaseController.ts` (Ch.7 §7.1.2) | Frontend uses `PascalCase.tsx` throughout | Codebase-wide; follow the **existing** convention, not the spec |
| 13 | ≥80% unit coverage, Supertest RBAC suites, 7 E2E journeys (Ch.7 §7.4) | Zero tests | Blocks the Phase-8/9 gate outright |
| 14 | No secrets in source (Ch.7 §7.1.1 #9) | `JWT_ACCESS_SECRET` has a hardcoded fallback in `authRoutes.ts:34` and `authMiddleware.ts:4`; **`backend/.env` is committed to git** | Real security issue — see §5 |

---

## 5. Live traps — verified, currently biting

0. ~~**Unauthenticated privilege escalation via `POST /auth/signup`.**~~ **FIXED
   21 Aug 2026 — was the single most severe finding in this project.** The public,
   unauthenticated signup endpoint read `role_codes` straight from the request body.
   `curl -X POST /api/v1/auth/signup -d '{...,"role_codes":["ADMINISTRATOR"]}'` created a
   real, working Administrator account with full org-wide access — verified live (opened
   the admin dashboard, then deleted the account). Fixed in `authRoutes.ts`: signup now
   always forces `role_codes = ['PLACEMENT_COORDINATOR']` and ignores anything the client
   sends, per Module 08 §12/§16 ("users should never see \[role] options... signup page
   shows only Placement Coordinator"). If anyone ever reports an unexplained admin
   account, this is the first thing to suspect had been exploited before the fix.
0b. ~~**Unauthenticated destructive endpoints + Team Leader → Administrator escalation.**~~
   **FIXED 25 Aug 2026.** Two separate holes, both now closed and verified with live requests:
   (a) `isPublic()` — in **both** `server.ts` and `routePolicy.ts`, which must stay in step —
   allowlisted `/weekly-tracker-import*`, whose routes call `WeeklyTracker.deleteMany({})` and
   re-import from a caller-supplied file path. Anyone reachable on the network could empty the
   weekly tracker with no token. Separately `GET /health/daily-leads-diagnostics` is registered
   *above* the `app.use('/api/v1', authenticateJWT)` mount, so the global gate never saw it, and
   it deleted colleges and reassigned `college_id` on **every plain GET**. Both are now
   ADMINISTRATOR-only (the diagnostics route carries its own per-route middleware because of
   its position), and all its mutations sit behind `?resync=true`.
   (b) `POST /users` and `PATCH /users/:id` admit `TEAM_LEADER` and wrote `role_codes` straight
   from the body — a Team Leader could PATCH themselves to `ADMINISTRATOR`. Now guarded by
   `refuseRoleEscalation()` / `assignableRoles()` in `routePolicy.ts`: an Administrator may
   grant anything, a Team Leader only `PLACEMENT_COORDINATOR`/`TPO`. A second check refuses
   editing an account that already outranks you, so a TL cannot demote or lock out the admin
   either. `POST /users` also defaulted `role_codes` to the drifted `COORDINATOR` alias —
   now `PLACEMENT_COORDINATOR`. **`npm run verify:policy` is now 78/78 with one public route.**
0c. ~~**`GET /colleges` published the staff directory anonymously.**~~ **FIXED 25 Aug 2026.**
   It was in `isPublic()` and populated `assigned_coordinator_ids` with
   `full_name official_email primary_mobile`, so an unauthenticated request returned every
   coordinator's work email and personal mobile. Now authenticated (`STAFF_AND_TPO`), and the
   populate is **removed entirely** — no frontend caller ever read that field (all 10 call sites
   use `apiFetch`, so nothing needed the route public). Two more bugs fixed in the same handler:
   it looped 23 `College.findOne` + `create`/`save` on **every request** (a write on every read),
   now a single `estimatedDocumentCount()` guard that seeds only when the roster is empty; and
   its filter was an `$or` whose `is_deleted: {$ne: true}` clause matched nearly everything,
   so `inactive`/`on_hold` colleges were returned — now `{ status: 'active' }`.
   **Still open:** the handler's own comment promises coordinator-scoped results, but that was
   never enforced. It cannot be turned on until `users.assigned_college_ids` is corrected —
   every account currently holds all 25 colleges (fallout from the boot bug in trap 10) except
   Lizenya R, who has 0 and would see an empty app. A coordinator should hold 3, max 4.
1. ~~**Role-code drift corrupts RBAC.**~~ **FIXED 21 Aug 2026.** `users.role_codes` held
   values absent from `roles` (Sujitha `TEAM_LEAD`, two accounts `COORDINATOR`), so an
   active Team Leader silently failed every Team Leader check. Repaired with
   `npm run fix:roles -- --apply` (`scripts/fixRoleCodes.ts`, dry-run by default).
   `routePolicy.normalizeRole()` also maps these aliases at request time as a safety net —
   that net is *not* the fix; stored data must still say what it means, or every future
   query and report over `role_codes` inherits the drift. Re-run the script if drift reappears.
2. **`backend/.env` is tracked in git** — real SMTP and JWT values are in history.
   `git rm --cached backend/.env`, rotate the secrets, and remove the hardcoded JWT fallbacks.
3. **`frontend/.next/` is tracked in git** (38 files). Git and webpack writing the same
   directory is the likely cause of the recurring Windows `.next` corruption
   (`UNKNOWN: unknown error, errno -4094`). `git rm --cached -r frontend/.next`.
4. **`.next` corruption recovery** (happens often on this machine): stop the dev server →
   delete `frontend/.next` → restart. It is not a code error; typecheck will still pass.
   Tailwind **config** changes also need a server restart, not just a rebuild.
5. **Most frontend components bypass `apiFetch`.** `frontend/src/lib/api.ts` injects the
   JWT and handles 401s, but several components call bare `fetch()` → live 401s.
   `settings/page.tsx` and `settings/components/UserModal.tsx` were **fixed 21 Aug 2026**
   (see item 6). `AppSidebar` and `NotificationBellDropdown` are **still broken** — use
   `apiFetch` for every new call, and fix these two when you're next in that area.
6. ~~**Profile section (`/settings`) was entirely non-functional for every non-admin
   user.**~~ **FIXED 21 Aug 2026.** `settings/page.tsx` bootstrapped `currentUser` by
   bare-`fetch()`-ing `GET /users` (Team-Leader/Admin only under the new route policy,
   and unauthenticated anyway) — `currentUser` stayed `null` forever, so both "Update
   Profile" and "Update Password" failed with a hardcoded "No active profile found."
   Reproduced live as a coordinator, then fixed: the page now sources `currentUser` from
   `GET /profile/:id` (self-readable by anyone) via `apiFetch`, and only calls `GET /users`
   when the session role is Team Leader/Admin. Two more bugs found in the same area, also
   fixed: (a) `PATCH /profile/:id` hashed and stored any 9+ character password with no
   policy check — `isPasswordValid`/`firstPasswordError` are now called, matching signup
   and reset-password; (b) the endpoint set `is_profile_locked = true` unconditionally on
   *any* PATCH, so a password-only change (which the UI presents as separate, with no
   warning modal) silently locked the coordinator's own contact fields too — it now locks
   only when a personal-detail field was actually part of the request.
   Also: `UserModal.tsx`'s "Placement Coordinator" dropdown option had `value="COORDINATOR"`
   (the same drifted alias, not just a JS default) — every admin-created coordinator got
   the wrong role code through this form. Fixed to `PLACEMENT_COORDINATOR`.
7. **`College` has no `is_deleted` field**, yet code queries
   `College.countDocuments({ is_deleted: false })` → always 0.
8. **Excel export is real; PDF is not.** `frontend/src/lib/exportExcel.ts` uses the `xlsx`
   library and produces genuine `.xlsx`. **PDF is still `window.print()`** in three places
   (`NativeReportEditor.tsx:394`, `universalExport.ts:230`, `activeLeadsExport.ts:226`), and
   `NativeReportEditor` also writes an HTML `<table>` labelled `.xls` with unescaped values —
   a company name containing `&` corrupts that file. PNG export is unbuilt.
9. **`--fg-subtle` must clear AA on `--surface-sunken`, not just white.** It was `#64748B`
   (4.34:1 on sunken — failing); now `#5D6B80` (4.94:1). Judge foreground tokens by their
   worst surface.
10. ~~**Every server restart destroyed live data.**~~ **FIXED 25 Aug 2026 — this was the most
    destructive bug found in the project.** `startServer()` ran five seed routines that each
    began by emptying their collection (`DailyLead` positives, `DailyLead` jd_received,
    `ActiveLead`, `WeeklyTracker`, and all 3,560 of `CompanyMetadata`), then refilled from
    hardcoded arrays and Excel files in `C:\Users\admin\Downloads`. Separately,
    `ensureDefaultAccounts()` rewrote every seeded user's `password_hash` and forced
    `failed_login_attempts=0`, `is_password_locked=false`, `is_profile_locked=false`,
    `is_deleted=false` — so **a restart silently undid the 3-strike lockout, profile locks,
    password changes and user soft-deletion**, and re-linked every coordinator to every college.
    Now: the five seeds are gated behind **`SEED_ON_BOOT=true`** and the account rewrite behind
    **`RESET_ACCOUNTS_ON_BOOT=true`**, both default-off (`server.ts:52-66`). Existing accounts
    are left alone apart from repairing an empty `role_ids` link, derived from the user's *own*
    `role_codes` so an admin's role change survives; only accounts created on that boot get
    linked to colleges. `startServer()` now has a `.catch()` that exits non-zero instead of
    leaving the process alive with no listener. Verified by snapshotting all collection counts
    and the admin password hash across a restart — identical. **Never re-enable either flag
    against a database with real data, and never add a new destructive routine to boot.**

---

## 6. Module map

Data flow: `company_metadata → assigned_work → daily_tracker → weekly_tracker → daily_leads → reports/dashboards`

| # | Module | Route | Essence |
|---|---|---|---|
| 01/08 | User & Access | `/login`, `/signup`, `/settings` | Email login, 3-strike lockout, OTP reset. Coordinators self-register; TL/Director/CEO created by admin. |
| 02 | Master Company DB | `/metadata` | Not a CRM — an Excel-like repository. Identity is **company name only**. One company → unlimited HR contacts. Duplicate = same Company+HR+Mobile+Email (blocked); differing only by email → allowed after confirm. |
| 03 | Daily Tracker | `/tracker` | The heartbeat. ~50–70 calls/day. Read-only contact picker (never free-text search). Start Time manual (Spacebar), End Time + Duration automatic and locked. Auto-save + `Save Progress`; auto-finalize 23:59:59. **Soft validation — warn, never block.** |
| 04 | Weekly Tracker | `/weekly-tracker` | Placement lifecycle. One master dataset, sections derived from status — nobody moves rows by hand. Status is **free text**, not a dropdown (deliberate). Follow-up colour: green >7d, yellow ≤3d, red today/overdue. Friday–Friday weeks. |
| 05 | Daily Leads | `/daily-leads` | Two tabs, Positives / JD Received, identical columns. **Deliberately manual** — never auto-sync. Coordinator-only write; everyone else read-only. Remembers last active tab. |
| 06 | Reports & Analytics | `/reports` | 4 templates (Weekly, Monthly, College, Coordinator). Report edits are **presentation-only and never mutate operational records**. Reports are never stored — exported to the user's machine. Every generation writes an audit log. |
| 07 | Dashboards | `/dashboard` | Landing page. **Inform and route — never a data-entry screen.** Order: Greeting → Notifications → Assigned Work → Priority College → Today's Tasks (max 3) → KPIs. Live, non-editable, minimal. **Quick Nav shortcut cards removed 22 Aug 2026** (user decision) — the left sidebar already covers module navigation; the coordinator dashboard no longer duplicates it. **Observations/Insights section also removed 22 Aug 2026** (user decision). |
| 09 | Settings | `/settings` | **Customises appearance, never business logic.** |
| 10 | System Admin | — | Director/CEO only. Health, data-quality, announcements. Largely unbuilt. |

### RBAC essentials
- **TPO** is external and read-only: only the finalized Weekly Placement Report for their
  own `college_id`. Enforce at frontend route + API + middleware.
- **Coordinator** sees only their own colleges, work, KPIs, follow-ups. No cross-coordinator visibility.
- Only Admin hard-purges. Coordinators may restore what they themselves deleted (Ch.6 Recon #3).
- A coordinator normally handles **3** colleges, max 4.

---

## 7. Working rules

- **Verify before asserting.** This project's docs overstate completion. Query the DB or
  read the code; don't repeat a roadmap claim.
- **Follow existing code conventions over Chapter 7** where the codebase already diverged
  consistently (file casing, component naming). Consistency beats a stale spec.
- **Tokens only.** Components use semantic Tailwind tokens (`bg-surface`, `text-fg-subtle`,
  `shadow-2`, `rounded-panel`) — never raw palette (`text-cyan-400`, `indigo-950`).
  3 layers: CSS vars → semantic tokens → component utilities.
- **Icons are drawn** (lucide), never emoji. Emoji are font-dependent glyphs, not an icon system.
- **Never weaken auth, audit, or the password policy** to make something pass.
- **Audit logs are immutable** (`updatedAt: false`, no TTL) and must contain **zero
  credentials** — no passwords, hashes, or OTP values, ever.
- Soft-delete everywhere on business records; hard delete is admin-only.

### Verification recipes

```bash
# Get a JWT (backend must be running)
curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"placement_management@infoziant.com","password":"iPOMS@123"}'
```

```bash
# Typecheck both sides
cd backend && npx tsc --noEmit -p tsconfig.json && cd ../frontend && npx tsc --noEmit -p tsconfig.json
```

> Note: on Windows, piping API JSON through `python` re-encodes it as cp1252 and fakes
> mojibake (`â€"` for `—`). The wire bytes are fine. Inspect raw bytes before reporting an
> encoding bug.

---

## 8. Release gate — what still blocks production

Ordered by severity, not by phase number.

1. **Security:** untrack + rotate `backend/.env`; remove hardcoded JWT secret fallbacks.
   *(RBAC and role-code drift — done 21 Aug 2026, see §3 and §5.)*
2. **Data safety:** build `recycle_bin` (+90-day TTL) and `import_processing_history`.
3. **Jobs:** add the 3 missing crons.
4. **Tests:** there are none. ≥80% unit + Supertest RBAC + the 7 E2E journeys are a
   documented gate — this alone blocks Phase 8/9 sign-off.
5. **Exports:** real PDF / Excel / PNG.
6. **Observability:** `x-request-id`, Winston JSON logs, Helmet, rate limiting.
7. **Weekly Tracker:** decide 6 vs 7 sections; the report's Hold-by-TPO/HR sections have no source.
8. **Architecture:** decompose `server.ts` into the 3-tier layout.

### The 7 critical business journeys (must pass before launch)
1. Daily call logging → Save Progress → weekly pipeline ingestion
2. Daily Leads positive → Move to JD Received
3. Company DB search → batch Excel import with partial errors (95 ok / 5 isolated)
4. Weekly Tracker update → follow-up urgent view → completed offers
5. Report build → generate → presentation edit → regenerate → PDF/Excel/PNG
6. Soft-delete → recycle bin → 1-click restore
7. Forgot-password recovery with rate limiting

---

## 9. Keeping this file true

This brain is only useful while it is accurate. When you change something it describes —
a divergence closed, a trap fixed, a new decision from the user — **update this file in the
same change**. A stale brain is worse than none, because it is trusted.
