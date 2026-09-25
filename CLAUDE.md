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
| Role codes | `ADMINISTRATOR`, `TEAM_LEADER`, `PLACEMENT_COORDINATOR` — **UPPERCASE**. (`TPO` removed 29 Aug 2026 — see §5.) |
| Timezone for jobs | IST (`Asia/Kolkata`) |
| Design system | Neumorphic/clay, IBM Plex Sans, Infoziant navy `#1E3A8A`. Light and dark both ship; dark uses a **rim-light** elevation model, not the light theme's cast shadow — see §5 item 13 |

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
**Jobs:** was documented as 1 of 4 at `23:59:59` — **wrong, corrected 6 Sep 2026.**
`finalizeDailyTracker.ts` actually runs two cron jobs: 5:00 AM IST (dashboard analytics
refresh) and 6:00 AM IST (finalizes/locks yesterday's Daily Tracker rows). A third job,
`positiveSyncReminder.ts` (8:00 PM + 10:00 PM IST), was added 6 Sep 2026 — see §5 item 35.
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
| 10 | `x-request-id` on every request, Winston JSON logs, Helmet, rate limiting | **Helmet is wired** (`server.ts`, confirmed live 22 Sep 2026 — CSP/HSTS/X-Frame-Options/COOP/CORP all present on a real response). `x-request-id`, structured logging, and rate limiting are still genuinely missing. | Partially closed — see §5 item 44 |
| 11 | Endpoints `kebab-case` plural (Ch.7 §7.1.6) | Mixed: `/daily-leads` ✓ but `/metadata`, `/assigned-work/:id/complete` | Cosmetic; don't churn URLs without a reason |
| 12 | Files `kebab-case.tsx`, backend `camelCaseController.ts` (Ch.7 §7.1.2) | Frontend uses `PascalCase.tsx` throughout | Codebase-wide; follow the **existing** convention, not the spec |
| 13 | ≥80% unit coverage, Supertest RBAC suites, 7 E2E journeys (Ch.7 §7.4) | Zero tests | Blocks the Phase-8/9 gate outright |
| 14 | No secrets in source (Ch.7 §7.1.1 #9) | ~~`JWT_ACCESS_SECRET` had a hardcoded fallback~~ **FIXED 30 Aug 2026** — see §5 item 2. `backend/.env` was already untracked in an earlier commit (`c549425`), not currently committed. |  |

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
   **Kept as history after self-registration was removed entirely (20 Sep 2026, see item 41)**
   — the endpoint this describes no longer exists at all (`403` unconditionally), so this is
   fully moot operationally. Left in deliberately: it's the sharpest illustration in this file
   of what trusting client-supplied `role_codes` costs, and that lesson outlives the feature.
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
0d. ~~**Four `/metadata/*` data-repair endpoints were reachable with no account at all.**~~
   **FIXED 29 Aug 2026.** `/metadata/empty-mobiles`, `/metadata/import-unique-companies`,
   `/metadata/export-missing-excel`, `/metadata/renumber` bypassed auth at **two** layers
   simultaneously: `authMiddleware.ts`'s `authenticateJWT()` had its own hardcoded exemption
   list skipping the token check for these four paths (separate from and in addition to
   `routePolicy.ts`'s `isPublic()`, which also exempted them from the role table). Verified
   live before the fix: an anonymous `POST /metadata/renumber` with no Authorization header
   returned 200. Worst of the four: `import-unique-companies` runs
   `CompanyMetadata.deleteMany({serial_number: {$gte: 3574}})` then re-imports from
   `C:\Projects\iPOMS\unique_companies_list.xlsx` — a path that only exists on this laptop,
   so once deployed the delete would succeed and the reimport would silently fail, losing
   ~233 company records with nothing to replace them. Both exemption lists removed; all four
   routes are now ADMINISTRATOR-only via the policy table. Verified live in all three states:
   anonymous → 401, authenticated coordinator → 403, administrator → 200.
   **`npm run verify:policy` is now 79/79 with one public route.**
0e. ~~**`GET /daily-leads` rewrote 6 companies' `college_id` on every call.**~~
   **FIXED 29 Aug 2026.** This is the app's busiest read endpoint, and it unconditionally ran
   `DailyLead.updateMany({company_name: {$in: [...6 names...]}}, {$set: {college_id: ngceId}})`
   on every single call — so if a coordinator manually corrected one of those 6 companies to a
   different college, the next page load anywhere in the app silently reverted it back to NGCE.
   The repair is gone from the hot path entirely (a GET must never mutate as a side effect);
   the same fix is still available, opt-in, via `GET /health/daily-leads-diagnostics?resync=true`
   (administrator only, per trap 0a). Verified live: 3 consecutive calls, no mutation, college
   count unchanged.
0f. ~~**Four handlers were missing `scopeToSelf()`.**~~ **FIXED 29 Aug 2026.**
   `GET /daily-leads`, `GET /assigned-work`, `GET /daily-leads/daily-tracker-positives`, and
   `GET /notifications` all took `coordinator_id`/`user_id` straight from the query string with
   no ownership check — any coordinator could read another's leads, assigned work, positive
   calls, or targeted notifications by passing a different id. All four now call `scopeToSelf()`,
   matching the pattern already used elsewhere (`routePolicy.ts`). Verified live: a coordinator
   passing a colleague's id gets only their own data back, with or without the param; an
   administrator naming a specific coordinator still gets that coordinator's real data (the
   supervisor override still works).
0g. ~~**Three screens told the user something untrue.**~~ **FIXED 29 Aug 2026.**
   (a) *Weekly Tracker week navigation* — the prev/next arrows relabeled the header but never
   changed the fetched rows; every offset silently showed the same full dataset. The label math
   was also wrong on its own terms: it computed calendar weeks (1st–7th, 8th–14th...) instead of
   the Friday–Thursday weeks every row is actually stored against (`week_start_date`/`week_number`
   from `getFridayWeekBounds()`). Fixed both ends: `GET /weekly-tracker` and
   `GET /weekly-tracker/kpi` now accept `week_offset` and filter by the real Friday–Thursday
   range when it's non-zero — offset 0 ("Current") deliberately still shows the full master
   dataset unfiltered, so existing usage doesn't silently shrink. `formatWeekDisplay()` in
   `WeeklyHeader.tsx` now computes the same Friday–Thursday boundary as the backend, so the
   label matches what's actually fetched. Verified live: current week correctly shows
   "28 Aug – 3 Sept 2026 · Week 35" (today is Sat 29 Aug); non-current offsets return genuinely
   different (in this case empty) result sets; KPI totals stay consistent with the row count.
   (b) *Metadata export* — shipped 50 rows under an `iPOMS_Master_Company_Metadata` filename
   regardless of the real total (3,807+), because `handleExport()` mapped straight from the
   paginated table state (`limit=50`). Now loops the same endpoint at `limit=500` (the server
   cap) until every row matching the current filters is fetched, then exports that. Verified
   live via network trace: 8 sequential requests (pages 1–8 at 500/page) covering all ~3,807
   records, stopping exactly at completion — no over-fetch, no infinite loop.
   (c) *Ctrl+S on Metadata* — dispatched the shared "Auto-Saved / All changes permanently
   synchronized in cloud" banner while only calling `loadMetadata()`, a read; the page has no
   inline-editable cells; every contact edit already saves immediately through its own modal.
   Weekly Tracker's identical-looking Ctrl+S banner is legitimate by contrast — its cells commit
   real edits via `onBlur`, so blurring the active element before refreshing genuinely flushes
   pending saves. Root cause: `AutoSaveFloatingIndicator` accepted a custom message override in
   its own signature but silently dropped it, always rendering the hardcoded text. Now the
   override actually works; Metadata dispatches `{title:'Refreshed', subtitle:'Metadata list
   re-fetched from the server'}` instead. Verified live: Metadata's Ctrl+S now shows "Refreshed
   · Metadata list re-fetched from the server"; Weekly Tracker's is unchanged, still "Auto-Saved
   · All changes permanently synchronized in cloud" — confirmed the fix didn't touch the
   legitimate case.
0h. ~~**TPO was a broken, unusable account type.**~~ **REMOVED 29 Aug 2026 (user decision, not a
   bug fix).** The spec called for an external, read-only TPO role scoped to a college's
   finalized Weekly Placement Report, but no frontend experience was ever built — `RoleKey` in
   `frontend/src/lib/session.ts` never included `'tpo'`, so any TPO account fell through to
   `roleOf()`'s default and got the full internal coordinator dashboard, which the backend then
   correctly 403'd on every real request. Rather than build the missing frontend, the user chose to remove TPO entirely until it's
   worth building for real. Confirmed zero live accounts held the role before removing anything.
   Removed: `TPO` from `RoleCode`, `ROLE_ALIASES`, `assignableRoles()` grants, and the
   `/colleges` policy (now plain `STAFF` — also fixed a duplicate `/colleges` policy entry found
   in the process, dead code since `.find()` only ever matched the first); the role-selection
   dropdown in `UserModal.tsx`, the role filter and styling in `UserManagementTab.tsx`, and the
   TPO column in `RoleMatrixTab.tsx`; the TPO entry in both role-seeding paths
   (`server.ts`'s `ensureDefaultAccounts` and the standalone `seedRolesAndAdmin.ts` script); and
   the now-orphaned TPO document in the `roles` collection itself. Left untouched: every
   non-role "TPO" reference — `College.tpo_name`/`tpo_contact_mobile` (a college's real
   placement-office contact, unrelated to iPOMS accounts), and business-vocabulary strings like
   "Awaiting TPO Approval" and "Rejected by TPO" in status text and report labels. Verified
   live: assigning `role_codes:["TPO"]` now fails as `Unknown role code` (400) rather than merely
   insufficient permission; `/roles` returns exactly the 3 remaining codes; the Add User dropdown,
   User Management role filter, and RBAC matrix all confirmed TPO-free in a live browser session.
   Full re-add path is documented in the `RoleCode` comment in `routePolicy.ts`.
0i. ~~**The RBAC matrix on Settings → Role Permissions Matrix was wrong on 5 of 15 rows.**~~
   **FIXED 29 Aug 2026 — display only, no permission change.** `RoleMatrixTab.tsx` is a
   hand-maintained table with no live connection to `routePolicy.ts`'s `POLICIES` table, and
   had drifted: it showed Coordinator as unable to Export Reports, Delete/Archive Company
   Records, and Restore from Recycle Bin, and Team Leader as unable to do User & Coordinator
   Management — all four were already true in the real enforced policy (`STAFF`/`TL_ADMIN`
   roles on the relevant routes), just displayed wrong. It also claimed Administrator has
   "View Governance & Audit Trail" — no audit-log viewing endpoint exists for any role.
   Corrected the 4 booleans and replaced the false audit-trail row with a footnote stating
   the feature isn't built. User explicitly confirmed the direction first ("Coordinators
   should keep all four — just fix the sign") after I flagged that the two possible fixes
   (correct the display vs. actually restrict real permissions to match the wrong display)
   point opposite ways — always ask before touching a permissions display, since the wrong
   choice either strips access or fakes doc compliance. Verified live in an Administrator
   session (the tab is Administrator-only — `isAdmin && activeSection === 'roles'` in
   `settings/page.tsx`, `forCoordinator: false` in `SettingsNav.tsx`): all 5 corrections
   render as intended. Re-verify against `POLICIES` before trusting this table again next
   time a permission rule changes — it has no automated link to reality.
2. ~~**Hardcoded JWT secret fallback in 4 files.**~~ **FIXED 30 Aug 2026.** `server.ts`,
   `authMiddleware.ts`, `authRoutes.ts`, and `scripts/verifyAuthMiddleware.ts` all fell back
   to the identical literal `'ipoms_dev_access_secret_super_secure_key_2026'` (access) /
   `'ipoms_dev_refresh_secret_super_secure_key_2026'` (refresh) whenever `JWT_ACCESS_SECRET`/
   `JWT_REFRESH_SECRET` was unset — anyone who had read this source could forge a valid
   Administrator JWT the moment either var went missing in any environment. All four now
   throw at module load if the corresponding env var isn't set (fail fast, no silent
   fallback); `authRoutes.ts` also no longer keeps its own copy of `JWT_ACCESS_SECRET` — it
   imports the one exported from `authMiddleware.ts`, and `server.ts`'s copy was dead code
   (never read anywhere) so it was deleted outright rather than fixed. Verified: `tsc --noEmit`
   clean, server boots against the real `.env`, and a live login → authenticated `/settings`
   request round-tripped a real token through the new import path successfully.
   **`backend/.env` itself was already untracked** in an earlier commit (`c549425`) — not
   currently a live gap, though anything in it before that commit is still in git history and
   should be treated as compromised if it hasn't been rotated.
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
11. **Organization Announcement Broadcaster removed entirely (user decision, 30 Aug 2026) —
    not a bug fix.** The feature (Settings → System Config's "Organization Announcement
    Broadcaster" form, plus a duplicate mini-editor in `AdminSystemHealthWidget.tsx` on the
    admin dashboard) let an Administrator write/save an announcement, but **nothing ever
    displayed it** — no coordinator or Team Leader screen read `announcement_message`/
    `announcement_is_published`; the "Publish to All Portals" toggle did nothing downstream.
    Rather than build the missing display, the user chose to remove the concept entirely.
    Removed: the `announcement_title`/`announcement_message`/`announcement_start_date`/
    `announcement_end_date`/`announcement_is_published`/`system_announcement_banner` fields
    from `SystemSettings.ts` (schema + interface); all reads/writes of them in `GET`/
    `PATCH /api/v1/settings` and `GET /api/v1/dashboard/admin` in `server.ts`; the announcement
    section of `SystemConfigTab.tsx`; the announcement mini-editor in
    `AdminSystemHealthWidget.tsx`; and the stale values from the live `system_settings`
    document itself (one-time `$unset`). Verified: both `tsc --noEmit` clean, server boots
    against the real `.env`, and a live `GET /settings` response contains no `announcement*`
    key. ~~A separate, unrelated "Broadcast Announcement" feature existed at
    `BroadcastModal.tsx`~~ — **removed 3 Sep 2026, see §5 item 27.** Correction to what this
    entry said at the time: it was never actually a live, clickable, 404-ing button — the
    whole `/notifications` page was already `redirect('/dashboard')`, so the component holding
    it was unreachable dead code, not a reachable bug. Deleted rather than fixed.
12. ~~**Administrator could self-recover by email OTP, contradicting the documented CLI-only
    policy.**~~ **FIXED 30 Aug 2026.** §2's "Lockout & recovery" rule says a blocked
    Administrator has no email-OTP path specifically so a compromised admin mailbox can't be
    used to take over the account. `authRoutes.ts` already defined an `isAdmin()` helper
    (line 98) but never called it — `POST /auth/request-otp`, `/auth/verify-otp`, and
    `/auth/reset-password` had zero role check, so any account including Administrator could
    request and use an email OTP. Verified live before the fix:
    `POST /auth/request-otp {"email":"placement_management@infoziant.com"}` returned
    `success:true` and actually emailed a code. Now all three handlers call `isAdmin()` and
    refuse with `403 ADMIN_OTP_DISABLED` pointing to `npm run unlock` instead; coordinator/Team
    Leader accounts are unaffected (re-verified live — Sujitha's OTP request still succeeds).
13. **Dark theme rebuilt at the token layer, 30 Aug 2026 — `globals.css` `.dark` block only,
    zero component files touched, light mode byte-for-byte unchanged** (re-verified live:
    primary still `#1E3A8A`, white-on-primary still 10.36:1, original cast-shadow elevation
    intact). Three things were wrong and are now fixed:
    (a) *Elevation didn't exist.* `--neu-dark` was `#020617` cast onto a `#090D16` page — a
    shadow darker than its own background by an imperceptible amount. Measured live: **21 of
    1,442** elements on the dashboard carried any shadow, **0 of 138** on Weekly Tracker. Dark
    mode now uses a **rim-light** model — a 1px inset highlight on the top edge carries the
    depth, the shadow only anchors it, and the rim strengthens 0.045→0.09 across the four
    steps. **This inverts the light theme deliberately; do not "restore symmetry" by porting
    the light cast-shadow back.** Debossed variants move the rim to the bottom edge.
    (b) *Surfaces and borders were invisible.* page↔card was 1.10:1, page↔sunken 1.02:1, and
    `sunken` was **lighter** than `background` (so a recessed toolbar read as raised). Borders
    were 1.22:1 / 1.58:1, far under WCAG 1.4.11's 3:1 — combined with (a), cards had no
    perceivable edge from either shadow or stroke. Now: card 1.16:1 vs page, sunken correctly
    below card, `--border` 1.85:1 (decorative), **`--border-strong` 3.31:1 — use this one for
    any edge that carries meaning** (inputs, real dividers); `--input` points at it.
    (c) *Primary had drifted off-brand.* Dark primary was `#3B82F6` = hsl(**217°**, 91%, 60%) —
    stock Tailwind blue-500, 7° off Infoziant navy's hsl(**224°**, 64%, 33%). Now `#5580F5`,
    hue 224 — the same navy, lit for a dark canvas. `--accent`/`--primary-hover` likewise.
    **Known unresolved conflict, deliberately left:** `--primary` is used as text 315× (wants a
    light value) and as a button fill under a *hardcoded* `text-white` 91× (wants a dark one).
    Both cannot pass AA from one token — the crossover where the ratios meet is 4.10:1, short
    of 4.5. It is tuned for the dominant caller (text, 4.64:1 ✓); `--primary-foreground` stays
    white on purpose so the 91 buttons don't end up beside 7 dark-label ones. **The real fix is
    a component sweep replacing hardcoded `text-white` with `text-primary-foreground`, after
    which this token flips to a dark foreground.** Until then white-on-primary is 3.63:1
    (was 3.68:1 — unchanged, not a regression).
    Still open from the same audit, untouched: ~1,464 unpaired raw-palette classes in live
    components (20 files use `text-slate-800/900` with no dark variant — near-black text that
    vanishes on a dark page); hardcoded light-mode button shadows at the bottom of
    `globals.css`; `.apple-glass` using `backdrop-filter` in direct contradiction of the
    "no glassmorphism anywhere" rule stated in the same file; scrollbars globally killed with
    `!important`, which makes the styled scrollbar block above it dead code.
14. ~~**Metadata restore had no ownership check.**~~ **FIXED 3 Sep 2026.** Any coordinator could
    restore any deleted company record, not just their own — the documented rule
    ("Coordinators may restore what they themselves deleted") was never enforced, and the
    schema didn't even track who deleted a record. Added `deleted_by` to `CompanyMetadata`
    (set on delete, cleared on restore); the restore handler now calls
    `refuseForeignOwner(req, res, record.deleted_by)` — Admin/Team Leader (`isSupervisor`)
    may still restore anything, a Coordinator only their own. Verified live: Mohanaradha
    deleted a record, Lizenya's restore attempt got `403 FORBIDDEN_NOT_OWNER`, Mohanaradha's
    own restore succeeded, and Admin's supervisor-override restore succeeded too.
15. ~~**Daily Leads write access was not Coordinator-only, and had no ownership scoping.**~~
    **FIXED 3 Sep 2026.** Contradicted Module 05 ("Coordinator-only write; everyone else
    read-only") on two counts: `routePolicy.ts` gated `/daily-leads*` to `STAFF` (all three
    roles, every method), and the handlers took `coordinator_id` straight from the request
    body with no check, so a Team Leader could create or delete a lead attributed to any
    coordinator. Split the policy: POST/PATCH/DELETE now require `PLACEMENT_COORDINATOR`
    specifically (GET stays `STAFF`); the create handler ignores any client-supplied
    `coordinator_id` and always attributes to the caller; the edit, move-to-JD, and delete
    handlers each added `refuseForeignOwner()` against the lead's real `coordinator_id`.
    Verified live: Team Leader's POST now gets `403`; a coordinator's spoofed
    `coordinator_id` in the request body is silently ignored and the record is correctly
    attributed to the real caller instead.
17. ~~**Weekly Tracker and Daily Leads search crashed (500) on regex special characters.**~~
    **FIXED 3 Sep 2026.** Both endpoints passed the raw `search` query straight into
    `$regex` with no escaping — a bare `(`, ordinary in real company names ("ABC (India) Pvt
    Ltd"), threw an uncaught `"Regular expression is invalid: missing closing parenthesis"`.
    `Metadata` and `Active Leads` search already escaped correctly (via the existing
    `escapeRegex()` helper) and were the reference for the fix — applied the same helper at
    all three unescaped call sites (`GET /weekly-tracker`, `GET /weekly-tracker/export-xlsx`,
    `GET /daily-leads`). Verified live: `?search=(` now returns `200` on all three instead
    of `500`.
19. ~~**Daily Leads summary badge counted every coordinator, not just the caller.**~~
    **FIXED 3 Sep 2026.** `GET /daily-leads/summary` never called `scopeToSelf()` — a
    coordinator's Positives/JD badge silently showed the org-wide total while the row list
    right below it (which already scoped correctly) showed only her own. Added the same
    `scopeToSelf()` call the list endpoint already uses. Verified live: a coordinator's own
    summary (305 positives) is now genuinely lower than the true org-wide total requested
    explicitly by Admin with `coordinator_id=all` (315) — confirming real scoping, not a
    coincidental match.
20. ~~**Team Leader's User Management permission had no UI to reach it.**~~ **FIXED 3 Sep
    2026.** Backend already allowed `TL_ADMIN` on `POST`/`PATCH /users`; every path to it was
    hard-gated to Administrator only. Two independent surfaces both needed opening: the
    standalone `/users` page (`AppSidebar.tsx`'s nav entry, `roles: ['admin']` →
    `['admin', 'team_leader']`, matching the pattern already used for `/system-settings`) and
    the `/settings?tab=users` path (`settings/page.tsx`'s `isAdmin` gates on the sidebar, the
    users section, and the modal all switched to a new `canManageUsers = isAdmin ||
    isTeamLeader`; `SettingsNav.tsx` reworked from a single `forCoordinator` flag to a
    3-tier `visible: 'all' | 'staff' | 'admin'` per section so Team Leader sees Profile +
    User Management only — Role Matrix/System Config/Organization/System Info stay
    Administrator-only on both nav surfaces). Verified live as Sujitha (Team Leader): the
    Settings sidebar now shows both sections (previously showed nothing but Profile), and
    User Management renders the real 8-account list.
21. **Real PDF/PNG export, a real recycle-bin screen, and wiring up the built-but-orphaned
    chat module are each their own project, not a bug fix** — deliberately not started
    without a scoping conversation first. See release gate items 2 and 5, and the "chat
    module" finding in the QA report.
24. ~~**System Info's growth percentages were hardcoded constants, never computed.**~~
    **FIXED 3 Sep 2026.** `4.8` / `6.2` / `12.5` were literal numbers returned on every load
    regardless of real data. There's no historical-snapshot table to diff a real trend
    against, so rather than invent a different kind of fake number, replaced them with a real
    7-day window computed straight from `created_at` timestamps (recently-added ÷ everything
    before that window) on `CompanyMetadata` and `ReportLibrary` — genuinely small honest
    numbers instead of confident fake ones. Verified live: a quiet week now correctly shows
    `0` across all three instead of the old constants.
25. ~~**Five System Config preferences (default landing page, default theme, 3 notification
    toggles) saved but nothing ever read them back.**~~ **REMOVED 3 Sep 2026 (not wired up)** —
    same call as the Organization Announcement Broadcaster removal: each was a single
    org-wide value with no role-aware consumer (a global "default landing page" doesn't suit
    every role equally; the app already has a proper per-viewer dark/light toggle, making a
    server-side "default theme" low-value and awkward to apply before first paint; the 3
    notification toggles had no single gated send-path to wire against, tied to the same
    incompleteness as the orphaned chat module). Removed the "Application Delivery &
    Preferences" section from `SystemConfigTab.tsx`, the 5 fields from `SystemSettings.ts`
    and both `server.ts` handlers, and the stale values from the live document (`$unset`).
26. ~~**No password-reset control for an existing user in the Admin UI.**~~ **FIXED
    3 Sep 2026.** `PATCH /users/:id` already accepted a `password` field; the edit modal only
    ever showed a password input when *creating* a user. Added a "Reset this user's password"
    checkbox to `UserModal.tsx` (off by default, so editing unrelated fields never risks
    silently touching the password) that reveals a field validated against the shared
    `passwordPolicy` module client-side; backend handler now also enforces `isPasswordValid()`
    server-side on this path (previously accepted anything). Verified live: a weak password
    on this endpoint now returns `400 PASSWORD_POLICY` with the specific missing requirement.
27. ~~**"Broadcast Announcement" button 404s.**~~ **REMOVED 3 Sep 2026 (user decision — "we
    don't want broadcast announce button"), not fixed.** Turned out to be moot either way:
    `/notifications/page.tsx` is currently just `redirect('/dashboard')` — the whole page
    that held this button (`NotificationsHeader.tsx`, `BroadcastModal.tsx`) was **already
    unreachable dead code**, imported by nothing. Deleted both files outright and removed the
    "Dispatch Broadcast Announcements" row from the Role Permissions Matrix rather than
    fixing its target endpoint. **Correction to this file's own earlier entry** (§5 item 11's
    closing note, and the original QA report): both described this as a live, clickable,
    404-ing button — it was real orphaned source code, but not something any user could
    actually have reached. Worth remembering: a component existing in `src/` is not the same
    claim as a component being on a rendered page — check the route, not just the file, next
    time.
28. **Housekeeping, 3 Sep 2026:** removed the last 3 stray `.tsx.bak` files, the
    `.playwright-cli` console-log dumps, and stale `playwright-report`/`test-results`
    directories (all gitignored, zero version-control impact). Removed 3 confirmed-dead
    dependencies — backend `winston` and `zod`, frontend `axios` — after re-verifying zero
    references in either `src/` tree; `package-lock.json` resynced with a real `npm install`
    on both sides. **`ogl` was on the original suspect list but is no longer dead** — a
    `GradientWaves` WebGL component now imports it, added by someone else's concurrent commit
    mid-session; re-checked before touching anything and left it alone.

29. ~~**Every server restart (and every backend file save) wiped the Nehru and HITS weekly
    tracker rows.**~~ **FIXED 4 Sep 2026 — a regression of trap 10, reintroduced by new code.**
    `startServer()` called `updateNehruWeeklyTracker()` and `updateHitsWeeklyTracker()`
    unconditionally, positioned immediately *below* the `SEED_ON_BOOT` block — visually next to
    the guard but outside it. Despite their names both are wipe-and-rebuild: each runs
    `WeeklyTracker.deleteMany({college_id: ...})` for its college, then re-inserts a hardcoded
    snapshot transcribed from screenshots (65 rows HITS, 54 Nehru). Because the snapshot is
    deterministic the screen always looked correct afterwards — what vanished was the *drift*:
    every status, follow-up date and note entered since the snapshot was written. Verified live:
    a restart removed 50 Nehru + 61 HITS rows and wrote back 54 + 65, so live data had genuinely
    diverged and that divergence was lost (no backup existed; unrecoverable). Amplified by
    `"dev": "ts-node-dev --respawn"` — this fired on *every backend file save*, not just restarts.
    Fix: both calls moved inside `if (SEED_ON_BOOT)`, and a deliberate runner added —
    `npm run seed:nehru` / `npm run seed:hits` (`scripts/runWeeklySnapshot.ts`), **dry-run by
    default**, reporting how many rows would be deleted and requiring `--apply` to act, matching
    the `fix:roles` convention. Verified: `tsc --noEmit` clean; dry run reports 61 at-risk rows
    and changes nothing; a full boot leaves counts identical (61/50/869 before and after) and logs
    only "Boot seeding skipped". **The lesson trap 10 already recorded still stands and was
    re-learned the hard way: application startup must never mutate business data. Boot runs on
    every crash-restart, deploy, autoscale event and file save. One-off data loaders belong in
    `package.json` as explicit commands, never in `startServer()`.**

30. ~~**Weekly Tracker's `academic_year` filter could never actually filter — and the
    response mislabeled unfiltered data as whatever year was requested.**~~ **FIXED
    4 Sep 2026.** Two independent bugs compounded: (a) the frontend's `academicYear`
    state was frozen at `'2027'` — `onAcademicYearChange` was accepted as a prop by
    `WeeklyHeader.tsx` but never actually wired to any control, so every request from
    every user, forever, sent `academic_year=2027`; (b) `GET /weekly-tracker`,
    `/weekly-tracker/kpi`, and `/weekly-tracker/export-xlsx` each silently discarded
    the filter whenever it matched zero rows (`if (rows.length === 0 && filter.academic_year)`
    → re-query without it) and then **echoed the requested year back anyway** — so a
    live session requesting `academic_year=2027` was served all 968 rows, every one of
    them genuinely `academic_year: 2026`, with the response itself claiming `"academic_year":
    2027`. Caught live: a real frontend session was doing exactly this mid-audit. Fixed by
    removing all three silent fallbacks (an empty result is now a real empty result) and
    replacing two hardcoded `|| 2027` echoes with `'all'`/`'All Years'` — the response never
    invents a year again. `sync-daily-positives`'s creation-time default also moved from
    `2027` to `2026` so newly-synced rows stay consistent with the other 969. Frontend default
    changed to `'all'` rather than hardcoding `'2026'` — since there is still no working year
    picker, a hardcoded year would just recreate this bug the next season. Verified live via
    both curl and a real browser session: unfiltered → `academic_year: "all"`, 968 rows;
    `academic_year=2026` → same 968, honestly filtered; `academic_year=2027` → genuinely `0`,
    not a silent full dataset; browser header updated from the old frozen "2027 Season" to
    the correct **"2026 Season"**. `tsc --noEmit` clean both sides.
31. ~~**Manually adding a company to Weekly Tracker that wasn't in Metadata created a
    dangling `company_id` pointing at nothing.**~~ **FIXED 4 Sep 2026 (user decision:
    Option A — refuse rather than save with a broken link).** `POST /weekly-tracker`'s
    metadata-resolution step correctly never auto-created a metadata record (per the
    "only Daily Tracker / Metadata module may add contacts" rule), but its fallback when
    no match was found was `resolvedCompanyId = new Types.ObjectId()` — a freshly minted,
    random ID saved onto the new WeeklyTracker row with **no document behind it at all**,
    in either collection. Unlike the 192 tagged placeholders created by the 2027 batch
    import (`METADATA_TAG`), this orphan had nothing to find it by. Now refuses with
    `400 COMPANY_NOT_IN_METADATA` before creating anything, same shape as the existing
    mandatory-field check in the same handler. Removed the now-dead `is_in_metadata: false`
    success branch in both the backend response and `AddCompanyModal.tsx` (a success
    response can no longer carry `is_in_metadata: false` — the only false path returns
    early). Verified live: an unknown company → `400`, no row written; a real metadata
    company → `201` as before. `tsc --noEmit` clean both sides.

32. **Weekly Tracker cross-college soft-warning + owner notification, 5 Sep 2026 (new
    feature, user-requested).** Access remains fully open by design - any coordinator can
    still create/edit/delete on any college, exactly as before. What changed: if the acting
    coordinator isn't a real assigned owner of the college they're touching, the browser
    shows a plain confirm (`window.confirm`) before the save fires - "This isn't one of your
    assigned colleges, continue anyway?" - and if they proceed, every active/non-deleted real
    owner of that college gets an email from iPOMS naming who changed what and when. Cancel
    aborts before any request is sent (verified live: no PATCH left the browser). An
    unassigned college notifies nobody (nothing to protect yet); an oversight account
    (Administrator, who holds all 27 colleges by design for dashboards) is explicitly excluded
    from being counted as a "real owner" so it never gets CC'd on every edit in the system.
    Scoped to create, edit (both the inline PATCH and the drag/drop section-move), and delete;
    deliberately *not* the pin-toggle (cosmetic, no notification value). Weekly Tracker only -
    Daily Tracker was explicitly deferred.
    Prerequisite fixed first: `users.assigned_college_ids` was still the broken "everyone holds
    nearly all 25 colleges" state from the old boot bug (§5 item 0h) - corrected via
    `scripts/fixCollegeAssignments.ts` (dry-run by default) against a human-confirmed roster:
    Mohanaradha→Karpagam/AIHT/Achariya/KPR, Thirisha→PSNA/DSU/SMVEC, Malavika→KLU/NGCE,
    Lizenya→NPR/KIOT/ACEW, Megala→NGP/Kamaraj, Seshmitha→MCET/MEC, and Sujitha (a Team Leader,
    deliberately treated as a focus owner for these 5 despite TL status)→Nehru/Mar Ephraem/
    KPR/HITS/SONA. KPR is genuinely shared (Mohanaradha handles calls, Sujitha handles email) -
    both get notified on a foreign edit there. 7 colleges (Karunya, AVS, AAA, Sri Shanmugha,
    EGS, MKCE, KGISL) are deliberately left unassigned until real owners are named - no warning
    fires for them yet. Backed up both `users` and `weekly_tracker` before the assignment fix.
    New: `lib/mailer.ts`'s `sendForeignCollegeEditEmail()` (reuses the existing SMTP transporter
    - no new integration, no cost); the `notifyForeignCollegeOwners()` helper in `server.ts`,
    called (fire-and-forget, never blocking the coordinator's own save) from `POST
    /weekly-tracker`, `PATCH /weekly-tracker/:id`, `PATCH /weekly-tracker/:id/section`, and
    `DELETE /weekly-tracker/:id`; the `myCollegeIds`/`isForeignCollege` check and confirm
    dialogs in `weekly-tracker/page.tsx` and `AddCompanyModal.tsx`.
    Verified live end-to-end: Mohanaradha editing Nehru (Sujitha's college) → confirm dialog →
    Cancel → zero network requests sent, nothing saved; Accept path proven via 5 direct API
    tests (create/edit/move/delete all correctly notify Sujitha and correctly exclude the
    Administrator after that exclusion was added mid-build - the first pass wrongly CC'd
    Administrator on every foreign edit, since it holds all 27 colleges for oversight).
    Mohanaradha editing her own college (Achariya) → zero friction, real `PATCH → 200`, no
    dialog at all. Unassigned-college edit (Karunya) → no notification sent, confirmed against
    the mailer log. WhatsApp was explicitly ruled out by the user (cost/setup) in favor of
    email; can be added later as a second channel on the same `notifyForeignCollegeOwners()`
    call without touching the warning-dialog side.

33. **Daily Tracker History is now organization-wide, not per-coordinator (user decision,
    6 Sep 2026).** Caught live: an Administrator opened History Archive for Kamaraj/
    3 Sep 2026 (freshly imported from the September Tracker workbook — see below) and saw
    "0 / 0 rows", even though the data genuinely existed — 27 real rows, attributed to
    coordinator Megala Devi P S. `GET /daily-tracker/history` pinned `coordinator_id` via
    `scopeToSelf()`, so any account other than the row's own coordinator saw nothing,
    regardless of which college was selected — and the frontend's history call
    (`tracker/page.tsx`) never even sent `college_id`, so the college dropdown shown in
    History Archive mode wasn't filtering anything server-side either. The user's decision:
    Coordinator, Team Leader, and Administrator should **all** be able to browse any
    college's historical daily-tracker data, not just their own. Fixed: `coordinator_id` is
    now an optional narrowing filter on `/daily-tracker/history`, never an ownership pin;
    the endpoint populates and returns `coordinator_name` since a college's history can now
    span multiple coordinators; the frontend sends `college_id` and re-fetches automatically
    if the college selector changes mid-review; `TrackerGrid`/`TrackerRow` grow a
    **Coordinator** column, shown only in read-only/history mode. **Deliberately NOT
    touched:** `/daily-tracker/today` — the live, in-progress calling workspace — stays
    self-scoped; this change is about historical record visibility, not about who may work
    whose active queue. Verified live: Administrator's history request for Kamaraj/
    2026-09-03 with no `coordinator_id` param returned all 27 real rows, each correctly
    carrying `coordinator_name: "Megala Devi P S"`. `tsc --noEmit` clean both sides.

34. **September Tracker 2026 import — COMPLETE, 6 Sep 2026.** The user provided
    `September Tracker 2026.xlsx` (25 sheets: 22 colleges + Tracker/POSITIVES/JD RECEIVED,
    the last three explicitly skipped) to reload Daily Tracker after a full history wipe
    (565 records, Jan–Sept 2026, hard-deleted since `DailyTracker` has no `is_deleted`
    field — Weekly Tracker/Daily Leads/Active Leads/Company Metadata/Report Library
    deliberately untouched). Workflow per sheet: inspect exact sheet name → dry-run parse
    (content-based phone/name classification, not header-declared column order — real
    coordinator-entered data frequently swaps columns) → cross-check every company/phone
    against existing metadata, creating a new metadata record only on genuine certainty
    nothing already matches → present findings → wait for explicit confirmation → backup
    `daily_tracker` → apply → verify counts on target and all protected collections →
    clean up scratch scripts.
    **Result: 535 daily_tracker rows across 10 sheets with real data** — MCET 122,
    KAMARAJ 104, NGP 90, MAR EPHRAEM 8, ACEW 5, NPR 49, KIOT 16, KLU 60, SMVEC 62, DSU 19.
    **2 new metadata companies created:** GEP World (MCET), TCS BPS (ACEW) — everything
    else in all 10 sheets matched an existing metadata record, so this is also the answer
    to "list any contact not already in the metadata base."
    **7 rows skipped — no phone number anywhere (sheet or metadata), same pattern each
    time:** Novacept (NGP), Volopay (ACEW), Tata Capital Housing Finance + Cosmic Micro
    Systems (NPR), Sedin + Aethrone Aerospace + Rane Group (SMVEC).
    **Confirmed empty, no calls logged, correctly skipped:** ACET, AIHT, KPR, MKCE, PSNA,
    SONA, NEHRU, NGCE, HITS, AVS, KARUNYA.
    **Recurring data-entry bug found and corrected on 7 of the 10 real sheets:** a
    calendar-picker glitch left the day field stuck at a fixed value (commonly "9") while
    the month cycled — e.g. a sheet meant to represent Sep 1–4 decodes to Jan 9/Feb 9/
    Mar 9/Apr 9. The user confirmed each sheet's serial→target-date mapping explicitly
    before import, arithmetic-checked against the sheet's real non-header row count.
    KLU additionally had 3 confirmed exact-duplicate rows (identical company/phone/date/
    comment) — deduped to 1 each per the user's call. A handful of rows also matched
    metadata by phone even though the sheet itself had no number (metadata's own number
    used as a legitimate fallback) — e.g. Tata Elxsi (NPR), the whole DSU sheet (HR names
    entirely sourced from metadata since the sheet's HR column was blank throughout).
    `backend/_manual14.js` was kept for MCET's messy-name overrides; every other sheet's
    scratch scripts (`_peek_*`, `_dryrun_*`, `_insert_*`, `_*_parsed.json`) were deleted
    after use, per the established convention.

35. **Same-day positive-call safety net, 6 Sep 2026 (new feature, user-requested) — plus
    a real bug found and fixed in the existing 6 AM job while building it.** User described
    the daily workflow (login ~10 AM, log off ~7 PM, invite_mail outcomes = "positive",
    synced into Weekly Tracker / Daily Leads via the Sync buttons or manual entry) and asked
    to confirm it against the real code. Two corrections to what the user believed: (a) the
    tracker does NOT reset at 12:00 AM — there are two separate jobs, a 5:00 AM IST dashboard-
    analytics refresh and a 6:00 AM IST job that actually finalizes/locks yesterday's rows
    (the "today" screen only *looks* fresh at midnight because it queries by calendar date,
    independent of any job); (b) that 6 AM job's own "auto-promote" step for old unsynced
    positive rows was a real bug — it only set `is_promoted_to_weekly = true` and saved,
    **never actually creating the Weekly Tracker row**, so old positives could be marked
    "promoted" while nothing existed in Weekly Tracker. Confirmed live before fixing: called
    the exact same logic path via a throwaway test row — it flipped the flag with zero
    Weekly Tracker documents created.
    Fixed and extended: `backend/src/lib/weeklyTrackerSync.ts` (new) holds
    `promoteDailyTrackerRowToWeekly()`, extracted from `POST /weekly-tracker/
    sync-daily-positives`'s per-row logic — checks for an existing Weekly Tracker row by
    company+college+year, creates one only if missing, always sets
    `is_promoted_to_weekly = true` afterward. The 6 AM job (`finalizeDailyTracker.ts`) now
    calls this instead of just flipping the flag. Verified live via a throwaway test
    Daily Tracker row: first call creates the Weekly Tracker row and returns `created: true`;
    a second call on the same row is idempotent (`created: false`, still exactly 1 Weekly
    Tracker row) — confirms no duplicate risk from being called by multiple jobs.
    New: `backend/src/jobs/positiveSyncReminder.ts` — **8:00 PM IST**: emails each coordinator
    (via new `sendPositiveSyncReminderEmail()` in `mailer.ts`) a list of that day's positive
    (`invite_mail`/`hiring`/`jd_received`/`drive_completed`) Daily Tracker calls, grouped by
    college, that still aren't in Weekly Tracker. **10:00 PM IST**: same query — anything
    still unsynced gets really auto-synced via `promoteDailyTrackerRowToWeekly()` (not just
    flagged), and a `Notification` (`notification_type: 'reminder'`, `action_url:
    '/weekly-tracker'`, `requires_acknowledgment: true`) is created per coordinator listing
    what was auto-synced. Both jobs registered in `server.ts`'s `startPositiveSyncReminderJob()`
    alongside the existing 5/6 AM job — the 6 AM catch-all still exists for anything that
    slips through both (e.g. server down at 10 PM).
    Frontend: `dashboard/page.tsx` (coordinator role only, per user's choice) fetches
    `GET /notifications?tab=unread` on load; if one matches
    `action_url === '/weekly-tracker' && notification_type === 'reminder' &&
    requires_acknowledgment`, shows a `Modal` with OK ("review now" → navigates to
    `/weekly-tracker`, marks acknowledged) / Cancel (dismiss, marks acknowledged, stays on
    dashboard) — both buttons call the existing `PATCH /notifications/:id/acknowledge`
    (`response: 'acknowledged'`), no new endpoint needed there. Verified live end-to-end:
    inserted a real reminder-type Notification for Megala Devi P S, confirmed it surfaces
    correctly through the exact `GET /notifications?tab=unread` query the dashboard uses,
    then confirmed `PATCH .../acknowledge` removes it from the unread list — matching what
    the dashboard's fetch effect and modal dismiss handler do. `tsc --noEmit` clean both
    sides. Browser-based UI verification was not possible this session (the in-app preview
    tool got stuck at a blank/0×0 viewport) — verification here is via direct API calls
    proving the same code paths the frontend calls, not a screenshot.

35b. **Metadata database-wide duplicate cleanup, 6 Sep 2026.** User provided
    `ipoms missing metadatabase contact.xlsx` (the session's earlier missing-contacts
    export, since hand-filled) to backfill blank `hr_name`/`mobile_numbers`/`email_ids`
    fields — 103 clean fills applied directly, plus 10 records where the sheet's new
    value conflicted with an existing one (append as an additional contact rather than
    overwrite, per explicit instruction), including 4 with real corrections (Mitsogo/
    Optum/Siemens had a phone number wrongly stored as `hr_name` — cleared and folded into
    `mobile_numbers`; Presidio's `hr_name` was corrupted to `"] / Lakshman"` — fixed to
    `"Lakshman"`) and 7 brand-name casing picks (AstraZeneca, DevRev, MBit Wireless,
    LumberFi, OJ Commerce, SAP, Saint-Gobain).
    Then a full duplicate scan across all ~4,060 active records, three cases the user
    defined: same name+HR+mobile with a different email (merge, union emails), same
    name+mobile with a different HR (merge, comma-separate names), and full exact matches
    (merge, no judgment needed) — **plus a fuzzy pass for differently-spelled versions of
    the same company** (e.g. "Adya AI"/"Adya.ai"/"Adya. AI", "SAP"/"Sap", a genuine x/z
    typo "Genworx"/"Genworz" that exact canon-matching missed entirely). **Governing rule,
    corrected mid-cleanup after the user caught an error:** two records merge into one
    whenever ANY of name/mobile/email overlaps at all; they stay as two separate rows
    ONLY when name, mobile, AND email are all simultaneously different. Every duplicate
    pair was already required to share at least one mobile number just to be detected, so
    in practice this means merge, full stop — "keep as two rows for a shared office line"
    (my first instinct, used in early batches) was wrong and had to be retroactively
    fixed for ~13 clusters. Sub-clustering used connected-components (shared mobile OR
    email as the graph edge) within each same-name/same-canon group, not a blanket
    same-name merge — this is what correctly left ABB's 4 unrelated contacts as separate
    rows (no field in common at all) while still merging the 2 that shared an email.
    **Result: 4,060 → 3,702 records** (358 duplicates removed) across ~230 merge
    operations. Found and excluded **9 cases of cross-company email contamination**
    (a record for one company carrying another company's email verbatim — e.g. Agilisium
    holding a `@dxc.com` address, DoodleBlue holding Flex's email, Mphasis holding a
    `@mouser.com` address with the correct contact confirmed live by the user) — these
    were copy-paste errors from the original import, not real shared contacts, so the
    wrong email was dropped rather than preserved. 240 records that share a similar or
    identical company name but no contact-field overlap were correctly left as separate
    rows per the governing rule. Full JSON backups taken before every write throughout
    (`backend/backups/company_metadata_before_*`); all scratch analysis scripts deleted
    after use.
    **Same-day follow-ups:** (a) 91 records had zero phone AND zero email; cross-checking
    those by name against the whole database (not just each other) found 18 duplicate
    stubs the phone/email-based scan could never catch on its own — 6 had a real HR name
    worth preserving (merged), 10 were pure junk (deleted). (b) A broader health check
    (malformed contact entries, cross-company field collisions, blank names, duplicate
    serials) surfaced 388 phone + 194 email collisions across *unrelated* company names —
    explicitly **left untouched**: this evidence is much weaker than a name-match, and at
    that scale a wrong auto-merge risks fusing two genuinely different companies (shared
    staffing-vendor lines and corrupted placeholder numbers like `1234567890` account for
    many of them). Only fixed the 31 records with unambiguous evidence of glued-together
    phone/email entries (a real comma or a second `+` country-code marker in the raw
    string) — first attempt was too aggressive and briefly deleted a few genuine
    international numbers (e.g. a UK `+44...` contact) by assuming every valid number was
    Indian-format; caught before applying and rewritten to only touch entries with
    unambiguous split evidence, leaving anything merely unfamiliar-looking alone. 0
    duplicate `serial_number`s found.
    **Follow-up the same day:** checked for records with zero phone AND zero email
    (91 found). Cross-referencing those by name against the *whole* database (not just
    against each other) surfaced exactly the blind spot named above — 18 were duplicate
    stubs of an existing company that the phone/email-based scan structurally could never
    catch (nothing to match on). 6 had a genuine HR name worth preserving (e.g. Agiliq,
    Harman, Techasoft) and were merged properly; 10 were pure noise (blank or
    phone-string-junk `hr_name`) and were deleted outright. **3702 → verified 16 records
    correctly removed** (the raw total moved by a different amount due to concurrent real
    usage of the app mid-session, unrelated to this cleanup — confirmed by checking each
    deleted serial individually). The remaining 72 blank-contact records are genuinely
    standalone — a real company name on file with no way to reach them, same situation as
    the rows that stayed blank in the user's own missing-contacts export.

36. **"Positive" for pipeline/sync purposes narrowed to Invite Mail only (user decision,
    6 Sep 2026).** Immediately after building item 35, the user redefined what should
    actually trigger a sync: **only `invite_mail`** creates a Weekly Tracker "Companies in
    Pipeline" row or a Daily Leads Positives-tab row — not `hiring`/`drive_completed`/
    `in_connect`/`follow_up` as before. `jd_received` keeps its own separate, unchanged
    behavior (JD Received tab only, when a JD has genuinely come in). New constant
    `PIPELINE_SYNC_OUTCOME = 'invite_mail'` in `DailyTracker.ts`, deliberately kept distinct
    from the existing `POSITIVE_OUTCOMES` array — that broader set (`jd_received`/`hiring`/
    `invite_mail`/`drive_completed`) still drives KPI cards, dashboard funnels, and admin
    analytics, which the user did NOT ask to change. Updated to use `PIPELINE_SYNC_OUTCOME`:
    `POST /weekly-tracker/sync-daily-positives`'s `dailyFilter`, `POST /daily-leads/
    sync-positives`'s `dtFilter` (now `['jd_received', 'invite_mail']` only, down from 6
    statuses), the 6 AM catch-all's "unpromoted" query in `finalizeDailyTracker.ts`, and
    `positiveSyncReminder.ts`'s `findTodaysUnsyncedPositives()` (both the 8 PM email and the
    10 PM auto-sync). Reminder-email copy in `mailer.ts` updated to say "Invite Mail" instead
    of the old 4-status list. Verified live with three throwaway Daily Tracker rows on NGP
    (hiring/invite_mail/jd_received): the manual Weekly Tracker sync correctly promoted only
    the invite_mail row (`hiring` untouched); the Daily Leads sync correctly split
    invite_mail→Positives and jd_received→JD Received, with `hiring` producing neither.
    `tsc --noEmit` clean.

37. **Live-wired the season/academic-year switch, 7 Sep 2026 (user decision — season start
    is not a fixed calendar date, so the switch must be a deliberate manual action, not a
    cron flip).** Settings → System Config's "Academic Year" field
    (`SystemSettings.academic_year`) already existed and looked like a real control, but was
    **cosmetic** — read back only for the admin dashboard's System Info label
    (`server.ts` System Telemetry block), never consulted by anything that actually tags a
    new record. Every real creation site hardcoded the literal `2026` instead: the inline
    live auto-sync inside the Daily Tracker save handler, `POST /weekly-tracker` (manual add
    company), `POST /weekly-tracker/sync-daily-positives`, `POST /reports/presets`, three
    analytics endpoints' query defaults, and — most impactful — `weeklyTrackerSync.ts`'s
    `promoteDailyTrackerRowToWeekly()`, the function the 6 AM catch-all and the 8 PM/10 PM
    reminder+auto-sync jobs (item 35) all call with no year argument, so every automatic
    promotion was silently pinned to 2026 regardless of what Settings said.
    Fixed by wiring all of these to a new single source of truth,
    `getCurrentAcademicYear()` in `backend/src/lib/academicYear.ts` — reads
    `SystemSettings.academic_year`, parses the leading 4-digit year out of the season label
    (so an admin can type "2027-2028" or just "2027"), 60-second in-memory cache to avoid a
    DB hit on every single row creation, falls back to 2026 only if the setting is genuinely
    unset. `PATCH /settings` calls `clearAcademicYearCache()` on any academic_year change so
    the effect is immediate rather than waiting out the cache window. Existing records keep
    whatever year they were created with — this only changes what NEW records get stamped
    with going forward. **Also found and fixed a real bug while touching the same code**:
    the inline Daily Tracker auto-sync path (separate from the manual sync button and the
    cron jobs) had been missed by item 36's Invite-Mail-only narrowing and was still firing
    Weekly Tracker promotion on the old 5-outcome list (`hiring`/`drive_completed`/
    `in_connect`/`jd_received`/`invite_mail`) — now uses `PIPELINE_SYNC_OUTCOME` like every
    other path. Deliberately left untouched: the boot-time seed defaults gated behind
    `SEED_ON_BOOT` (dev-only, off by default, out of scope per trap 10/29's "never let boot
    touch business data" rule) and `GET /weekly-tracker`/`GET /weekly-tracker/kpi`'s own
    `academic_year` query handling (already correct since item 30 — 'all' when unfiltered,
    never a hardcoded fallback).
    **Same-day follow-up, still 7 Sep 2026** — the user pointed out three real gaps in the
    first pass: (a) clicking Save gave zero visible feedback, so there was no way to confirm
    a save actually happened; (b) "Academic Year" (a season range, "2026-2027") was being
    conflated with "graduating batch" (a single year, "2027 Batch") — they're different
    concepts that had been sharing one hardcoded-2026 value; (c) both should be dropdowns,
    not free text an admin could mistype. Fixed all three:
    **New field** `SystemSettings.graduating_batch_year` (Number, independent of
    `academic_year`) — `getCurrentGraduatingBatchYear()` added alongside
    `getCurrentAcademicYear()` in `academicYear.ts` (both now share one cached settings read).
    Every `eligible_batch: \`${year} Batch\`` call site that had been reusing the *season*
    year now uses the *batch* year instead — `weeklyTrackerSync.ts`, the inline Daily Tracker
    auto-sync, `POST /weekly-tracker`, and `POST /weekly-tracker/sync-daily-positives`.
    **Settings UI**: both fields are now `SmoothSelect` dropdowns (component already existed,
    imported but unused) — season options generated as a rolling 6-year window
    (current year ±2/+3) and batch-year options as a rolling window of plain years, so the
    list never needs manual updating. A preview line below the fields spells out in plain
    language what saving will change ("every new Weekly Tracker row... will be tagged X
    season, Y Batch... on their very next action, no login or refresh required").
    **Save feedback**: `handleUpdateSettings` in `settings/page.tsx` had no success or
    failure path at all — silently did nothing visible either way, which is exactly the "did
    my click work?" gap the user hit. Now dispatches the existing shared
    `ipoms_trigger_autosave_banner` event (the same floating pill used elsewhere in the app,
    see item 0g(c)) on success, and `alert()`s the real server error on failure, matching the
    pattern already used for user deactivation on the same page.
    **Verified live** end-to-end against the real dev server (`SEED_ON_BOOT` confirmed off —
    boot left existing data untouched): set `graduating_batch_year` to a throwaway `2099` via
    `PATCH /settings`, created a real throwaway Weekly Tracker row via `POST /weekly-tracker`
    — came back `"eligible_batch": "2099 Batch"` while `academic_year` stayed the untouched
    `2026`, proving the two fields are wired independently and the change is instant (no
    cache delay, since `PATCH /settings` clears it). Row then deleted (confirmed `0` results
    on a follow-up search) and both settings fields reverted to their real values
    (`2026-2027` / `2027`) before finishing. `tsc --noEmit` clean both sides.

38. ~~**Daily Tracker's per-edit "Saving…/Saved at" badge was dead code — never rendered
    on screen.**~~ **FIXED 7 Sep 2026.** Found while verifying Daily Tracker's auto-save
    for the user: `AutoSaveBadge.tsx` existed, and `saveStatus`/`lastSavedAt` state in
    `tracker/page.tsx` genuinely updated on every save (confirmed live earlier the same
    day) — but the component was never imported or rendered anywhere. The underlying
    save itself always worked; there was simply no visible confirmation of it beyond the
    shared Ctrl+S banner. **Correction to what this session told the user minutes
    earlier**: it had claimed Daily Tracker gives "instant, per-edit visual proof" based on
    reading the component's code without checking it was actually placed on the page —
    wrong, and corrected in the same turn once caught while building the Weekly Tracker
    version. Moved `AutoSaveBadge` from `app/tracker/components/` to the shared
    `components/ui/` (both pages need it now) and rendered it in Daily Tracker's header,
    next to the sign-out button, hidden in read-only History mode.
    **Weekly Tracker parity (user-requested, same session)**: Weekly Tracker's inline
    cell edits (`commitEdit` on blur in `WeeklyTable.tsx`) already saved for real via
    `PATCH /weekly-tracker/:id` — verified live earlier the same day — but gave zero
    per-edit feedback; the only visible "Saved" confirmation was the shared banner, and
    only on manual Ctrl+S. Added the same `saveStatus`/`lastSavedAt` state to
    `weekly-tracker/page.tsx`, wired into the three silent-save handlers
    (`handleUpdateRow`, `handleMoveSection`, `handleTogglePin`), and rendered via
    `WeeklyHeader.tsx` (new optional `saveStatus`/`lastSavedAt` props, default `'idle'`/
    `null` so no other caller breaks). Deliberately left `handleSaveAll` (Ctrl+S) alone —
    it still drives the separate floating banner, which is the correct signal for "I just
    explicitly flushed everything," distinct from the inline per-edit badge.
    `tsc --noEmit` clean. **Not verified visually in-browser** — the in-app preview tool
    hit the same blank/0×0-viewport failure documented in item 35; the frontend itself
    was confirmed live and responding (`curl` 200 on `/`), so this is a tooling limitation
    in this session, not evidence against the fix. Confirmed correct only by code trace and
    a clean typecheck — visually re-check next time the preview tool is available.

39. **Coordinator demo deck, 17 Sep 2026** — `iPOMS_Coordinator_Demo_2026.pptx` in the
    OneDrive `version 1/Presentations/` folder, 8 slides presented by A. Mohanaradha.
    Source lives as code in the `ipoms-ppt-2026` skill under `demo/` (`capture.js` takes
    read-only Playwright screenshots with HR phones/emails masked, `prep_assets.js` crops and
    frames them, `build_demo.js` builds, `animate.ps1` adds fades via PowerPoint COM).
    Every claim was checked against code first. Two things surfaced while doing that:
    **(a) no month-over-month coordinator comparison exists anywhere**, and call duration is
    only stored per row, never aggregated (the Team Leader dashboard shows live presence,
    calls today, positives and JDs per coordinator). The deck labels monthly comparison as
    "NEXT". `reports/components/AnalyticsView.tsx` is orphaned (imported nowhere).
    **(b) Two bugs found this way — both fixed same day, 17 Sep 2026:**
    ~~Weekly Tracker and Daily Tracker both threw React hydration errors in `next dev`~~ —
    both pages lazily initialized `selectedCollegeId`/`selectedCollegeName`(/`selectedCollegeObj`
    on Daily Tracker) straight from `getActiveCollege()` inside `useState(() => ...)`. That
    reads `localStorage`, which the server-rendered pass never has and the browser's first
    pass already does, so the two renders disagreed and React discarded the mismatched
    markup. Both pages already had a `resolveDefaultCollege()` effect that correctly
    populates the same state after mount — the lazy initializer was pure redundancy that
    only existed to shave one render's flash of "no college selected," at the cost of a
    guaranteed hydration error every load. Fixed by starting both states empty (`''`/`null`)
    and letting the existing effect fill them in; `getActiveCollege` import dropped from both
    files since nothing else used it. Verified live: a Playwright console probe that reported
    3 hydration errors on `/weekly-tracker` before the fix reports zero after, on both pages.
    ~~`reports/page.tsx`'s `?auto=true` path called `apiFetch('/api/v1/reports/generate')`~~ —
    `apiFetch` already prefixes every call with `API_BASE` (itself ending `/api/v1`), so this
    request actually hit `/api/v1/api/v1/reports/generate` — a route that doesn't exist — and
    the caught 404 silently dropped the user into the empty wizard instead of the report they
    clicked for. This is the path both of Daily Leads' report buttons use
    (`handleOpenPdfModal`/`handleOpenImageModal` → `/reports?...&auto=true`). Fixed by
    dropping the redundant `/api/v1` prefix; confirmed via grep this was the only such
    doubled-prefix call in the frontend. Verified live end-to-end (not just the API call):
    the exact URL Daily Leads links to (`/reports?template=daily_positives&date=2026-09-03&
    collegeId=all&auto=true`) now shows the real generated report ("POSITIVES OF THE DAY")
    on the page, where it previously silently showed the bare "Report Builder" wizard.
    `tsc --noEmit` clean. Still open, unrelated to either bug: the Pipeline Overview chart
    (item from 13 Sep) renders only in the A4 preview/PDF path, not the inline editor.

40. **User Guide v1.0, 17 Sep 2026** — `version 1/PDF/iPOMS_User_Guide_v1.0.pdf` (29 pages,
    Infoziant logo in every page header, www.infoziant.com + ipoms.vercel.app + page number
    in every footer). Source as code in the `ipoms-ppt-2026` skill under `guide/`
    (`capture_guide.js` → `prep_images.js` → `build_guide.js`, Playwright HTML→PDF). Written
    from the code, not from `data/faqData.ts` — **the in-app FAQ is stale**: it says 3 report
    types (there are 6), 7 Weekly Tracker sections (there are 9), and that Weekly sync pulls
    Hiring/Follow Up calls. Facts verified while writing, which supersede older notes above:
    **(a)** the inline "Invite Mail → Weekly Tracker on save" auto-sync from item 37 is **gone**
    from `PATCH /daily-tracker/:id` (someone's later commit); saving a row now only syncs contact
    edits to Metadata and outcomes to Active Leads. **(b)** `POST /weekly-tracker/
    sync-daily-positives` now reads **Daily Leads positives**, not Daily Tracker rows — the flow
    is Daily Tracker → Daily Leads (Sync Positives) → Weekly Tracker (Sync). The 6 AM and
    10 PM jobs still promote Invite Mail rows directly via `weeklyTrackerSync.ts`.
    **(c)** Metadata DB has a working Recycle Bin view and Bulk Paste import.
    ~~**Open data issue: 19 of 27 `colleges.location` values were the spreadsheet error
    string `#VALUE!`.**~~ **FIXED, but not by this session** — a same-day commit
    (`d063aab`, "college information sync", by someone else concurrently) added a
    `COLLEGE_DEFAULT_LOCATIONS` fallback map and a real location-import path to whatever
    script touches `colleges`. Re-verified 18 Sep 2026, both against the raw DB and the
    live `GET /colleges` response: **0 bad locations remain** across all 27 documents.
    Caught only because this session re-checked before the demo rather than trusting the
    17 Sep finding — worth remembering that a "still open" note in this file can go stale
    within a day when other work is landing in parallel.
    ~~**UI copy inconsistency: the Administrator profile page said admins can recover by
    6-digit OTP, but `authRoutes.ts` refuses admin OTP (`ADMIN_OTP_DISABLED`).**~~
    **FIXED 18 Sep 2026.** `settings/components/UserProfileTab.tsx`'s "Administrator
    Security & Recovery Note" claimed OTP recovery worked for admins — directly
    contradicting §2's documented policy and the real backend behavior (item 12). The
    backend was correct; the copy was wrong, so the copy was changed to state the real,
    deliberate policy (no admin email-OTP, security-team reset only) instead of silently
    promising a path that 403s the moment someone tries it. Verified live: logged in as
    Administrator, loaded `/profile`, confirmed the corrected text renders. `tsc --noEmit`
    clean.

41. **Self-registration removed entirely, 20 Sep 2026 (user decision).** `POST /auth/signup`,
    `/auth/signup/request-otp`, and `/auth/signup/verify-otp` (`authRoutes.ts`) now all return
    a flat `403 SELF_REGISTRATION_DISABLED` — no OTP is issued, no account is created, no
    email is sent. Every account, including Coordinators, is now provisioned directly by an
    Administrator through User Management; there is no self-service path at all. This retires
    the `pending` `account_status` approval workflow (item 16, removed from this file — it
    described a feature that no longer exists) and everything downstream of it: the signup
    mobile-format validation (item 18, removed), the signup OTP attempt-counter off-by-one fix
    (item 22, removed), and the `@icl.today`/`@infoziant.com` dual-domain allowlist note
    (item 23, removed) — all of those were fixes or notes about code paths that are now dead.
    Item 0 (the `role_codes` privilege-escalation history) is kept deliberately — see its own
    note. §6's module map row for User & Access updated to match.

42. **Coordinator "Dedicated Calling Time" widget rebuilt, 21 Sep 2026 (user-requested
    visual upgrade) — plus a truthfulness bug caught and removed mid-build.**
    `CoordinatorClockDurationWidget.tsx` previously centred on a large analog clock dial
    whose hands showed **the current wall-clock time** — not the metric the widget is named
    after. It animated impressively while visualising nothing. Replaced with a "Momentum
    Flow" treatment: drifting aurora background, an odometer whose digit columns roll on
    real data change, and an **Hourly Rhythm** bar chart of when today's calls actually
    happened, current hour highlighted.
    **New backend field:** `clock_duration.hourly_calls` — 24 slots, index = IST hour, from
    the Daily Tracker rows the endpoint already loads (`call_start_time`, falling back to
    `created_at`). Uses explicit +05:30 offset math rather than `getHours()`, matching
    `positiveSyncReminder.ts`: `getHours()` silently reports UTC hours the moment this runs
    anywhere that isn't an IST box. An empty day is genuinely all zeros — the chart renders
    a flat rail and an honest "No calls logged yet today", never a placeholder shape.
    **The bug, caught before it shipped:** the first pass ticked the counter +1/second
    locally "so it feels live". That is wrong — this value is the *summed duration of calls
    already logged*, not a running stopwatch, so on a day with zero calls it would have
    climbed to 00:04:12 while the true answer stayed 00:00:00. Exactly the failure mode of
    §5 item 0g ("three screens told the user something untrue"). The local tick was removed;
    the number now only moves when the server says it moved. Motion comes from the aurora
    and the bars, not from a fake clock.
    **Follow-up the same day — the figure now refreshes on real events.** With the fake tick
    gone the number was correct but only re-read on mount, so a call logged with the
    dashboard already open didn't show up. `dashboard/page.tsx` now silently re-runs
    `loadDashboard(true)` on two triggers: the `ipoms_tracker_sync` BroadcastChannel that
    Daily Tracker **already** fires on every row add/update/delete (7 call sites in
    `tracker/page.tsx` — nothing new had to be published), and `visibilitychange` for the
    ordinary "go log calls, come back" flow. Deliberately **not** an interval: this value
    cannot change unless this coordinator logs a call, so a timer would only ever re-confirm
    the same number.
    **Verified against the live database, not by inspection:** inserted one marked throwaway
    Daily Tracker row (`duration_seconds: 420`) → dashboard returned `07m 00s / 1 call`;
    edited it to `900` → returned `15m 00s`; deleted it → back to `0`. Then, in a real
    browser with the dashboard already open, added a 12m 18s row and fired the tracker's own
    broadcast: the widget moved `00:00:00 → 00:12:18` with the 5p bar rising, **no reload**.
    All throwaway rows removed afterwards (`daily_tracker` back to 1018, marker count 0).
    **Styled-jsx trap hit and documented in-file:** the odometer digit markup lives in a
    child component, and styled-jsx only scopes elements written lexically inside the
    component holding the `<style jsx>` block — so the unscoped rules never matched and all
    ten numerals rendered in a row. Those selectors are `:global()` on purpose, with
    `ipoms-` prefixes because of it. The digit roll uses a **percentage** transform, not
    pixels, so the smaller mobile digit height cannot desync the maths.
    Verified live in a real browser across three states (populated, genuinely-empty, dark
    mode), with the populated case driven by read-only Playwright response interception —
    nothing was written to the database to stage the screenshot. `tsc --noEmit` clean both
    sides.
    **"Ongoing process" polish, same day (user-requested).** Motion was added *around* the
    number, never *to* it: a gradient arc travelling round the card border, a periodic light
    sweep, a radar ping on the Live dot, a "synced h:mm" timestamp that updates on every
    real refetch, a brief indigo glow on the odometer only when the total genuinely changes,
    a **"now" marker** on the rhythm rail at the real wall-clock position (a time-axis
    position, not a quantity, so it may move freely; hidden outside the bar window rather
    than pinned to an edge), and on an empty day a brightness-only wave along the flat rail
    (deliberately never height, so it can't read as call volume). Gotcha worth keeping: a
    `text-shadow` glow on the digits is clipped by each digit's `overflow:hidden` window and
    renders as faint boxes — the glow is a `drop-shadow` filter on the container instead.
    Testing note: faking the browser clock (Playwright `clock.install`) trips React hydration
    errors from the time-of-day greeting banner, because the server renders at real time — an
    artifact of the test, not the widget; un-faked runs are clean.
    **Hourly Rhythm window moved to 10am–7pm, 21 Sep 2026 (user decision)** — still widens
    for calls outside it rather than dropping them.

43. **Campus Outcome Mix + Monthly Call Trend, 21 Sep 2026 (user-requested)** — replaced the
    grouped bar chart in `CoordinatorCollegeKpiCards.tsx` (also rendered on the Team Leader
    dashboard). That chart drew every **zero** as a ~35px bar and showed parts-of-calls as
    rival bars. Now: one row per campus (acronym only), a stacked bar of that campus's calls,
    and positive rate; plus a table view. **Buckets (user-chosen, server-side
    `OUTCOME_BUCKET` in `server.ts`)**: Positive = `invite_mail` only (matches
    `POSITIVE_OUTCOMES`); Not Hiring = `not_hiring`, `hiring_freezed`; Negative =
    `no_response`, `invalid`, `in_connect`, `hiring_completed`; Follow Up = `follow_up`,
    `call_back`; Other Progress = `jd_received`, `hiring`, `drive_completed`; no outcome yet =
    `pending`. All 12 outcomes map, so segments always sum to calls — verified on real data
    (NGP 209, KAMARAJ 203, MCET 128, KLU 107, every campus `sum === calls`). Returned as a new
    `outcome_mix` field; the older `total_negatives` etc. are left unchanged (they use a
    *different* negative definition — don't mix them). **New endpoint**
    `GET /dashboard/monthly-calls?month=YYYY-MM&college_ids=…` — calls per day per campus,
    `scopeToSelf`-scoped, returns `is_last_day_of_month` computed in IST; policy entry added
    (`verify:policy` 100/100). The chart auto-opens on the last day of the month, otherwise
    behind a "View Month Graph" button; lines stop at today (a future day is "not yet", not
    zero). Palettes were validated for colour-blindness in light and dark (first attempts
    failed — red/amber too close; negative is rose for that reason).
    **Data finding:** every September `daily_tracker` row is attributed to the
    **Administrator** account, not to coordinators — the sheet-by-sheet reload used the
    admin's id. Coordinators' outcome mix and month chart are therefore empty until they log
    their own calls, or the rows are re-attributed.
    **Left broken by a concurrent session, not fixed here (to avoid racing it):** a new
    `GET /dashboard/coordinator/clock-duration` endpoint was inserted *between* the
    `/dashboard/coordinator` handler's `catch` block and its closing `});`, so that `});` is
    missing and the backend won't start (`'}' expected` at EOF). It also has no
    `routePolicy.ts` entry, so once it parses it will 403 (default-deny).
    *(Since fixed by that session — backend parses and runs again.)*
    **Month graph redesigned as a heat strip, 21 Sep 2026 (user picked option A of three)** —
    the multi-line chart piled every campus onto the zero line on quiet days. Now one row per
    campus, one square per day (1 → 30/31), one shared blue scale (darker = more in light,
    brighter = more in dark), zero = neutral square, future days striped ("not yet", never
    zero), today outlined, row totals on the right, hover tooltip with calls + minutes.
    Defaults to **Calls Count**: the imported September rows carry no `duration_seconds`, so a
    Duration default showed an all-empty month. `monthly-calls` now sums a day's duration in
    seconds and rounds once (it rounded per call, so short calls vanished).
    **Merged into one card, same day (user request — "avoid 2 designs, save space").** The
    separate "Campus Outcome Mix — Today" card is gone; the heat strip is always visible and
    carries outcome columns on the right — Positive / Not Hiring / Negative / Follow Up
    (**Other Progress deliberately not shown**, user decision; those calls still count in
    Calls). The columns show **Today** by default, **Month** for the month to date, or any
    day the user clicks. `monthly-calls` now returns `daily_outcomes` per campus (same
    `OUTCOME_BUCKET` mapping). The component no longer calls `college-kpis`; its
    `outcome_mix` field is still returned but unused by this card.

44. **Full performance + security + background-job check, 22 Sep 2026 (user-requested).**
    Ran against the local dev backend/frontend only, which itself talks to the real
    **production** MongoDB Atlas cluster (`ipoms-prod.7e8ft3k.mongodb.net`) — "local dev"
    is not a separate database here; keep that in mind before any future load or write test.
    **Found and fixed live, most severe first:**
    (a) **CORS accepted every origin, with `credentials: true`.** `cors()`'s `origin`
    callback in `server.ts` had a real allowlist (localhost, local network, `*.vercel.app`,
    a fixed list) but then fell through to an unconditional `callback(null, true)` for
    anything that didn't match — dead-code allowlist. Combined with `credentials: true` and
    `exposedHeaders: ['Authorization', 'Set-Cookie']`, any website could make a credentialed
    `fetch()` to this API — cookies (including the httpOnly 30-day refresh-token cookie,
    §3) ride along automatically — and read the JSON response. Verified live before the
    fix: `curl -H "Origin: https://evil.example.com"` against `POST /auth/refresh` and
    `GET /health` both came back `Access-Control-Allow-Origin: https://evil.example.com` +
    `Access-Control-Allow-Credentials: true` — a malicious page could have silently minted
    a fresh access token for any logged-in visitor's account. Fixed: the fallback now
    rejects (`callback(new Error('Not allowed by CORS'), false)`), and the existing global
    Express error handler was given a case for that error so a rejected origin gets a clean
    `403 ORIGIN_NOT_ALLOWED` instead of falling through to a generic `500`. Verified live:
    a foreign origin now gets `403` with no CORS headers (the browser blocks it either way,
    but the clean status matters for legibility); `localhost:3000`, `ipoms.vercel.app`, and
    any `*.vercel.app` preview still get `200` with the right headers, unchanged.
    **Open, not fixed this session — needs your call:** `next` is pinned at `14.2.35`,
    inside the range of a `npm audit`-reported **critical** advisory bundle (RCE on
    Windows-hosted servers, SSRF, cache poisoning, others) that only clears at a major
    version bump; `xlsx@0.18.5` (real company-data import/export) carries a **high**
    prototype-pollution/ReDoS advisory with **no fixed version published upstream** at all;
    `nodemailer@9.0.5` (used for every OTP/reminder/notification email) has a **high**
    advisory bundle including domain-allowlist bypass and a DoS via `addressparser`, fixed
    in `>9.1.0`. Backend also carries 6 moderate transitive advisories (`body-parser`,
    `express`, `qs`, `morgan`, `uuid`, `exceljs`'s `uuid`) and frontend 2 more moderate
    (`uuid`, `@capacitor/cli`'s `xcode`) — none of the moderates look actively exploited
    here, but the full lists can be regenerated with `npm audit --json` on each side.
    (b) **`GET /weekly-tracker` (the full, unfiltered dataset — ~1,000 rows) measured
    p50 ≈ 3.9s / p99 ≈ 4.3s under light concurrent load (8 concurrent requests).** The
    query has no `.lean()`, so every row is a fully-hydrated Mongoose document (plus a
    `.populate('coordinator_id', ...)` and a `.toObject()` per row before the in-memory
    dedupe/partition/sort). None of the 6 compound indexes on `WeeklyTracker` lead with a
    bare `is_deleted`, so an unfiltered call (no `college_id`) can't use any of them.
    Not fixed this session (a `.lean()` swap needs a check that nothing downstream relies
    on Mongoose document methods — `row.toObject()` is called explicitly a few lines later,
    so `.lean()` may need that call removed too, not just added).
    (c) **`GET /dashboard/admin` measured p50 ≈ 2.3s / p99 ≈ 4.0s**, and **the "5:00 AM
    Dashboard Refresh" job (item 35/`finalizeDailyTracker.ts`) does not actually cache
    anything** — it runs two `countDocuments()` calls and only *logs* the numbers
    ("Campus Outreach & Conversion Analytics cache refreshed" is a log line, not a real
    cache write). So every `/dashboard/admin` load fans out live: 9 `countDocuments`
    (two of them, the missing-mobile/email counts, unindexed `$exists`/empty-string
    scans over ~3,700 `company_metadata` rows), 1 aggregate with a `$sum`, a
    `College.find()`, a `User.find()` over all active staff, 3 more parallel aggregates
    grouped by college, and a `DailyTracker.distinct('company_name')` with no index on
    `company_name`. Not fixed this session — this needs either a real cache write in the
    5 AM job or a documented decision that live-compute is acceptable at current data
    volume; flagging rather than guessing which.
    (d) **`GET /dashboard/coordinator` measured p50 ≈ 1.0s.** Lighter than (b)/(c) but
    still does 2 sequential `find`/`findOne` calls before its `Promise.all` — not urgent,
    noted for completeness.
    **Everything else tested came back clean:**
    - Unauthenticated → `401` on every endpoint tried (`/colleges`, `/users`,
      `/metadata/renumber`); RBAC → coordinator gets `403` on `/users`,
      `/metadata/renumber`, and a self-escalation attempt via `PATCH /users/:id`.
    - JWT: a garbage token and a forged `alg:none` token (valid-looking header/payload,
      empty signature, `role_codes:["ADMINISTRATOR"]`) both `401` — signature verification
      is genuinely enforced, not skippable.
    - NoSQL injection: `{"email":{"$ne":null},"password":{"$ne":null}}` on `/auth/login`
      is rejected (`401`, not a Mongoose cast/operator-injection bypass — the handler's own
      shape validation runs first); unescaped regex specials (`(`, `.*`) on `/metadata` and
      `/weekly-tracker` search no longer 500 (matches the fixes recorded in items 17/0e —
      no regression).
    - Ownership scoping: a coordinator passing another coordinator's real id as
      `?coordinator_id=` on `/daily-leads`, and passing the Administrator's id as
      `?user_id=` on `/notifications`, both silently get only their own data back —
      `scopeToSelf()` still holds (items 0f/19).
    - Brute force: 6 rapid failed logins against a nonexistent account all returned
      identical `401`s with no growing delay — **confirms the already-documented gap**
      (§8 release-gate item 6, no rate limiting) rather than finding something new; the
      3-strike lockout itself (§2) was not re-tested against a real account, to avoid
      locking anyone out.
    - Response headers: Helmet **is** actually wired (`CSP`, `HSTS`, `X-Frame-Options`,
      `X-Content-Type-Options`, `COOP`/`CORP` all present on a live response) — **this
      corrects §4 divergence-ledger row 10**, which still claimed Helmet wasn't
      implemented; only `x-request-id` from that row is still genuinely missing.
    - Background jobs: all 4 scheduled jobs (5 AM refresh, 6 AM finalize, 8 PM reminder,
      10 PM auto-sync) confirmed registered at boot and each wrapped in its own
      `try/catch`, so one job's failure can't take down the process or the other jobs.
    - Secrets: `backend/.env` is gitignored and untracked at HEAD (confirmed via
      `git check-ignore`); it only appears in commit history before it was untracked
      (already recorded in §8 release-gate item 1 — rotate those secrets if that hasn't
      happened yet).
    **Test harness** (throwaway, not committed): a hand-rolled Node load/security script
    using the platform `fetch`, since `autocannon` isn't a project dependency — avoided
    adding one. All writes during the security probes were either rejected before
    persisting or created-then-immediately-deleted throwaway rows; no real record was
    altered.

45. **Month-End Report: Calling Activity Summary + a stale-date bug fix, 22 Sep 2026
    (user-requested feature).** The user asked for the month-end report to show calls made
    and hours dedicated per college, so a coordinator's monthly effort is visible alongside
    the conversions/drives it already reports. New backend section in the `month_end`
    branch of `POST /reports/generate` (`server.ts`): `sections.calling_activity` — one row
    per college the coordinator **handles** (deliberately every assigned college, not just
    whichever single "Target Institution" the rest of the report is scoped to — the user
    asked for "each college handled by the user", a coordinator-level view, not a
    single-campus one), each with real `total_calls` and `total_duration_formatted` summed
    from `DailyTracker` for the report's month. Plus `calling_activity_totals` (a TOTAL row)
    and two new `kpi_summary` fields (`total_calls_this_month`, `total_hours_dedicated`,
    not yet surfaced as KPI cards — see below).
    **Real bug found and fixed in the same area:** the month picker in
    `ReportBuilderWizard.tsx` already resolved real `start`/`end` dates from a fixed
    `MONTH_OPTIONS` list, but they were **never sent** in the generate request — only a
    text label (`week_label`) was, so the backend derived just a month *name* by regexing
    that string, never a real date range. Wired `date_from`/`date_to` into the payload
    (those params already existed on the backend, previously used only as a single-date
    fallback for the daily-lead templates) so `calling_activity`'s query has a genuine
    range to work with. **Second bug in the same code, same pattern already documented
    elsewhere in this file (items 30/37 — hardcoded years/dates going stale):**
    `selectedMonth` state and both `newType === 'month_end'` / `initialTemplateType ===
    'month_end'` reset blocks were hardcoded to `'2026-08'` / `2026-08-01`–`2026-08-31` —
    opening Month-End on any day after August silently pre-selected an already-passed
    month. Added `getCurrentMonthOption()` (matches today's real date against
    `MONTH_OPTIONS`) and used it in all three places. Verified live: the wizard now opens
    on "September 2026" instead of frozen "August 2026".
    **Rendering surface, and why it's four separate edits, not one:** this codebase's
    report output has **no shared section-rendering component** — `NativeReportEditor.tsx`
    (the on-screen editable view *and* its own separate `window.print()` HTML-string
    builder, both inside the same file), `A4PdfPreviewModal.tsx` (a fully independent
    ~3,000-line preview modal, not importing `NativeReportEditor`), and
    `reportCanvasRenderer.ts` (the PNG/PDF canvas export) each re-implement every section
    from scratch. A new section has to be added to all of them individually or it only
    shows in whichever one someone happened to update — this is a real structural cost
    worth knowing about before adding the next section, not something to try to work
    around ad hoc. Added the table (`# | College | Calls Made | Hours Dedicated` + a
    highlighted TOTAL row) to all four; the on-screen version is deliberately **read-only**
    (no `EditableReportCell`, unlike every other month-end section) — these are computed
    Daily Tracker numbers, not a company row a coordinator would ever legitimately hand-edit.
    New wizard checkbox: "Calling Activity Summary" in the month-end sections panel,
    defaulted on.
    **Deliberately not done:** no new KPI cards for the two new `kpi_summary` totals — each
    render surface hardcodes its own fixed 3-card list for month-end (`MONTH_END_KPIS` in
    the wizard doesn't actually drive what renders), so adding cards would mean the same
    4-surface duplication problem again for a total the new table's own TOTAL row already
    shows. Skipped for now rather than expanding scope further without being asked.
    **Verified live, real data, not sample data:** generated an actual month-end report as
    Mohanaradha for September 2026 — all 4 of her assigned colleges appear
    (ACET/AIHT/KARPAGAM/KPR), ACET correctly shows 5 real calls (matching a direct API
    check against the same month range) with the other three honestly at 0, and the TOTAL
    row sums correctly. Confirmed identical numbers render in both the on-screen editor and
    the A4 PDF preview modal side by side. `tsc --noEmit` clean both sides.

46. **Second Team Leader account created, 22 Sep 2026 (user-requested) — genuinely
    `TEAM_LEADER`, not a hidden `ADMINISTRATOR`.** Malvika Kumar
    (`malvika@infoziant.com` / `malvika_kumar`) was added through the real `POST /users`
    path (same one every account goes through since self-registration was removed, item
    41), with `role_codes: ['TEAM_LEADER']` — the same role Sujitha holds, and RBAC in this
    app is role-based, not per-account, so she automatically inherits every rule that
    applies to that role: full read/write on Daily Tracker, Weekly Tracker, Daily Leads,
    and Reports (all gated to `STAFF`, which spans all three roles), User Management
    access, but **not** the Administrator-only endpoints (Role Matrix, System Config, the
    `/metadata/*` data-repair routes). The user asked for her to informally "act as the
    main administrator" without literally being one — verified live this is exactly what
    role-based RBAC already produces here, so nothing needed inventing: `POST
    /metadata/renumber` correctly returned `403` for her, `GET /users` and `GET
    /weekly-tracker` both `200`, matching Sujitha's real boundary precisely.
    **Differs from Sujitha on one deliberate point, confirmed with the user first:**
    college scope. Sujitha's 5 colleges (item 32) are a specific, named ownership set;
    Malvika was given all 21 active colleges instead, matching her broader informal role
    rather than literally duplicating Sujitha's 5 — the user picked this explicitly when
    asked, over "same 5 colleges" (which would have made them co-owners, both getting
    cross-college-edit notification emails on the same 5) and "assign later manually".
    Verified live: login succeeds, `role_codes: ['TEAM_LEADER']`, `assigned_college_ids`
    length 21.

47. **`has_all_colleges_access` dashboard tier for a full-oversight Team Leader, 22 Sep
    2026 (user-requested) — plus a real "screen told the user something untrue" bug
    found and fixed while building it.** Item 46 gave Malvika Kumar all 21 colleges, but
    the user then asked for her dashboard itself to look different from Sujitha's — no
    Active College Focus section (the 1-5 lock doesn't make sense when she already holds
    every college), no Follow-up Drives Pending banner, her own row excluded from
    "Coordinators Profile & Live Institutional Presence" (she's the one watching that
    table, not a row in it), and the Monthly Call Trend showing every college directly
    instead of a manually-selected 1-5.
    **Modeled as a reusable flag, not a hardcoded name/email check** — a new
    `User.has_all_colleges_access` boolean (Administrator-settable only, via `PATCH
    /users/:id`; a Team Leader can't grant it to themselves or anyone else). `GET
    /dashboard/team-leader` self-heals the flagged user's `assigned_college_ids` to match
    every currently-active college on each load, so "if you had any new colleges also she
    can able to use them" is satisfied automatically — no script to re-run when a college
    gets added later, since colleges in this app are added via ad-hoc scripts (there's no
    `POST /colleges`), not a path this could otherwise hook into. Response grows
    `viewer_has_full_access` and `viewer_college_ids`; `TeamLeaderDashboard.tsx` branches
    on the first to skip `FollowUpSmartQueueWidget` + `CoordinatorCollegeFocusSection`
    entirely and feeds `CoordinatorCollegeKpiCards` the second instead of the
    focus-selection state — Sujitha's branch is untouched byte-for-byte.
    **Real bug found and fixed in the same handler, unrelated to what was asked:**
    `targetLeader` (whose numbers feed "Dedicated Calling Time Today") defaulted to
    `sujithaUser` by hardcoded email whenever no `?coordinator_id=` was passed — and the
    frontend never sends one. So **every** Team Leader's own dashboard, including
    Sujitha's by coincidence-only, was silently reading Sujitha's clock, not the actual
    logged-in viewer's. Fixed by resolving the real viewer from `req.user.userId` first
    (an explicit `?coordinator_id=` — one Team Leader inspecting another's numbers — still
    wins over that default). Verified live: Malvika's dashboard now correctly reads
    "for Malvika Kumar"; Sujitha's still correctly reads "for Sujitha S", now for the
    right reason.
    **Verified live, both accounts, real data, no regression:** Malvika's dashboard shows
    the clock fix, no Focus/Follow-up sections, "All (7)" in the presence table (her own
    row excluded), and a Monthly Call Trend spanning all her colleges (ACET, AIHT, ACEW,
    DSU, MCET, NGP, HITS, KPR, KLU, KAMARAJ, …). Sujitha's dashboard, screenshotted the
    same session, is untouched: Follow-up widget present, "Active College Focus — 5/5
    Selected · Saved & Locked for Week" with her real 5 colleges, Monthly Call Trend
    capped to exactly those 5, and her own row likewise excluded from the presence table
    (7 there too — same total staff count, different person subtracted). `tsc --noEmit`
    clean on both files I touched.
    **Left alone, flagged rather than fixed:** while typechecking, two real errors turned
    up in files this session never touched —
    `frontend/src/app/reports/components/ReportBuilderWizard.tsx` (`prioritizedColleges`
    used before its declaration; an object literal with an unknown `label` property) and
    `frontend/src/app/tracker/components/TrackerRow.tsx` (calls to
    `validateAndNormalizeMultiMobile`/`validateAndNormalizeMultiEmail`, neither of which
    exist) — evidence another tool/session is mid-edit on both files in this same working
    directory right now. Not fixed here, to avoid the same collision documented earlier
    this session (item 44's aftermath) — surfaced to the user instead.

48. **"College Activity Today" replaces the personal clock for a full-access Team
    Leader, 22 Sep 2026 (user-requested).** Malvika Kumar doesn't place calls herself, so
    "Dedicated Calling Time Today" (a personal duration clock) always read 00:00:00 for
    her — meaningless. New component `CollegeActivityTodayWidget.tsx`: a horizontal bar
    per college with **any** real activity today, org-wide (not scoped to who's assigned
    where — an inactive college gets no bar at all, per the user's explicit correction
    mid-request: "we are not going to show all the colleges... just going to focus on
    the [ones] active today"), showing calls or minutes with a Calls/Duration toggle
    (same pattern as item 43's heat strip). `TeamLeaderDashboard.tsx` swaps it in only
    when `data.viewer_has_full_access` is true; Sujitha's `CoordinatorClockDurationWidget`
    is untouched.
    **Backend:** `GET /dashboard/team-leader` grows `today_college_activity` — a
    `DailyTracker` aggregate grouped by `college_id` for today's date bounds (already
    computed in this handler), gated behind `viewerHasFullAccess` so a normal Team Leader
    doesn't pay for the extra query. Resets itself at midnight with no cron: the query is
    always "today", so the next day's first load already reflects the new day.
    **Verified live, real data:** Malvika's dashboard shows 5 real colleges with genuine
    activity (SONA 24 calls, MAREPHRA 22, AIHT 18, NPR 14, DSU 1) out of her 21 — the
    other 16 correctly have no bar rather than a zero one. Bar widths are proportional
    and animate on change (`transition: width`), matching the "graph box will go up and
    down" ask. **Not re-verified in dark mode this session** — the CSS uses the same
    validated `:global(.dark)` token-swap pattern as item 43's heat strip (same file,
    same session), but an automated dark-mode screenshot attempt hit a tooling quirk
    (the theme toggle didn't take in that particular browser context) and wasn't worth
    chasing further; flagged rather than claimed. `tsc --noEmit` clean on both files
    touched (excluding the pre-existing unrelated errors from item 47).

49. **Weekly Tracker row selection is now section-specific, 24 Sep 2026 (user-reported).**
    Ticking a company in delete/move mode ticked it in every section where it appears. Cause:
    selection was a flat list of row `_id`s, and Top Companies rows are *also* listed in
    Companies in Pipeline (the list endpoint pushes them into both), so one `_id` matched
    both. Worse, bulk delete then *guessed* "this is a Top Companies delete" from whether all
    selected ids were top companies — so ticking such rows in Pipeline was treated as a Top
    Companies removal. Now `page.tsx` tracks `selectionSection` (the section the current
    selection was made in); toggling in a different section starts a fresh selection there,
    `WeeklySection` shows ticks only when the selection belongs to its own `sectionKey`, and
    `isTopCompaniesBulk` reads `selectionSection === 'top_companies'` instead of inferring
    from ids. Backend and delete/move semantics unchanged. Verified in a real browser on a
    company (Presidio) present in both sections: ticking it in Top Companies →
    checkbox states `[false, true]`. `tsc --noEmit` clean.

50. **Mar Ephraem missing from the Active College Focus matrix, 24 Sep 2026
    (user-reported).** `GET /colleges/focus-matrix` returns every *active* college to every
    user, so "visible to everyone" is purely a question of the college being active. It was
    not: only 20 of 21 came back. Cause: `syncActiveCollegesRoster()` (runs on every boot)
    normalised Mar Ephraem with two blanket `updateMany` calls that set the same **unique**
    `college_code` (`MAREPHRAM`) on every match; with a legacy `MAREPHRA` document plus a
    name-matching one that threw E11000 (`duplicate key … MAREPHRAM`) and aborted the whole
    roster sync, so Mar Ephraem was never re-activated. Now it picks one canonical document
    (already-`MAREPHRAM`, else `MAREPHRA`, else first name match), promotes just that one, and
    wraps the step in try/catch so it can never abort the rest of the sync. Verified live for
    all 9 accounts (Administrator, all coordinators, both Team Leaders): each gets 21 colleges
    including `MAREPHRAM`. **Not touched:** which coordinator "owns" Mar Ephraem by default —
    another tool was mid-edit moving it from Sujitha to Megala in `collegeSession.ts`,
    `seedDefaultCoordinatorColleges.ts` and `fixCollegeAssignments.ts` (uncommitted); this
    change is about visibility only. A second Mar Ephraem document, if one exists, was left
    alone rather than deleted.

51. **Report Builder no longer remembers choices across refresh or across users, 24 Sep 2026
    (user-reported).** `ReportBuilderWizard.tsx` auto-saved the entire wizard (template,
    college, dates, sections, remarks, …) to one browser-wide `localStorage` key
    (`ipoms_report_builder_wizard_state`) and restored it on load. So a refresh — network
    blip, power cut — brought half-finished selections back, and because the key wasn't
    per-user, **the next person to log in on the same browser inherited the previous user's
    college and sections**. Now the choices live in a module-level in-memory store tagged with
    the logged-in user's id: they survive "Back" from the editor within the same page session
    but reset on refresh, and a different login never sees them. The old `localStorage` key is
    deleted on load so stale data from earlier builds can't resurface. Also added a small
    **Reset** icon above the tab bar (same result as a fresh load: clears memory, reloads).
    Verified in a real browser: a seeded stale key (`daily_positives`) is ignored and purged →
    opens on Weekly Report with no college, no dates, default sections; picking Month-End then
    refreshing → back to Weekly Report; Reset via a real mouse click → Weekly Report. First
    placement of the icon floated above the tab box and real clicks were intercepted by
    another element (a DOM `.click()` worked, a mouse click didn't) — moved into normal flow.
    `tsc --noEmit` clean for the reports files.

52. **"Active right now" on the Team Leader dashboards is now genuinely live, 24 Sep 2026
    (user-requested).** The "Live Coordinator Deployment by College" list and the presence
    table showed anyone whose last heartbeat was within **3 minutes** (computed with
    `Math.floor` on whole minutes, so effectively up to ~4), and the client only pinged every
    25s — so a coordinator who closed the tab, lost power or dropped off the network stayed
    listed as "active right now" for several minutes. Now: heartbeat every **10s**
    (`usePresenceHeartbeat.ts`); the server treats **≤45s** since the last beat as `online`,
    **≤3 min** as `away` (e.g. a backgrounded tab the browser throttles), else `offline`
    (`presenceFromLastActive()` in `server.ts`, used by both the team-leader matrix and the
    users listing); a `pagehide` handler sends `POST /users/offline` (`fetch` with
    `keepalive`, since `sendBeacon` can't carry the Authorization header) so closing the tab
    removes that person **immediately**; the Team Leader dashboard polls every **3s** (was
    5s). A plain refresh also fires the offline call, but the first heartbeat on the next load
    flips the user back online within a second or two. New route policy entry for
    `/users/offline` (STAFF). Applies to both Malvika's and Sujitha's dashboards (same
    component/endpoint). **Verified live via the API** using a real account: heartbeat →
    `online`; `POST /users/offline` → `offline` instantly; heartbeat again → `online`;
    55s of silence → dropped out of `online` (`away`); heartbeat resumes → `online`.
    **Not verified in a real browser:** that `pagehide` actually fires the request on tab
    close (only the endpoint it calls was exercised). **Trade-off worth knowing:** Chrome
    throttles timers in hidden tabs, so a coordinator whose tracker tab sits in the background
    for several minutes will read as `away` rather than `online` — deliberate, since the
    user's requirement is "actively here right now", but it can look like a false drop.

53. **Saved Active College Focus is no longer reverted by hardcoded defaults, 24 Sep 2026
    (user-reported).** Reducing/changing focus colleges "didn't stick" after a refresh. Cause:
    six separate backend spots re-wrote users' `assigned_college_ids` from hardcoded lists:
    **every boot** (`ensureDefaultAccounts`: the `DEFAULT_COORDINATOR_COLLEGE_MAP` loop for
    all coordinators + a Mohanaradha block), **every Daily Tracker page load**
    (`GET /daily-tracker/sync-coordinators`, called by `tracker/page.tsx`, reset Mohanaradha),
    and **every Team Leader dashboard load — now every 3s** (`GET /dashboard/team-leader`
    reset Sujitha, Tamil/Seshmitha and Megala). So whatever a user saved via `lock-focus` was
    silently undone the next time any of those ran — the same class as traps 10/29 (a
    background path rewriting user data). Now every one of them only applies its default when
    the user has **no** colleges at all (a starting point, never an override). Frontend needed
    no change: every consumer re-reads the focus when its page opens, and the dashboard
    consumers already listen to `ipoms_focus_updated` / `ipoms_coordinator_colleges_changed`.
    **Verified live** (real accounts, shrunk to 2 colleges then restored exactly): Mohanaradha
    stays at 2 through a Daily Tracker load *and* a forced backend restart; Sujitha stays at 2
    through a Team Leader dashboard load. **Not fully proven:** Sujitha (after restart) and
    Megala (within ~5s, with nothing of mine running) still got their defaults re-added by
    *something else* — consistent with an **older copy of the backend still running against the
    same database (most likely the deployed one, whose polling Team Leader dashboards trigger
    it constantly, or another local `npm run dev`)**. Until that copy is redeployed/restarted
    with this change, users on the deployed site can still see their focus revert.
    **Also noticed, not changed:** `ensureDefaultAccounts` still re-attributes Daily Tracker
    rows (admin-owned → Mohanaradha for her 4 colleges) on every boot — another
    business-data write at startup, contrary to trap 10's rule.

54. **Saved chips in `MultiTagInput` are now editable in place, 24 Sep 2026 (user-requested).**
    In Daily Tracker's Add Contact Entry (and every other user of the shared chip input —
    mobile numbers, HR names, emails), a wrong value committed with Enter could only be fixed
    by deleting the chip and retyping from scratch. Clicking a chip's **text** (not the ×) now
    turns it into an inline text box with the caret at the end. Enter/Tab saves, Escape
    cancels, emptying it removes the entry, blur saves if valid. The edit goes through the
    same `validator` as a new entry, so a bad number is refused with the same warning and
    never saved. On blur with an invalid value the original is kept; a duplicate of another
    chip is also discarded. The × button, Backspace-on-empty, paste and `disabled` behaviour
    are unchanged (disabled chips are not clickable). Frontend only, `MultiTagInput.tsx` only.
    `tsc --noEmit` clean for that file. **Not verified in a browser** — the in-app preview was
    stuck on a blank 0×0 page again (same tooling failure as items 35/38); confirmed only by
    typecheck and code trace, so click a chip in a real session to check it.

55. ~~**Two anonymous endpoints leaked data, and the calling-time widget 403'd for everyone.**~~
    **FIXED 24 Sep 2026 (found by a full checkup).** (a) `GET /api/v1/meta-audit`
    (added in `45d307e`) sat above the `authenticateJWT` mount and returned every flagged
    company's HR name, phone and email — 487 records — to a caller with no token. (b)
    `GET /health/duplicate-audit` (no `/api/v1` prefix, so the policy table can't see it
    either) returned the Active Leads duplicate report, 236 KB, anonymously. Both now carry
    their own `authenticateJWT, authorizeRoles('ADMINISTRATOR')` (the same pattern as
    `daily-leads-diagnostics`), and `/meta-audit` also has a policy entry. **Lesson, third
    time: any route registered above the `app.use('/api/v1', authenticateJWT)` line needs its
    own middleware; `verify:policy` only proves routes have a policy, not that the gate runs.**
    (c) `GET /dashboard/coordinator/clock-duration` and `/duration-history` had no policy
    entry, so default-deny returned 403 to every role and the Dedicated Calling Time widget
    was dead — added (`STAFF`; handlers already `scopeToSelf`). Verified live: both audit
    routes anon 401 / coordinator 403 / admin 200; both duration routes coordinator 200
    with real data. `verify:policy` 108/108, `tsc --noEmit` clean.

56. **Checkup follow-ups, 24 Sep 2026.** (a) ~~Boot rewrote Daily Tracker ownership~~ —
    `ensureDefaultAccounts` re-attributed **every** ACET row to Mohanaradha (whoever entered
    it) and every admin-owned row in her other three colleges on each start. Now behind
    **`REATTRIBUTE_TRACKER_ON_BOOT=true`**, default off (trap 10/29 rule). Rows already moved
    stay moved; new admin-owned rows for those colleges will no longer be auto-moved.
    (b) `AddCompanyModal.tsx` (another tool's uncommitted WIP) lost its `companyType` state
    line, breaking `tsc` in 6 places; restored that one line only — **its other WIP
    (stipend/LPA "Both" CTC mode) is still uncommitted and unreviewed.** (c) Backend
    `npm audit fix` (non-breaking, lockfile only): 7 → 3 advisories (express/body-parser/qs/
    morgan cleared). Remaining and deliberately not forced: `xlsx` high (no upstream fix, both
    sides), `exceljs`/`uuid` (fix is a *downgrade*), frontend `next` critical/`postcss` high
    (fix is a major jump to Next 16 — needs its own migration), `@capacitor/cli` moderate.
    `nodemailer` was already on a fixed version (9.1.1).

57. **"My JD" tab added to Daily Leads, 24 Sep 2026 (user-requested).** The header tab strip is now
    Positives / JD Received / My Positives / **My JD**. My JD is the JD-Received twin of My
    Positives: every JD (`lead_type=jd_received`) ever recorded for the viewer's handled (focus)
    colleges, **all-time from the first record** (date filter defaults to "All Dates"), with the same
    college and date filters, table and count badge. Implemented by giving `MyPositivesTab.tsx` a
    `leadType` prop (default `'positive'`, so My Positives is unchanged) and a fourth
    `LeadsHeader.tsx` button; `page.tsx` fetches both all-time lists in `loadSummary` and counts
    each against the focus set. Both tabs are live views over the saved `daily_leads` rows, not
    separate copies — a lead deleted from the day tabs leaves them too. **Verified live** as
    Mohanaradha: My JD showed her 3 AIHT JDs, My Positives still 17. **Known pre-existing quirk,
    not changed:** `getDefaultOfficialCollegeIdsForUser` needs the cached college list; in a
    brand-new browser session (cold cache) My Positives/My JD fall back to *all* colleges in the
    table while the badge shows 0, until the cache warms. `LeadsTabBar.tsx` is imported by
    `page.tsx` but never rendered (dead), so only `LeadsHeader.tsx` carries the tabs.
    **Next.js 16 upgrade (same day):** branch `next16-upgrade` (`bc5750e`, pushed) — Next 14.2.35 ->
    16.3.6, React stays 18.3.1. Clears the critical Next advisory and the `postcss` high; build,
    typecheck and a light/dark browser comparison of 8 main screens against the current build
    showed no differences or console errors. Not merged; needs a Vercel preview look first.
    Stray `frontend/coord.json` / `coord_token.txt` (an expired coordinator token) were untracked and
    gitignored (files kept on disk; still in old history).

58. **Hourly Rhythm bars now show Invite Mail and JD Received, 24 Sep 2026 (user-requested).** In
    `CoordinatorClockDurationWidget.tsx` a bar is **green** when any call that hour was an Invite Mail
    (already the case on the coordinator dashboard) and **fuchsia** when any call that hour was JD
    Received (previously it fell into the plain indigo bar); an hour with both is split half/half. Fuchsia
    was chosen because green is taken by Invite Mail, indigo is the default bar, and amber/blue/rose are
    the Not Hiring / Follow Up / Negative chips. A small legend appears only when a coloured bar exists.
    It is per viewer's own calls that day, any college (the widget is keyed to the coordinator, not a
    college), and recomputes daily since the data is "today" (or the selected date). Backend: new
    `hourly_jd` array beside `hourly_positives` in `/dashboard/coordinator`, `/coordinator/clock-duration`
    and `/coordinator/duration-history`; the Team Leader dashboard (Sujitha) previously returned neither
    array, so it now returns both (invite_mail / jd_received only). **Malvika Kumar's dashboard is
    unchanged** — she gets `CollegeActivityTodayWidget`, not this widget. Verified live as Mohanaradha:
    12p green (Invite Mail), 2p fuchsia (JD Received), legend shown, no console errors; Sujitha's endpoint
    returns 24-slot arrays. **Not verified:** dark mode (the app toggles a `.dark` class, which the test
    browser's colour-scheme setting doesn't trigger) and a split (both-in-one-hour) bar.

59. **Monthly Call Trend: JD Received day squares + tooltip, 24 Sep 2026 (user-requested).** The hover
    tooltip on a day square now lists exactly Positive, Not Hiring, Follow Up and **JD Received**
    (JD Received replaces Negative there). A day with at least one JD Received call for that campus is
    drawn **fuchsia** instead of its blue heat shade (same fuchsia as the JD bars in the Hourly Rhythm,
    item 58), with a "JD received" entry added to the legend and the JD count added to the cell's
    aria-label. Backend: `GET /dashboard/monthly-calls` series now include `daily_jd` (per-day count of
    `outcome_status === 'jd_received'`; JD otherwise sits in the un-shown Other Progress bucket).
    **Deliberately unchanged:** the outcome columns on the right of the strip (Positive / Not Hiring /
    Negative / Follow Up) still show Negative — only the tooltip was asked to change; tell me if the
    columns should swap too. Applies to every dashboard that renders `CoordinatorCollegeKpiCards`
    (coordinators, Sujitha, Malvika). Verified live as Mohanaradha: AIHT on 24 Sept drawn fuchsia
    (rgb 192,38,211), tooltip "3 calls . 4m logged | Positive 1 . Not Hiring 0 | Follow Up 0 . JD
    Received 1", no console errors. Dark mode not seen (same `.dark` toggle limitation as item 58).

60. **Daily Tracker contact transfer ("Move to another college") made to actually work, 24 Sep 2026.**
    Another tool built the feature (out-of-focus warning modal, origin tracking via
    `original_college_id` / `original_coordinator_id` on `DailyTracker`, a `Shared (CODE)` badge, and a
    "Send Back to Source" button) and I tested it with marked throwaway rows. Four things were broken and
    are fixed: (1) **the receiver never saw the contact** - `POST /daily-tracker/bulk-move` changed the
    college but not `coordinator_id`, and `/daily-tracker/today` only lists a coordinator's own rows. A
    move now hands the row to the coordinator who handles the TARGET college (Placement Coordinator
    preferred over Team Leader; all-colleges oversight accounts ignored; if the sender already handles the
    target it stays with them; if nobody handles it the row stays with the sender). (2) the badge never
    rendered because `/today` returned no `original_college_code/name` - it now populates them plus
    `original_coordinator_name`. (3) the Send Back handler called a non-existent `loadDailyTrackerRows`
    (also a `tsc` error that would have failed a Next build) - now `loadTodayRows()`. (4) Send Back returns
    the row to the ORIGINAL coordinator and college and clears the markers; only a real change of owner
    sets the "Shared" marker. After a move to someone else's college the sender's page now stays put and
    refreshes instead of switching to a college whose rows are no longer theirs. **User decision: call
    timing (`call_start_time`, `call_end_time`, `duration_seconds`) is deliberately cleared on every
    transfer** so the receiver starts a fresh entry - this removes the sender's calling minutes for that
    call and it is NOT restored on Send Back. Still not fixed: `bulk-move` has no ownership check (any
    logged-in user can move any row by id). **Verified live** (throwaway row, deleted after, 0 left): move
    AIHT->NGCE puts it on Malavika's sheet with `Shared (AIHT)` / origin coordinator Mohanaradha and hides it
    from Mohanaradha; Malavika's Send Back returns it to Mohanaradha's AIHT and clears markers; a move
    between colleges the same person handles changes no owner. In a real browser as Malavika: badge shown,
    Send Back button appears on selection, confirm names the source college, no page errors. **Process
    slip, recorded:** my rhythm-bars commit `530a7b9` staged the whole of `server.ts` and so swept in this
    tool's uncommitted transfer handler while its model fields were still uncommitted (the committed tree
    would not have compiled); the model, modal, row and page changes are now committed together.

61. **Transfer redesigned as "copy to the receiver", 24 Sep 2026 (user decision - supersedes the
    hand-over and timing-wipe parts of item 60).** The first version moved the row itself and cleared
    its call timing, which permanently erased the sender's real calling minutes. Now
    `POST /daily-tracker/bulk-move` does one of two things per row: (1) target college is one the
    sender handles (or nobody handles): a real **move** inside the sender's own sheet, **call timing
    kept**; (2) target college belongs to another coordinator: the sender **keeps the original
    untouched** and the receiver gets a **copy** of the contact (company, HR, mobile, email, comments)
    with **no start/end/duration and no outcome** (an outcome would otherwise count as the receiver's
    own completed call and inflate their dashboard), marked `original_college_id` /
    `original_coordinator_id` so it shows the `Shared (CODE)` badge. The receiver may fill in their own
    times and save it or simply delete it; neither affects the sender. A repeat send of the same
    company+mobile to the same receiver that day is skipped ("already on their sheet"). Linked Daily
    Leads / Weekly Tracker rows are cascaded only for real moves. **Ownership check added:** only a
    row's owner or a supervisor may move/share it (`403 FORBIDDEN_NOT_OWNER`), closing the old
    "anyone can move anyone's rows" gap. **Send Back removed** (with copies there is nothing to send
    back - the receiver just deletes the copy). The out-of-focus confirmation now also says a copy goes
    to the other coordinator and the original stays. The owner of a target college is picked as in
    item 60 (Placement Coordinator over Team Leader, all-colleges oversight accounts ignored).
    **Verified live** with a throwaway row (0 left): own-college move kept `dur=300`; send to Malavika
    left Mohanaradha's original intact and gave Malavika a timing-less, outcome-less copy tagged
    `Shared (ACET / A.Mohanaradha)`; a repeat send was skipped; Malavika moving Mohanaradha's row got
    `403`; Malavika deleting her copy left the original untouched. `tsc --noEmit` clean both sides.
    **Not re-checked in a browser this round** (the earlier browser check covered the old Send Back).

62. **"I copied to MCET but can't see it in MCET" - Copy now behaves like Move, 24 Sep 2026
    (user-reported).** Cause: the Copy button (`mode: 'copy'`) still created the duplicate under the
    *sender's own* name. But the Daily Tracker page opens any college outside the user's focus as a
    read-only view of the coordinator who handles it (`tracker/page.tsx`, the "College is outside user
    focus" branch), so a coordinator's own rows in someone else's college are hidden there - yet they
    still counted on the sender's dashboard (timing and outcome were copied too). Now
    `POST /daily-tracker/bulk-move` with `mode: 'copy'` to a college another coordinator handles sends
    them a timing-less, outcome-less copy exactly like Move (item 61; shared helper `shareCopyWith`),
    with the same duplicate skip and owner-only check; Copy into a college the sender handles is
    unchanged (an own copy). The page no longer jumps to the target college after sending copies to
    someone else. Verified live with throwaway rows (0 left): Copy AIHT->MCET gave Seshmitha
    (MCET's coordinator) a copy with no timing/outcome tagged `Shared (AIHT / A.Mohanaradha)` and gave
    Mohanaradha nothing in MCET; Copy AIHT->ACET (both hers) still made her own copy with timing.
    **Left for the user to decide:** two pre-existing stray rows ("Revature LLC.", 40s, no_response,
    created 15:54 and 16:11 IST) sit in MCET under Mohanaradha from the old Copy behaviour - hidden on
    screen but counted in her dashboard totals.

63. **Move vs Copy in the Daily Tracker settled, 24 Sep 2026 (user decision - supersedes items 61/62 for
    Move).** **Copy and Switch:** the sender keeps the original (timing and status intact); if the target
    college is another coordinator's, they get a copy with no start/end/duration and no status, to fill
    in or delete. **Move and Switch:** the contact leaves the sender's sheet completely - the sender's
    calls, minutes, outcome counts, hourly rhythm and log all drop by that row (they are all derived from
    `daily_tracker`) - and the receiving coordinator gets it as a blank fresh entry (option A: no timing,
    no status carried over). Moves between colleges the sender handles keep everything, timing included.
    Linked Daily Leads / Weekly Tracker entries are deliberately **left alone** on Move (they record a
    result the sender achieved; the tracker row's delete route would have cascade-soft-deleted them, so
    Move uses a plain `deleteOne`). If the receiver already has the same company+number that day the row is
    skipped and stays with the sender ("already on their sheet, so kept on yours"); finalized rows are
    skipped. Both buttons "Switch": afterwards the page opens the target college through the new
    `selectCollegeWorkspace()` (extracted from the college dropdown), which shows another coordinator's
    college as their read-only sheet. **One simple confirmation for BOTH buttons** when the target is
    outside the sender's focus selection: "This college (CODE) is out of your focus. Do you still want to
    continue?" with Cancel / Continue (Cancel sends nothing). Verified live: API test with throwaway rows
    (0 left) - own-college move kept `dur=300`; Move to Seshmitha removed it from Mohanaradha, gave her a
    blank copy, and Mohanaradha's dashboard returned to its pre-test count and seconds (5 calls / 342s);
    a duplicate Move was refused and the row stayed. Browser: the popup shows for both Copy and Move to
    MCET and Cancel fires zero `bulk-move` requests. **Not exercised in the browser:** the actual
    Continue + switch to the other coordinator's read-only sheet (covered only by the API test and code).

64. **Active Leads "Resolve Multiple Company Roles" popup no longer re-asks about resolved companies,
    24 Sep 2026 (user question -> fix).** Purpose: Active Leads keeps ONE row per company (identity =
    normalised company name) while the Weekly Tracker can hold several rows for the same company with
    different job roles; on sync the user picks whether to merge the roles into that one row or keep a
    single role. Bug: `POST /active-leads/sync` flagged every company whose Weekly rows had more than one
    role and never checked whether the Active Lead row already contained them, and nothing is remembered
    after clicking OK - so the popup came back on every sync (267 companies, of which 258 were already
    fully merged; Fristine Infotech lists all 5 roles in its Active Lead yet was flagged each time). Now a
    company is a conflict only if it has more than one role AND the Weekly Tracker has a role (compared
    trimmed / lower-cased / whitespace-collapsed) missing from the existing Active Lead row, or no
    Active Lead row exists yet. The apply path (resolutions, merge, keeping the existing role for
    unflagged companies) is unchanged. Verified with the read-only `check_only` call: 267 -> 9 (all 9
    genuinely have a new role, e.g. Novatech, NEOMETRIX, Happy Connects); the real (writing) sync was
    not run. `tsc --noEmit` clean.

65. **"Confirm & Update" in the role-conflict popup saved nothing, 24 Sep 2026 (user-reported, follow-up to
    item 64).** `DuplicateResolutionModal.tsx` built its `resolutions` state with `useState(() => ...)`
    from the `conflicts` prop, but the modal is always mounted (page renders it with `conflicts=[]`), so the
    initializer ran once on an empty list and the state stayed `{}`. The "Merge (Recommended)" choice was
    only a visual fallback, so unless the user clicked every radio (or "Merge All") Confirm sent
    `resolutions: {}`. The backend correctly refuses to write without resolutions and answers
    `success:true, has_conflicts:true`; the page took that `success` as done, closed the popup and toasted
    "resolved" - nothing was saved, so the next sync flagged the same companies. Fixed both ends: the modal
    now builds the full set (state entry, else the default merge) at submit, and the page only treats the
    response as resolved when `has_conflicts` is false (otherwise it shows "Nothing was saved"). Verified in
    a real browser with the write request blocked: Confirm with no radio touched sends 9 merge resolutions
    (ELEATION -> "CAE Project Engineer, Graduate Trainee", etc.). The real write was NOT run by me - the
    user confirms once for real, after which `check_only` should return 0 conflicts. **Separate finding,
    not changed:** 69 company names have more than one non-deleted `active_leads` row (case-insensitive),
    and the sync's `activeMap` keeps only the last row per normalised name.

66. **Weekly Tracker "Paste" button, 24 Sep 2026 (user-requested feature, design agreed before building).**
    A green **Paste** button next to Sync (all roles, incl. Malvika Kumar; disabled until a real college is
    selected). Flow: (1) tick which columns you are pasting - **Company name is always the first column** (it is
    the key) plus any of Role, CTC, Contact, Email, Follow-up date, JD received date, DB shared date; presets
    "Entire" (Company, Role, CTC, Contact, Email) and "Company name only"; (2) paste from Excel/Sheets (tab
    separated; quoted multi-line cells handled; a header row starting with "Company" is skipped; up to 200
    rows); (3) preview - the server checks every row and says New / Update / Skipped with the reason; if new
    companies would be created the user must pick which of the **9 sections** they go into (Apply stays disabled
    until chosen); nothing is saved until Apply. `POST /api/v1/weekly-tracker/bulk-paste` (new
    `lib/weeklyPasteRoutes.ts`, registered after the Active Leads routes) serves BOTH the preview
    (`dry_run:true`) and the save through one planning function so they cannot disagree. Rules: Contact/Email
    validated by the same Indian mobile/landline + email rules as the screen (`lib/contactRules.ts` is a
    **mirror of `frontend/src/lib/contactValidation.ts` - change both together**; the older, smaller
    `lib/contactValidation.ts` is a different file used by `scripts/autoCleanMetadataContacts.ts`);
    Follow-up date must be today or later (IST), JD-received / DB-shared may be past; dates day-first
    (DD/MM/YYYY, DD-MM-YYYY, 12 Oct 2026, ISO), invalid/impossible dates refused; Contact, Email and Role are
    ADDED to what a row has (duplicates skipped, nothing overwritten) and new contacts/emails are also added to
    the Metadata record (as editing by hand already does); CTC and dates replace the current value; blank
    cells never erase; a bare CTC "3-6" becomes "3 - 6 LPA". **New rows are created only when no date column is
    pasted**, and only if the company is in Metadata (same rule as adding by hand); role defaults to "Graduate
    Trainee" and status to "Added via Paste" (CTC may be blank - shown as a warning). A company already in the
    college is found by the name the tracker uses (falling back to Metadata's spelling); a company with 2+ rows
    in one college is refused ("edit them directly"); a company twice in one paste is refused. Foreign-college
    warning reused (`executeWithForeignCheck`, now with an optional cancel callback) and the college owners get
    ONE notification for the whole paste. The whole paste is one **undo step** (creates are removed, updates
    restored from saved "before" values; contacts already added to Metadata are not removed). **Verified:**
    server previews and a real save/undo with a throwaway Metadata company (all removed afterwards): refused
    without a section, refused past follow-up date, refused dates for a company not on the tracker, role
    de-duplicated case-insensitively, phone/email merged and synced to Metadata, undo restored the row; and in
    a real browser as Mohanaradha on AIHT: step 1/2/3, 9 sections listed, Apply disabled until a section is
    chosen, 1 valid row applied while an unknown company and a bad phone/email row were skipped, page
    updated, no errors. **Process slip, fixed before commit:** my first backend validator copy overwrote an
    existing `lib/contactValidation.ts`; restored from git and the mirror renamed. **Not tested in a browser:**
    the undo button after a paste, pasting into a college you don't handle (foreign warning), dark mode.

67. **Weekly Tracker Paste redesigned around the section and the companies already there, 24 Sep 2026
    (user decision - supersedes the flow (not the rules) of item 66).** The first version was too large
    in type and asked for the section last from all 9. Now: **Step 1** asks, in order, (1) which section -
    only **Companies In Progress** or **Companies in Pipeline** (the two the user uses; the server
    now accepts only those two), (2) what to do - *Fill in details for companies already here* or *Add new
    companies*, (3) which columns (Contact, Email, Role, CTC; plus the three dates in fill mode only). **Fill
    mode Step 2** lists that section's existing companies (taken from what the page already loaded, so no
    extra request) with checkboxes, search, "Only without contact (n)" and select-all; the user ticks only the
    companies they have data for (e.g. 5 of 15). **Step 3** shows the ticked companies numbered in list order
    and asks for one pasted line per company in that order (blank cell = leave that company as it is); the
    Preview button stays disabled until the pasted line count equals the ticked count. **Add mode** skips the
    picking: paste Company name + columns, new rows go into the chosen section. **Step 4** is the server
    preview (New / Update / Skipped with reasons), then Apply. Fill mode addresses rows by exact
    `row_id` (new optional field on `POST /weekly-tracker/bulk-paste`), so duplicate or differently spelled
    company names cannot hit the wrong row; every other rule from item 66 is unchanged. UI type moved to the
    app's own scale (`text-xs` body, `text-[11px]` hints, `text-sm` title). **Verified in a real browser as
    Mohanaradha with three throwaway companies (all removed):** section question first with two options; list
    search; ticking 2 of 3 and pasting 2 numbers - a 1-line paste against 2 ticked was blocked with "they must
    match"; Apply saved numbers on exactly the 2 ticked companies and their Metadata records while the
    unticked one stayed empty; no page errors. **Not tested:** Add-new-companies through the new UI, the date
    columns through the UI, the Undo button after a paste, dark mode.

68. **Weekly Tracker Paste: the paste box is now a small editable table, 24 Sep 2026 (user decision).**
    The user asked whether people could type columns separated by double spaces; rejected because values
    themselves contain spaces ("Data Engineer", "3 - 5 LPA", "98765 43210", company names), one stray space
    would shift every value into the wrong column, and nothing shows the mistake until preview. Step 3 is now
    a table: **fill mode** lists the ticked companies down a locked left column with one editable cell per
    chosen column; **add mode** has a Company name column plus the chosen columns, starts with 6 blank rows,
    "Add 5 rows" (max 200) and "Clear table". Type into cells (Tab moves right; Enter moves down in fill mode
    and to the first cell of the next row in add mode; arrow up/down) **or paste from Excel/Sheets**: a
    multi-cell paste is spread from the clicked cell (a header row starting with "Company" is skipped in add
    mode; rows beyond the ticked companies / 200 are left out with a note). Cells are checked live and turn
    red with the reason on hover (contact, email, date formats, follow-up not in the past, "Company name is
    needed"); a summary line counts them; rows with a problem are skipped, not blocked. Empty rows are not
    sent. Preview/Apply and every server rule from items 66-67 are unchanged (the client date check mirrors the
    server's and the server stays the authority). **Verified in a real browser (throwaway companies, all
    removed):** fill mode - typed "12345" showed a red cell with a reason, a 2-line block pasted into the first
    cell filled both rows and cleared the red, Apply saved only the 2 ticked companies; add mode - typing a full
    row with Tab, "4-5" became "4 - 5 LPA", the new company was saved with role/contact/email, a row with no
    company name was reported and skipped, "Add 5 rows" grew the table, Enter starts the next row at column 1,
    and no horizontal scroll after narrowing the columns. **Not tested in a browser:** the date columns
    through the table, the Undo button after a paste, dark mode.

69. **Daily Leads Sync now carries the Daily Tracker email into the lead, 24 Sep 2026 (user-requested).**
    My Positives / My JD showed "Click to add email" even when the coordinator had already typed the HR email in
    the Daily Tracker, because `POST /daily-leads/sync-positives` never copied it and the tabs kept an email as
    the text "Email: x" inside the lead's **remarks**. That storage had a side effect: `PATCH /daily-leads/:id`
    cascades `remarks` into the linked Weekly Tracker rows' `current_status_text`, so typing an email in My
    Positives overwrote the Weekly status text with "Email: ...". Now `DailyLead` has its own `email_id`
    (default ''). Sync: a new lead takes the tracker row's `email_id`; an existing lead whose email is EMPTY
    (and has no legacy "Email:" remark) is filled from the tracker on the next sync; a typed email is never
    overwritten; the sync message reports "(n email(s) filled in)". Manual add, Move to JD, and both Copy-to-JD
    paths carry `email_id`. `PATCH /daily-leads/:id` accepts `email_id` and validates it with the same rules as
    everywhere else (`lib/contactRules.ts`, 400 `INVALID_EMAIL` otherwise). `MyPositivesTab` shows
    `email_id`, falling back to the old "Email:" remark text so nothing already typed disappears, saves to
    `email_id` (with the same validation on screen), and the page bumps a refresh token after Sync so the emails
    appear without leaving the tab. Users type an email only when the tracker had none. **Verified** with
    throwaway calls in KARPAGAM (removed): a synced positive got the tracker's email, a JD lead with no tracker
    email stayed blank, an invalid email got 400, a valid one saved with remarks untouched, re-sync did not
    overwrite it, an emptied lead was refilled when the tracker gained an email; in a real browser both tabs
    showed the emails and on-screen editing refused a bad email and saved a good one. **Not done (offered):** a
    one-time backfill - of 299 active leads, 292 have no email; only 19 are linked to a tracker call that has an
    email (18 positives, 1 JD); the other 272 are not linked to any tracker call and must be typed by hand or
    matched some other way. Emails typed earlier via the old remarks route were not migrated (still displayed).

70. **My Positives / My JD table type set to the user's spec, 24 Sep 2026 (user decision).** One component
    (`MyPositivesTab.tsx`) renders both tabs. Column headings are now **12px uppercase bold**; every body cell -
    S.No, Date, Time, College badge, Company name, Job role, CTC badge, Email (and its edit box / Save) - is
    **10px, weight medium (500)**. Before: headings 10px; body 12px with mixed weights (company name 14px
    extra-bold, CTC/date/S.No bold, time semi-bold, college extra-bold). The two summary cards above the table
    were not changed (10px labels, 14px numbers). Measured in a real browser after the change: header 12px/700,
    all eight cells 10px/500. Note: these are hard-coded pixel sizes (the app's token scale is 12/14/16/20);
    done as an explicit user instruction. **Revised the same day:** body cells raised from 10px to **12px medium**
    (headings stay 12px bold, so header and body are now the same size; weight tells them apart). Re-measured:
    header 12px/700, all eight cells 12px/500. **Column widths (user spec, same day):** cell padding
    `px-4` (32px) -> `px-[15px]` (30px per column); the table is now `table-fixed` with Job Role **280px**,
    CTC **250px**, Email **400px**, Company Name **190px** (my choice - not specified - so the table fits a
    1600px screen without sideways scroll), and the existing S.No 48 / Date 112 / Time 96 / College 112.
    Measured at 1600px: 48/112/96/112/191/281/251/401 = 1492px, no horizontal scroll. On narrower screens
    (e.g. 1366px) the table is wider than the screen and scrolls sideways. Long role lists and multiple emails
    wrap onto a second line instead of widening the column. CTC at 250px is much wider than the badge needs
    (~60px) - a deliberate user number. **Revised again the same day** ("why so much gap" - the 250px CTC
    column left the centred badge ~75px of empty space each side): Company Name 210px, Job Role 250px, CTC
    130px, Email = whatever width is left (no fixed width; left-aligned so the spare width is blank space at the
    far right edge, not a gap between columns). Measured: 1600px -> 48/112/96/112/210/250/130/534 = 1492px,
    1366px -> Email 300px, table 1258px; no horizontal scroll at either size.

71. **Daily Leads bulk "Move to JD" window removed, 24 Sep 2026 (user decision).** The amber copy-icon button
    on the Positives tab opened `CopyToJdModal` (pick one positive company, tick focus colleges, copy it into
    JD Received for several colleges at once). With only ~5-10 positives and JDs a day the user judged it
    unnecessary. Removed: the header button and its prop in `LeadsHeader.tsx`, the state/import/render in
    `daily-leads/page.tsx`, and `components/CopyToJdModal.tsx` itself. **Kept:** the per-row "Move to JD" button
    in the Positives table (single-company move), Sync, Add, Delete. **Left in place, now unused by the UI:** the
    backend `POST /api/v1/daily-leads/copy-to-jd` route (two flows; the modal was its only caller) - it can be
    deleted in a later cleanup. Verified in a real browser: 0 header "Move to JD" buttons, Sync/Add still
    present, 6 per-row "Move to JD Received" buttons still present, no page errors; `tsc --noEmit` clean.

72. **"Did you send all the emails for today's positives?" question, 24-25 Sep 2026 (user-requested;
    redesigned four times - THIS is the final version, agreed with the user line by line on 25 Sep).**
    Earlier builds used fixed 5:00/5:30 PM windows, then a 15-minute timer per Invite Mail call with a
    30-minute retry; the user removed both ("we're confusing a lot... avoid multiple popups"). **There are
    NO popups during the working day.** Who: Placement Coordinators and a normal Team Leader (Sujitha);
    **never** the Administrator or a full-oversight Team Leader (`has_all_colleges_access`, Malvika Kumar).
    About: Invite Mail calls (the "positive" outcome) in the person's focus colleges. **Monday-Friday only**,
    on the server's IST clock (`backend/src/lib/emailCheckRoutes.ts`; `GET /email-check/status?kind=`,
    `POST /email-check/answer`; collection `email_checks`, one row per person per day).
    **TODAY's positives - closable, with Pick time:** (1) `signout` - they click Sign out **at or after
    5:00 PM** (before 5 PM nothing is asked and the client does not even call the server); (2) `login` - the
    first time the app opens in a browser session, after 5 PM; (3) `timed` - the time they picked for today
    arrives. **At most two of these per day.** **Yes** = the day is finished (`status:'yes'`), a later "no"
    cannot undo it (calls stop at 6 PM; known narrow edge: a call logged 5-6 PM *after* a Yes is not
    re-asked). **Close / Esc** = unconfirmed, so tomorrow's question follows. **Pick time** now chooses a
    **date and a time**: **Today**, or the **next working day** (Monday if today is Friday) - nothing else is
    offered (server refuses any other date with `BAD_DATE`). Picking the next working day means **nothing at
    all is asked for the rest of today** (no sign-out, no login question).
    **YESTERDAY's positives - the PREVIOUS WORKING DAY only - are STRICT (user decision):** the question has
    **Yes only**: no Pick time, no X, Esc and clicking outside do nothing, and the **Daily Tracker stays
    locked until they answer**. It appears (4) `next_day` - **the moment the Daily Tracker is opened, every
    time it is opened, until Yes** (no once-a-day limit) - and (5) `timed` - at the date+time they picked,
    **on ANY page/module** (the server hands back `remind_at`; a light client timer asks again then).
    Safeguards the user approved: a **"Leave the Daily Tracker"** link (goes to the Dashboard; the tracker
    stays locked) so nobody is trapped, and **fail-open** - if the server errors or is slow, the popup is
    skipped and nobody is locked out. **Older days are never asked about**, so a day's positives are settled
    today or on the next working day and never dragged on: someone who does not open the Daily Tracker on
    that next working day simply drops that day (Tuesday asks about Monday, never Friday). A picked time
    for a past day is impossible. Sign-out is **never blocked** (3 s cap, any error -> straight through).
    **Wiring:** `UserSignOutButton.tsx` (the one shared sign-out button, ~17 pages) awaits
    `runSignOutGate()` (`lib/emailCheckGate.ts`); `EmailCheckPrompt.tsx` (mounted once in `AppShell.tsx`)
    registers the gate. Checks are queued, not dropped. The `sessionStorage` login mark is written when its
    timer fires, not up front (React dev mounts effects twice; an early mark made the login check silently
    never run). UI: 400px centred card (capped to the window height), envelope icon (deliberately not a
    Gmail/Outlook mark - trademarks), the day's companies with college chip and call time, **Yes, sent** /
    **Pick time** side by side, inline picker: **Today / next-working-day cards** (with dates), 3 quick
    chips, two snap-scrolling wheels + AM/PM pill, all in medium type (14-15px wheel rows, 12-13px chips).
    **`EMAIL_CHECK_START_DATE` (default `2026-09-26`) is the go-live guard** - earlier days are never asked
    about; **set it to the real deploy day**. Policy entry `/email-check` (STAFF); `verify:policy` OK.
    **Verified:** 41 simulated-time checks against real accounts with throwaway rows (all removed) - 5:00 PM
    boundary, two-a-day cap, Yes surviving a later "no", strict question repeating on every tracker open,
    only-the-previous-working-day (Friday asked on Monday, dropped on Tuesday, weekend skipped), pick-for-
    tomorrow silencing the rest of today and firing strictly at that time on any page, a time picked for a
    past day refused, go-live guard, weekend silence; a real-browser run with a faked clock and mocked server
    (Pick time -> Monday card -> 10:30 payload then sign-out; strict question with no X / Esc and outside-
    click doing nothing; Leave link records nothing and the question returns on re-entry; picked time firing
    on Weekly Tracker not before it; a 500 from the server leaves the tracker usable; Esc on today's
    sign-out still signs out); live routes over HTTP (bad date 400, past-day snooze 400, no token 401,
    nothing written). **Not verified:** a genuine 5 PM sign-out or a real 10:30 AM reminder on the real
    clock, dark mode of this final version, sign-out from all ~17 pages (one shared component, exercised on
    the dashboard only), and the Daily Tracker lock on a phone-width screen. **Known limit:** "Yes" is a
    self-declaration - the app cannot see whether an email was really sent; a per-person view for Team
    Leaders/Administrator was suggested and not built.

73. **Weekly report showed fewer companies on one coordinator's laptop, 25 Sep 2026 (user-reported;
    Thirisha R / DSU: 30 pipeline and 10 top companies, report showed 6 top).** Same login on every other
    laptop was correct. Cause, verified against the live data: **the report's "Graduating Academic Batch"
    filter compared a BATCH (2027) against `academic_year`, which is the SEASON a row was created in.**
    Since the season switch (item 37) rows created after ~21 Sep carry `academic_year: 2026` but
    `eligible_batch: "2027 Batch"`, so a 2027 filter silently dropped every such row - **138 of 995 weekly
    rows org-wide**, incl. DSU's four newest top companies (ST Lumax, 8OL Robotics, SPK power, Avaali) -
    exactly 10 -> 6. Why only her browser: the two **Daily** report templates force the batch to `2027`
    (`getDefaultGraduatingBatch()`), and (a) `handleCategoryChange` never reset it when she moved on to the
    Weekly report, and (b) the pre-item-51 build also saved it in `localStorage`
    (`ipoms_report_builder_wizard_state`), which sign-out, refresh and a restart do not clear - so her
    browser restored 2027 for every weekly report while a fresh laptop defaulted to All Batches. **Fixes:**
    (1) server: new `batchOrYearClause()` in `server.ts` - a 4-digit batch filter now matches `academic_year`
    **or** `eligible_batch`; applied (AND-ed via `$and`, so callers' own `$or` still works) to
    `GET /weekly-tracker` and the three `POST /reports/generate` weekly paths (single college, multi
    college, pending-tasks fallback); the "empty -> retry without year" fallbacks delete `$and`.
    **This alone fixes Thirisha with no change on her laptop once the backend is deployed.** (2) frontend:
    `handleCategoryChange` resets the batch to `all` for every non-daily template. (3) the college dropdown
    printed the code twice (`[DSU] [DSU] Dhanalakshmi...`) because `SmoothSelect` draws the `badge` itself and
    the option label also began with `[CODE]` - the label is now the college name only (search by code still
    works: the search also checks the badge); this is the one selector all six report types use.
    **Verified:** live DSU report via `POST /reports/generate` - `academic_year=all` and `=2027` both return
    30 pipeline / 10 top / 6 in progress (2027 previously returned 26 / 6 / 5); `=2026` returns only the 4+1
    season rows; real browser: Daily Positives shows "2027 Batch", switching to Weekly shows "All Batches",
    dropdown rows show one `[CODE]`; `tsc --noEmit` clean both sides. **Not changed (same latent mismatch,
    lower impact):** `weekly-tracker/kpi`, the export route, `analytics/*` and the active-leads batch filters
    still compare a batch to `academic_year`. **Honest gap:** the user said pipeline showed 28; this cause
    predicts 26 (top 6 matches exactly) - worth asking her to re-count. **Until deployed,** the manual fix on
    her laptop is to set "Graduating Academic Batch" to "All Batches" in the Report Builder.

74. **Weekly report section numbers removed; Daily Tracker cell bar is Copy-only; Daily Tracker is read-only
    for the monitoring Team Leader, 25 Sep 2026 (three user requests).**
    **(a) Weekly report headings + builder checklist no longer numbered.** "1. COMPANIES COMPLETED ... 9. ON HOLD
    BY HR" looked wrong whenever only some sections were ticked (1, 2 and 6 showed). Removed the numbers - title
    and icon only - from every place the WEEKLY report draws them: the on-screen editor
    (`NativeReportEditor.tsx`, single and multi-college), its print/export HTML builder, the A4 preview
    (`A4PdfPreviewModal.tsx`), the image/PDF renderer (`reportCanvasRenderer.ts`) and the "sections to include"
    checklist in `ReportBuilderWizard.tsx`. **Deliberately NOT changed:** the **Month-End** report headings
    (still "1. COMPANIES COMPLETED ... 6. CALLING ACTIVITY SUMMARY" on screen, in the A4 preview and the
    renderer; its builder checklist was already unnumbered) and the Weekly Tracker module's own move/edit
    dialogs - the user named the weekly report only. Say the word and Month-End follows.
    **(b) Daily Tracker multi-cell bar is Copy only, for everyone.** Selecting cells used to offer Copy, Paste
    and Delete. Now the bar is "N Cells Selected - Copy - close". The **keyboard paths are gone too**
    (Ctrl+V into a selection, the window paste listener, Delete/Backspace clearing a selection) - removing
    only the buttons would have left them working. Editing a single cell is unchanged; the toolbar "Paste"
    (bulk contacts) is a different feature and is unchanged. The cell-delete confirmation modal and the paste/
    delete handlers are now unreachable dead code left in `TrackerGrid.tsx`.
    **(c) A full-oversight Team Leader (`has_all_colleges_access`, Malvika Kumar) sees the Daily Tracker
    READ-ONLY.** Client: `lib/useFullAccessViewer.ts` (new) + `tracker/page.tsx` - `isMonitor` forces
    `isEffectiveReadOnly`, so the existing read-only machinery hides Paste / delete bin / actions menu / Set
    Time / every editable cell, and hides "Back to My Sheet". A monitoring account never works a sheet of its
    own: choosing a college opens **the sheet of the coordinator who handles it**, read-only (first load and
    each change of college). Server (defence in depth, the real enforcement): a guard after `authorizeRoute`
    refuses every non-GET under `/api/v1/daily-tracker` with `403 READ_ONLY_MONITOR` for such an account
    (only the read-only `check-metadata-batch` is exempt). The login response now carries
    `has_all_colleges_access` (it did not before, so **every client-side check on that flag in the app was
    silently false** - incl. my own in `EmailCheckPrompt.tsx`, where the server check still protected it);
    an already-open session looks the flag up once from `/profile/:id` and stores it.
    **Bug found and fixed on the way:** `GET /coordinators` filtered colleges with `is_deleted: false`, a field
    `College` does not have (trap 7), so it matched nothing and **every coordinator came back with empty
    focus data** - the "find the coordinator who handles this college" lookup behind the outside-my-focus
    read-only view (items 60-63) had never actually worked and silently fell back to an empty "Read-Only
    View". Fixed (`$ne: true`), and it now lists each person's **real `assigned_college_ids`** (hardcoded map
    only for someone with none; a full-access account is listed as handling nothing so she is never picked as
    a college's handler). **Side effect worth knowing:** that outside-focus view of another coordinator's live
    sheet now genuinely works for coordinators too.
    **Verified:** live as Malvika - login carries the flag; POST manual-row / bulk-move / bulk-paste /
    save-progress / load-contacts, PATCH and both DELETEs all `READ_ONLY_MONITOR`, GET history/today `200`;
    as Mohanaradha the same routes are NOT blocked (`NOT_FOUND` for a missing row). Real browser as Malvika:
    header "Viewing Malavika Ramesh T K's calling sheet ... Read-Only Mode", 0 Paste / bin / Set Time /
    editable cells, clicking a cell shows no action bar, zero data-changing requests, the handler's 11 live
    rows are visible. Real browser as a coordinator with two marked throwaway rows (removed): dragging two
    cells shows exactly "2 Cells Selected - Copy - close", the Copy button puts "Test HR / Test HR" on the
    clipboard, Ctrl+V and Delete send nothing. Weekly report: checklist and preview show 0 numbered headings,
    the plain titles present. `tsc --noEmit` clean both sides, `verify:policy` OK. **Not verified:** the
    A4/PDF/image exports were checked by code change only (same one-line title edits), not opened; the
    college selector on Malvika's read-only sheet still reads "- Select College -" (cosmetic).

75. **Weekly report: section titles and column headings are editable in the preview, 25 Sep 2026
    (user-requested; everyone incl. Malvika Kumar and the Administrator).** In the generated **single-college
    Weekly Placement report** every section title ("DRIVE IN PROGRESS" ...) and every table column heading
    ("Company Name", "Role", ...) can be clicked and retyped - Enter or clicking away saves, clearing it
    restores the default. **Presentation only:** the rename lives on the generated report object
    (`report.section_titles`, `report.column_headings`) exactly like the already-editable report title
    (`report_title`) - it never reaches the Weekly Tracker data, the Report Builder, its section checklist, or
    any saved setting, and a regenerated report starts from the defaults again. New shared helper
    `reports/lib/reportOverrides.ts` (`sectionTitle`, `columnHeading`, `applyColumnHeadings`,
    `withSectionTitle`, `withColumnHeading`); a column is addressed by its position in that section's table, so
    renaming "Company Name" in one table leaves the other eight untouched. **What reads it:** the on-screen
    preview (`NativeReportEditor.tsx`, editable `EditableLabel`: 9 titles + 46 headings), the A4 preview
    (`A4PdfPreviewModal.tsx`) and the image / PDF canvas renderer (`reportCanvasRenderer.ts`), so what is
    edited is what gets saved as image or PDF. Typed text is kept exactly as typed (no forced capitals);
    the look is unchanged until something is edited (hover tint + a tooltip only, hidden in print).
    **Deliberately not covered:** the **multi-college Weekly** report (its headings embed each college's name),
    **Month-End** and the other report types, the **Excel export** (its own HTML builder in
    `NativeReportEditor.tsx` still prints the defaults), and the small italic "No ... recorded" empty-state
    lines. The default text differs a little between surfaces (e.g. the A4 preview says "Offers", the image
    says "Offers Received", the image uses "#" where the screen says "S.No"); a rename replaces all of them
    with the one word typed. **Verified in a real browser** as a coordinator, Malvika Kumar and the
    Administrator: 9 editable titles and 25 headings on an AIHT report; renaming a title and one column
    updated the screen, the A4 preview and the words drawn on the export canvas (182 strings drawn, both
    present), left the other tables' headings alone, an emptied title restored its default, and no request
    touched the Weekly/Daily Tracker; `tsc --noEmit` clean. **Not verified:** an actual PNG / PDF file opened
    after a rename (only the strings drawn on the canvas were checked), and printing on paper.

76. **No section numbers in any report; titles and column headings editable in the preview for every
    report type, 25 Sep 2026 (user-requested; extends item 75).** Removed the "1." / "2." prefixes from
    Month-End (incl. the A4 "10. CALLING ACTIVITY SUMMARY"), Pending Tasks (`{secIdx + 1}.`), the multi-college
    Weekly college headings, the Excel/print HTML builder, and the Pending Tasks tabs in the builder, on all
    four surfaces (`NativeReportEditor.tsx`, `A4PdfPreviewModal.tsx`, `reportCanvasRenderer.ts`,
    `ReportBuilderWizard.tsx`). Editable (same `report.section_titles` / `report.column_headings` mechanism,
    presentation-only, reset on regenerate): **Month-End** (6 titles + headings), **Pending Tasks** (key
    `pending_<section key>`), **Active Leads** (title + headings; columns use FIXED slots 0 S.No, 1 Company,
    2 Colleges, 3 Role, 4 CTC so hiding a column never shifts a rename), **Daily Positives / Daily JD Received**
    (headings, keys `daily_positives` / `daily_jd`; these have no section title beyond the report title, which
    was already editable). **Still not covered:** the Excel export prints defaults, multi-college Weekly
    headings, empty-state lines. **Verified in a real browser** (coordinator; Malvika for Pending): 0 numbered
    headings; a renamed title and column reached the screen, the A4 preview and the words drawn on the export
    canvas for Month-End, Pending, Active Leads and Daily Positives; no tracker requests; `tsc` clean.
    **Not verified:** Daily JD Received with data (that day returned no rows; code mirrors Positives), the
    Administrator account, actual PNG/PDF files.

77. **Report image export: sharper (4x) and split into A4 pages, 25 Sep 2026 (user-requested).** The image
    download was one very tall PNG at 2.5x (~2150 px wide) that WhatsApp then re-compressed. Now
    `reportCanvasRenderer.ts` renders at **4x** (3440 px wide; scale is lowered only if one canvas would
    exceed ~16,000 px tall) and, when a report runs past one A4 sheet, **splits it into A4-proportioned pages
    (860x1216 -> 3440x4864)**: rows are never cut in half, every continued page repeats the section title
    "(continued)" and the table header (Company Name / Role / CTC ...), each page has the footer with
    "Page n of N", "Prepared by" on the last. Small reports (<=750 px of content, and single-company cards)
    stay ONE content-fitted image; between that and one sheet it is one A4 page; the "Compact" and "Square"
    size buttons keep their old single-image behaviour, "A4" always paginates. New
    `generateReportCanvases()` (array; `generateReportCanvas()` kept, returns page 1); the page flow uses one
    shared `fits()/nextPageY()` in a measuring pass and the drawing pass so they cannot disagree; row divider
    lines are now drawn per row (the old separate pass could not follow a page break). The previewer
    (`A4PdfPreviewModal.tsx`) shows every page ("Image 1 of N") and **Save Image downloads one file per page**
    (`name_page-1-of-3.png`, 350 ms apart; the browser may ask once to allow multiple downloads).
    **Verified in a real browser:** DSU Weekly -> 4 pages, all exactly 3440x4864 (ratio 1.414), page 2 starts with
    "COMPANIES IN PIPELINE (continued)" + the header row, last page ends with observations + footer; Month-End ->
    2 pages; Daily Positives -> 1 image 3440x1432; no page errors; `tsc` clean. **Not verified:** actual
    downloaded files / WhatsApp, Active Leads with hundreds of rows (that run timed out on a selector, untested),
    the **PDF**, which is unchanged and still the browser print path. WhatsApp still compresses a photo: send
    as **Document** for full sharpness.

78. **Weekly Tracker: Move / Copy companies to another college; Sync is icon-only, 25 Sep 2026
    (user-requested; everyone incl. Malvika Kumar, Sujitha and all coordinators).** The amber **Sync** button
    is now just its icon (the tooltip still explains it). A new indigo **arrows icon next to the dustbin** starts
    "send to another college": (1) a small dialog asks **which section** the companies are in (only sections
    that have rows, with counts); (2) the page enters tick mode for that section - the header shows
    **Move (n) / Copy (n) / Cancel**; ticking in a different section restarts the selection there (item 49);
    (3) Move or Copy opens a dialog listing every other college (own focus colleges first, badged "Your focus" /
    "Other login", searchable); (4) after picking one, an explicit **"Are you sure you want to move/copy N
    companies from X to Y?"** step, with an extra amber note when Y is not one of the user's focus colleges;
    (5) "Yes, move/copy & switch" sends it and then **opens the receiving college**.
    **What the receiver gets (user decision, both Move and Copy):** ONLY Company name, Role, CTC, Contact and
    Email, **in the same section and the sender's order**; status, dates, notes and counts start empty (the new
    row is tagged with the current season/batch and the receiving college's handling coordinator, Placement
    Coordinator preferred over Team Leader, all-colleges oversight accounts ignored, else the sender). **Copy**:
    the sender's row is untouched. **Move**: the sender's row is soft-deleted (recoverable from the recycle bin)
    - linked Daily Leads / Daily Tracker rows are deliberately NOT cascaded; moving out of Top Companies only
    un-pins, like deleting from that section. A company the target already has (same name, any section) is
    **skipped** and, on a move, stays with the sender; the toast lists what was skipped. Owners of the receiving
    college (and, on a move, the sending one) get ONE foreign-college email via the existing
    `notifyForeignCollegeOwners()`. Backend `POST /api/v1/weekly-tracker/transfer`
    (`lib/weeklyTransferRoutes.ts`, covered by the existing `/weekly-tracker` STAFF policy). **Not built:** undo /
    redo for a transfer (use the recycle bin for a move; delete the copy for a copy). **Also fixed:** the page
    could show one college's rows under another college's name because a slow response for the college just
    left overwrote the new one - `loadWeeklyTracker` now ignores a response for a college that is no longer
    selected. **Verified:** live API with throwaway AIHT rows (all removed) - same-college refused, Copy keeps
    the sender and gives ACET blank status/dates, order kept, a repeat is skipped, Move soft-deletes the sender;
    real browser as Mohanaradha - Sync has no text, picker lists sections, tick mode shows Move/Copy, the
    confirm step names both colleges, one POST with the right body, page switches to ACET showing ACET's rows;
    `tsc` clean both sides. **Not tested in a browser:** Move (only its API), Malvika/Sujitha accounts, dark
    mode, the foreign-college amber note.

79. **Weekly Tracker "Move / Copy Companies" reworked to copy-only, one entry point, 25 Sep 2026
    (user decision - supersedes the UI and the Move half of item 78).** The extra arrows icon beside the dustbin
    is gone; the existing **"Move Companies"** item in the three-dots menu is now **"Move / Copy Companies"** and
    **Shift+M** opens the same thing. It first asks: **Within this college** (the old tick-and-move-between-sections
    flow, unchanged) or **To another college**. The other-college flow is: pick ONE college (own focus colleges
    first, badged "Your focus" / "Other login") -> pick the section -> tick companies -> **Copy (n)** (the only
    button in the header in this mode; Esc leaves it) -> "Are you sure you want to copy..." -> copied, then the page
    **switches to the receiving college** so the sender can check it. **It only copies:** the sender's rows are never
    touched (the backend now refuses any mode but `copy` - the Move branch was removed); the receiver still gets only
    Company, Role, CTC, Contact, Email in the same section and order, everything else blank. **Toasts:** the sender
    sees "N companies copied to MCET"; the receiving coordinator(s) get a `system_update` notification titled
    "Weekly Tracker copy received" (message "One data received from AIHT College" / "N data received from ...", the
    college **acronym**) and `IncomingCopyToast.tsx` (mounted in `AppShell`, polls every 15 s + on tab focus, needs a
    visible tab) shows it as a toast once and marks it read; recipients are the target college's handling
    coordinator(s) (Placement Coordinator preferred, oversight accounts and the sender excluded). **Undo / Redo
    icons removed from the Weekly Tracker header** (user: Ctrl+Z / Ctrl+Y still work - the hook's keyboard shortcuts
    are unchanged). **Verified:** real browser as Mohanaradha - no undo/redo/arrows icons; Shift+M shows the two-way
    choice; AIHT -> MCET copy of 2 rows sent one correct POST; only "Copy (2)" in the header; MCET got blank-status
    copies and AIHT kept everything; a second browser as Seshmitha (MCET, `seshmitha_tamil@icl.today`) showed the
    toast "One data received from AIHT College" bottom-right, the notification then read and not repeated; the
    sender is not notified. `tsc` clean both sides. **Not tested:** "Within this college" after the new choice
    dialog, dark mode, Malvika/Sujitha accounts, a receiver who is offline (they see it on next open, and it also
    sits in the bell list).
    **Copy confirmation dialog polish, 25 Sep 2026 (user request):** title is now "Copy company" (not "Copy 1
    company"), the dialog is wider (`max-w-4xl`, same font sizes) so the sentences stay on one line; the copy /
    switch / sender-toast / receiver-toast behaviour is unchanged.
    **Section question removed, 25 Sep 2026 (user request):** after picking the receiving college the tick boxes
    open straight away in every section (the "which section?" dialog is gone); the section a company is copied
    into is simply the one it was ticked in (selection stays section-specific, item 49). Flow is now: Shift+M /
    menu -> Within/Another college -> college -> tick -> Copy (n) -> confirm -> copied + switch. Verified in a
    real browser: no section dialog, 33 checkboxes visible at once, header "Copy (0)", confirm dialog opens
    after ticking one; nothing was sent (cancelled). **Known behaviour explained to the user:** a company the
    target already has in ANY section (even a collapsed one, e.g. Rejected Companies) is skipped, and the page
    still switches; suggested (not built) a single warning and no switch when everything is skipped.

80. **Production-readiness audit, 25 Sep 2026 (user-requested; run against the local backend, which uses the
    PRODUCTION database - read-only probes except one self-inflicted write, below).** **Verdict: not ready for a
    real production launch yet - fine as an internal pilot.** *Passes:* both `tsc` clean, `verify:policy` 100% (every
    endpoint has a policy), security headers all present, CORS rejects foreign origins, 13 protected routes all
    401 anonymously, forged `alg:none` JWT 401, NoSQL-operator login 401, regex-special search 200, coordinator
    blocked from `/users`, `/meta-audit`, `/health/duplicate-audit`. *Per-college screens are fast:* weekly tracker
    per college p50 341 ms (33 KB), KPI 213 ms, Daily Tracker today 102 ms, metadata page 209 ms, colleges 189 ms.
    *Gaps found:* (1) **no rate limiting** - 15 rapid bad logins all 401, never 429 (known release-gate item 6);
    (2) **no response compression** (no `compression` middleware) - the unfiltered `/weekly-tracker` is 1 MB, Daily
    Leads 250 KB, all sent raw; (3) `express.json({limit:'25mb'})` is far above what any route needs;
    (4) **failed-login audit rows store the attacker-supplied email / message with no length cap** - my own probe
    (a 3 MB "email") wrote a 3 MB `FAILED_LOGIN` row that made `GET /dashboard/admin` return 6 MB and take 8-16 s.
    **I deleted exactly that one row** (`6ab697ed3029cc393b3bff92`, 3,000,000 x "a", created 15:49 UTC on 25 Sep) -
    dashboard back to 28 KB / ~1 s. The code fix (truncate in the audit write; cap the login body) is NOT done;
    anyone can repeat this against the deployed API until it is. (5) `GET /settings` returns system-health, storage
    and organisation counts to **coordinators** too (policy is STAFF for GET); low risk, consider admin-only.
    (6) No `x-request-id` / structured logs. (7) `GET /dashboard/team-leader` ~2.2 s and `/dashboard/coordinator`
    ~0.8 s (p50); unfiltered `/weekly-tracker` 1.3 s p50 with spikes to 18 s under concurrency (no `.lean()`).
    (8) `npm audit` (prod deps): `xlsx` **high, no fix upstream** (both sides); frontend `next` 14.x **critical** -
    the fix is the pushed `next16-upgrade` branch (`bc5750e`), not merged; two moderates. (9) **Zero automated
    tests.** (10) **`next build` was NOT run** (it wipes `.next` and would have killed the live dev server), so a
    production build is unverified this session. (11) Still open from before: rotate the secrets that are in git
    history, `recycle_bin` / `import_processing_history` unbuilt, 3 missing crons, `server.ts` monolith.

81. **Hardening pass 1 of the production-readiness list, 25 Sep 2026 (user-approved order: items 1, 6, 7, 9, 10
    of item 80).** **Correction to item 80:** a login rate limiter already existed (`authLimiter`, AUD-C-03) but
    was set to **500 failed attempts / 15 min / IP** - effectively none, which is why 15 rapid bad logins never
    got a 429. Now: **sign-in 30 failed / 15 min / IP** (successes don't count; each account also keeps its own
    3-strike lockout), and a separate tighter limiter of **8 / 15 min** on `request-otp`, `verify-otp` and
    `reset-password` (each sends or checks an emailed code). **Body limits:** the single 25 MB parser in front of
    everything is gone. `/api/v1/auth/*` and `/health/*` parse **20 KB** max; the authenticated API parses
    **10 MB** but only *after* `authenticateJWT` + `authorizeRoute` (new parser mounted right below
    `authorizeRoute`), so an anonymous caller can no longer make the server buffer megabytes. Oversize -> clean
    `413 PAYLOAD_TOO_LARGE`, bad JSON -> `400 BAD_JSON`. **If a legitimate bulk import ever fails with 413, raise the
    10 MB on that one route rather than globally.** **Login** refuses an identifier over 254 chars or a password
    over 128 with `400 INPUT_TOO_LONG` before any lookup/hash/audit write. **Audit writer** (`lib/audit.ts`) now
    clips email to 254, summary to 1000, user-agent to 300 and any `changes` snapshot over 20 KB to a preview - the
    3 MB-audit-row bug can't recur. **Compression** (`compression` middleware): `/colleges` 22 KB -> 3 KB gzip.
    **`GET /settings`** returns only `{settings}` to coordinators; system-health / storage / organisation /
    data-quality / growth blocks are Administrator + Team Leader only (`isSupervisor`). **Request ids:** every
    response carries `x-request-id` (a valid incoming one is reused), every access-log line prints it (development
    line via `morgan`; **production prints one JSON object per request** - `request_id, method, path, status, ms,
    bytes, ip`), and error bodies include `requestId`; 500s no longer leak internal messages in production.
    **Verified live:** 3 MB and 25 KB login bodies 413, 300-char email 400, malformed JSON 400, anonymous 5 MB to
    the API 401, signed-in 5 MB accepted / 12 MB 413, coordinator `/settings` = `settings` only while the admin
    still gets all six blocks, request id on a 404, 30th bad login = first 429; `tsc` clean. **Found, not fixed
    (pre-existing):** the Weekly Tracker page's first request sometimes carries the placeholder college id
    `col_karpagam` (from the cached fallback list), which the handlers answer with `500` (Mongoose CastError)
    instead of `400`; the page then refetches with the real id so users don't notice.

82. **First automated tests + a verified production build, 25 Sep 2026 (item 5 of the production list).**
    **`npm test` in `backend/`** now runs 34 black-box API tests (`backend/tests/api.test.ts`, Node's built-in
    test runner, **no new dependency**) against a RUNNING server (`TEST_BASE_URL`, default localhost:5000; standard
    accounts/password from section 2). They are **read-only** apart from signing in, so they are safe against the
    shared database, and they deliberately stay far below the login rate limit (a limit test would lock the test
    machine's own IP out for 15 minutes). Covered: security headers + request id, foreign-origin refusal, gzip,
    13 protected routes all refused anonymously, forged `alg:none` token, generic wrong-password answer, login
    input-length / oversize / bad-JSON handling, operator objects in the login body, self-registration disabled,
    anonymous large body refused before parsing, coordinator 403 on `/users`, `/meta-audit`,
    `/health/duplicate-audit`, `/dashboard/admin`, settings change and self role-escalation, `/settings` scoping
    (coordinator = `settings` only, admin = all blocks), coordinator scoping on daily leads / notifications, and the
    weekly tracker / daily tracker / coordinator dashboard still loading (incl. a regex-character search). All 34
    pass. **Not covered (still a gap against the spec's 80% goal):** anything that writes (trackers, imports,
    paste, copy-to-college), the frontend (a Playwright config exists but no specs were written), the cron jobs,
    and the email-check rules. **Production build:** `next build` passes (26 static pages, First Load JS 87 kB
    shared, largest route `/daily-leads` 233 kB) - run in a **temporary copy** at `C:\Temp\ipoms_build` (a junction
    to this repo's `node_modules`) so the live dev server's `.next` was not wiped; that folder can be deleted
    (delete the `node_modules` junction first, not through it). Note the repo has TWO next configs
    (`next.config.mjs` proxy/rewrites and `next.config.mobile.js` static export) - the build above used the default.

83. **Next 16 upgrade rehearsed in isolation, 25 Sep 2026 (item 2 of the production list) - NOT adopted.** Nothing in
    the real repo or its running dev server changed. Done in a git worktree `C:\Temp\ipoms_next16` on the local
    branch `next16-merge-check` (= current `ipomsbranch3` + a clean merge of `next16-upgrade`; the upgrade only
    touches `frontend/package.json`, `package-lock.json` and `tsconfig.json` - `jsx` becomes `react-jsx`, formatting
    only) with its own `npm ci`. Results: `tsc` clean, `next build` passes (25 static pages), `npm audit --omit=dev`
    goes from 6 findings incl. **1 critical** to 4 (3 moderate, 1 high = `xlsx`), and a real-browser sweep of 9
    pages (dashboard, tracker, weekly tracker, daily leads, active leads, metadata, reports, settings, profile) on
    Next 14 (:3000) vs Next 16 (:3100) gave **identical page text** and only ~245 differing pixels per screen (the
    Next dev-mode "N" badge; the dashboard's 0.17% is its live clock), same console/HTTP results, Shift+M dialog
    works on both. **Things to know before adopting:** (a) Next 16's dev server **writes `AGENTS.md` and
    `CLAUDE.md` into `frontend/`** on first start (`agentRules: false` in `next.config.mjs` turns it off) - they
    would show up in `git status`; (b) `"lint": "next lint"` no longer exists in Next 16 - the script must be
    replaced by plain ESLint or removed; (c) Turbopack is the default bundler; first compile of each page in dev is
    slower; (d) Node >= 20.9 is required on Vercel; (e) the dev-mode "N" indicator appears bottom-left. Adopting =
    merge `next16-merge-check` (or `next16-upgrade`) into `ipomsbranch3`, `npm install` in `frontend/`, restart the
    frontend dev server; rollback = revert the merge and `npm install` again.
    **ADOPTED locally the same day (user: "yes start localhost 3000"):** `next16-upgrade` merged into `ipomsbranch3`
    (`896d12e`), `frontend/` reinstalled on **Next 16.3.6**, dev server restarted. Follow-ups: `agentRules: false`
    added to `frontend/next.config.mjs` (no `AGENTS.md`/`CLAUDE.md` generated); the `"lint": "next lint"` script was
    removed (the project has no ESLint config or dependency, so it never ran anyway). Re-verified on the real
    :3000: both `tsc` clean, 34/34 API tests, 9-page sweep identical to before, Weekly report image = 4 exact A4
    pages, copy dialog OK. **Still NOT pushed to GitHub / Vercel.** Harmless dev warning: Next infers the workspace
    root because there are lockfiles above the repo (`C:\Projects\package-lock.json`) - silence with
    `turbopack.root` in `next.config.mjs` if it bothers anyone. The temporary worktree/branch
    `next16-merge-check` was removed.

## 6. Module map
## 6. Module map
## 6. Module map

Data flow: `company_metadata → assigned_work → daily_tracker → weekly_tracker → daily_leads → reports/dashboards`

| # | Module | Route | Essence |
|---|---|---|---|
| 01/08 | User & Access | `/login`, `/settings` | Email login, 3-strike lockout, OTP reset. Self-registration removed 20 Sep 2026 — every account, including Coordinators, is created and activated directly by an Administrator. |
| 02 | Master Company DB | `/metadata` | Not a CRM — an Excel-like repository. Identity is **company name only**. One company → unlimited HR contacts. Duplicate = same Company+HR+Mobile+Email (blocked); differing only by email → allowed after confirm. |
| 03 | Daily Tracker | `/tracker` | The heartbeat. ~50–70 calls/day. Read-only contact picker (never free-text search). Start Time manual (Spacebar), End Time + Duration automatic and locked. Auto-save + `Save Progress`; auto-finalize 23:59:59. **Soft validation — warn, never block.** |
| 04 | Weekly Tracker | `/weekly-tracker` | Placement lifecycle. One master dataset, sections derived from status — nobody moves rows by hand. Status is **free text**, not a dropdown (deliberate). Follow-up colour: green >7d, yellow ≤3d, red today/overdue. Friday–Friday weeks. |
| 05 | Daily Leads | `/daily-leads` | Two tabs, Positives / JD Received, identical columns. **Deliberately manual** — never auto-sync. Coordinator-only write; everyone else read-only. Remembers last active tab. |
| 06 | Reports & Analytics | `/reports` | 4 templates (Weekly, Monthly, College, Coordinator). Report edits are **presentation-only and never mutate operational records**. Reports are never stored — exported to the user's machine. Every generation writes an audit log. |
| 07 | Dashboards | `/dashboard` | Landing page. **Inform and route — never a data-entry screen.** Order: Greeting → Notifications → Assigned Work → Priority College → Today's Tasks (max 3) → KPIs. Live, non-editable, minimal. **Quick Nav shortcut cards removed 22 Aug 2026** (user decision) — the left sidebar already covers module navigation; the coordinator dashboard no longer duplicates it. **Observations/Insights section also removed 22 Aug 2026** (user decision). |
| 09 | Settings | `/settings` | **Customises appearance, never business logic.** |
| 10 | System Admin | — | Director/CEO only. **Verified 30 Aug 2026 — mostly built, not "largely unbuilt"**: admin dashboard KPIs/leaderboard/account-resolution, maintenance mode (incl. real enforcement middleware), and the Data Quality Monitor are all genuinely wired to live data. Real gap: no real audit-log viewing screen (only an unfiltered last-8 feed). The "Organization Announcement Broadcaster" (write-only, never displayed to staff) was removed entirely 30 Aug 2026 — see §5 item 11 — rather than building the missing display. |

### RBAC essentials
- **TPO removed 29 Aug 2026** (user decision). The spec called for an external, read-only
  role scoped to a college's finalized Weekly Placement Report, but no frontend experience was
  ever built for it — a TPO account fell through to the full internal coordinator dashboard,
  which the backend then correctly 403'd on every real request. Rather than leave a broken
  account type reachable, it was pulled entirely: not creatable via Settings, not a valid role
  code, not seeded. Zero live accounts held it at removal time. Full re-add path documented in
  the `RoleCode` comment in `backend/src/lib/routePolicy.ts` if a real TPO experience gets built.
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

1. **Security:** rotate the secrets that were in `backend/.env` before it was untracked
   (still live in git history). ~~Remove hardcoded JWT secret fallbacks~~ done 30 Aug 2026.
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
