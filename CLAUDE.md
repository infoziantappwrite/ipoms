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
    key. **A separate, unrelated "Broadcast Announcement" feature still exists** at
    `frontend/src/app/notifications/components/BroadcastModal.tsx` — it is NOT what was
    removed here, and it has its own bug: it POSTs to `/notifications/broadcast`, which has no
    backend route (the real, working, TL/Admin-gated endpoint is `POST /api/v1/notifications`,
    `server.ts` line ~5242) — so clicking it 404s. Not touched; flagged for a future fix. If
    that gets fixed, `RoleMatrixTab.tsx`'s "Dispatch Broadcast Announcements" row (currently
    `tl: true, admin: true`) should be re-verified against it working end-to-end, not just the
    backend route existing.
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
