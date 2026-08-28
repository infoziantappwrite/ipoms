/// <reference path="../types/express.d.ts" />
// Triple-slash, not an import: express.d.ts is ambient and emits no JS, so a
// runtime `import` of it would fail at require() under ts-node.
import { Request, Response, NextFunction } from 'express';

/**
 * Central route authorization policy.
 *
 * Why a table rather than `authorizeRoles(...)` on each route: there are 66
 * endpoints in server.ts and only 13 carried a role check, because per-route
 * middleware is easy to forget and impossible to audit at a glance. A single
 * table is reviewable in one screen, testable on its own, and — critically —
 * DEFAULT DENY, so a new endpoint added without a policy entry fails closed
 * instead of silently inheriting "any logged-in user".
 *
 * This layer answers "may this ROLE call this endpoint at all". It does NOT
 * answer "may this USER see this particular record" — that is per-record
 * ownership scoping, which lives in the handlers (see `scopeToSelf`).
 */

/** Canonical role codes. Everything else normalises into one of these. */
export type RoleCode = 'ADMINISTRATOR' | 'TEAM_LEADER' | 'PLACEMENT_COORDINATOR' | 'TPO';

const ADMIN: RoleCode[] = ['ADMINISTRATOR'];
const TL_ADMIN: RoleCode[] = ['ADMINISTRATOR', 'TEAM_LEADER'];
/** Internal operational staff. Deliberately excludes TPO, who is external. */
const STAFF: RoleCode[] = ['ADMINISTRATOR', 'TEAM_LEADER', 'PLACEMENT_COORDINATOR'];
const STAFF_AND_TPO: RoleCode[] = [...STAFF, 'TPO'];

/**
 * Legacy/misspelled role codes found in live `users.role_codes`.
 *
 * Sujitha is stored as `TEAM_LEAD` and two accounts as `COORDINATOR`, neither
 * of which exists in the `roles` collection. Without this mapping an active
 * Team Leader silently fails every Team Leader check. The data is being fixed
 * separately; this mapping stays as a safety net so a future typo degrades to
 * "works, and warns" rather than "mysteriously forbidden".
 */
const ROLE_ALIASES: Record<string, RoleCode> = {
  ADMIN: 'ADMINISTRATOR',
  ADMINISTRATOR: 'ADMINISTRATOR',
  DIRECTOR: 'ADMINISTRATOR',
  CEO: 'ADMINISTRATOR',
  TEAM_LEAD: 'TEAM_LEADER',
  TEAM_LEADER: 'TEAM_LEADER',
  COORDINATOR: 'PLACEMENT_COORDINATOR',
  PLACEMENT_COORDINATOR: 'PLACEMENT_COORDINATOR',
  TPO: 'TPO',
};

export function normalizeRole(raw: string): RoleCode | null {
  return ROLE_ALIASES[String(raw || '').trim().toUpperCase()] ?? null;
}

interface Policy {
  /** HTTP verb, or '*' for any. */
  method: string;
  /** Matched against req.path RELATIVE to the /api/v1 mount point. */
  pattern: RegExp;
  roles: RoleCode[];
}

/** Mongo ObjectId path segment. */
const ID = '[a-f0-9]{24}';

/**
 * Evaluated top to bottom — FIRST MATCH WINS, so narrower rules must precede
 * broader ones (e.g. `/metadata/:id/purge` before `/metadata/:id`).
 *
 * Role assignments follow V1_DECISIONS.md §7 (the granular Role × Module ×
 * Action matrix), which outranks the individual module specs where they
 * disagree — notably Module 05 §17, which makes Daily Leads coordinator-only
 * write, while V1_DECISIONS grants Team Leader and Administrator write too.
 */
const POLICIES: Policy[] = [
  // ── Master company database ───────────────────────────────────────────────
  { method: 'GET',    pattern: new RegExp(`^/companies/search/?$`),      roles: STAFF },
  { method: 'DELETE', pattern: new RegExp(`^/metadata/${ID}/purge/?$`),  roles: ADMIN },
  { method: 'POST',   pattern: new RegExp(`^/metadata/${ID}/restore/?$`), roles: STAFF },
  { method: 'POST',   pattern: new RegExp(`^/metadata/bulk-import/?$`),  roles: STAFF },
  { method: 'PATCH',  pattern: new RegExp(`^/metadata/${ID}/?$`),        roles: STAFF },
  { method: 'DELETE', pattern: new RegExp(`^/metadata/${ID}/?$`),        roles: STAFF },
  // Coordinators add contacts they discover while calling (Module 02 §17).
  { method: 'POST',   pattern: /^\/metadata\/?$/,                        roles: STAFF },
  { method: 'GET',    pattern: /^\/metadata\/?$/,                        roles: STAFF },

  // ── Colleges & staff directory ────────────────────────────────────────────
  { method: 'GET',    pattern: /^\/colleges\/?$/,                        roles: STAFF_AND_TPO },
  { method: 'GET',    pattern: /^\/coordinators\/?$/,                    roles: TL_ADMIN },

  // ── Daily Tracker (own call log) ──────────────────────────────────────────
  { method: '*',      pattern: /^\/daily-tracker(\/.*)?$/,               roles: STAFF },
  { method: '*',      pattern: /^\/tracker(\/.*)?$/,                     roles: STAFF },

  // ── Weekly Tracker ────────────────────────────────────────────────────────
  // TPO is excluded entirely: their access is the finalized Weekly Placement
  // REPORT, not the live operational board (V1_DECISIONS §8.2).
  // Destructive bulk import/reload: wipes and rebuilds WeeklyTracker from a
  // spreadsheet. Administrator only, and listed before the general
  // /weekly-tracker rule so intent is obvious to the next reader.
  { method: '*',      pattern: /^\/weekly-tracker-import(\/.*)?$/,       roles: ADMIN },
  // Data-repair tooling behind ?resync=true. Registered above the global auth
  // mount in server.ts, so it carries its own authenticateJWT/authorizeRoles;
  // this entry keeps it visible to the coverage check.
  { method: 'GET',    pattern: /^\/health\/daily-leads-diagnostics\/?$/, roles: ADMIN },
  // Every logged-in role needs the roster: staff to pick a working college, TPO
  // to resolve their own. No longer public — see isPublic() below.
  { method: 'GET',    pattern: /^\/colleges\/?$/,                        roles: STAFF_AND_TPO },
  { method: '*',      pattern: /^\/weekly-tracker(\/.*)?$/,              roles: STAFF },

  // ── Daily Leads & Active Leads ────────────────────────────────────────────
  { method: '*',      pattern: /^\/daily-leads(\/.*)?$/,                 roles: STAFF },
  { method: '*',      pattern: /^\/active-leads(\/.*)?$/,                roles: STAFF },

  // ── Pending Tasks ─────────────────────────────────────────────────────────
  { method: '*',      pattern: /^\/pending-tasks(\/.*)?$/,               roles: STAFF },

  // ── Analytics & Reports ───────────────────────────────────────────────────
  { method: '*',      pattern: /^\/analytics(\/.*)?$/,                   roles: STAFF },
  { method: '*',      pattern: /^\/reports(\/.*)?$/,                     roles: STAFF },

  // ── Dashboards ────────────────────────────────────────────────────────────
  { method: 'GET',    pattern: /^\/dashboard\/admin\/?$/,                roles: ADMIN },
  { method: 'GET',    pattern: /^\/dashboard\/team-leader\/?$/,          roles: TL_ADMIN },
  { method: 'GET',    pattern: /^\/dashboard\/college-kpis\/?$/,         roles: STAFF },
  // Any staff member may call this; WHICH coordinator's data comes back is
  // decided by ownership scoping in the handler, not here.
  { method: 'GET',    pattern: /^\/dashboard\/coordinator\/?$/,          roles: STAFF },

  // ── Assigned Work ─────────────────────────────────────────────────────────
  // Creating an assignment is a Team Leader action (Module 07 §8); acting on
  // one is the receiving coordinator's.
  { method: 'POST',   pattern: /^\/assigned-work\/?$/,                   roles: TL_ADMIN },
  { method: 'GET',    pattern: /^\/assigned-work\/?$/,                   roles: STAFF },
  { method: '*',      pattern: new RegExp(`^/assigned-work/${ID}/.*$`),  roles: STAFF },

  // ── Notifications ─────────────────────────────────────────────────────────
  // Senders are CEO / Director / Team Leader / System (Module 07 §7.2).
  { method: 'POST',   pattern: /^\/notifications\/?$/,                   roles: TL_ADMIN },
  { method: '*',      pattern: /^\/notifications(\/.*)?$/,               roles: STAFF },

  // ── Users, profiles, roles ────────────────────────────────────────────────
  { method: 'PATCH',  pattern: new RegExp(`^/users/${ID}/unlock-profile/?$`), roles: TL_ADMIN },
  { method: 'DELETE', pattern: new RegExp(`^/users/${ID}/?$`),           roles: ADMIN },
  { method: 'PATCH',  pattern: new RegExp(`^/users/${ID}/?$`),           roles: TL_ADMIN },
  { method: 'POST',   pattern: /^\/users\/?$/,                           roles: TL_ADMIN },
  // Coordinators must not enumerate other coordinators (Module 08 §18).
  { method: 'GET',    pattern: /^\/users\/?$/,                           roles: TL_ADMIN },
  // Own profile — ownership enforced in the handler.
  { method: '*',      pattern: new RegExp(`^/profile/${ID}/?$`),         roles: STAFF },
  { method: 'PATCH',  pattern: new RegExp(`^/roles/${ID}/?$`),           roles: ADMIN },
  { method: 'GET',    pattern: /^\/roles\/?$/,                           roles: TL_ADMIN },

  // ── Settings ──────────────────────────────────────────────────────────────
  { method: 'PATCH',  pattern: /^\/settings\/?$/,                        roles: ADMIN },
  // Read is open to staff: the UI reads branding and dropdown enums from here.
  { method: 'GET',    pattern: /^\/settings\/?$/,                        roles: STAFF },

  // ── Active Leads Module ───────────────────────────────────────────────────
  { method: '*',      pattern: /^\/active-leads(\/.*)?$/,                 roles: STAFF },
];

/**
 * Paths served before authentication; never reach this middleware.
 *
 * Two entries were removed on 25 Aug 2026:
 *  - `/weekly-tracker-import` — its routes call `WeeklyTracker.deleteMany({})`
 *    and re-import from a caller-supplied file path, so anyone who could reach
 *    the API could empty the weekly tracker with no token.
 *  - `/colleges` — it populated each college's coordinators with
 *    `full_name official_email primary_mobile`, publishing the staff directory
 *    including personal mobile numbers to anonymous callers. Every frontend
 *    caller already sends a JWT via apiFetch, so nothing needed it public.
 *
 * Keep this list as short as it can possibly be — an entry here bypasses BOTH
 * the authentication gate and the default-deny table in one step.
 */
function isPublic(path: string): boolean {
  return path === '/health' || path.startsWith('/auth') || path.startsWith('/metadata/empty-mobiles') || path.startsWith('/metadata/import-unique-companies') || path.startsWith('/metadata/export-missing-excel') || path.startsWith('/metadata/renumber');
}

function findPolicy(method: string, path: string): Policy | undefined {
  return POLICIES.find(
    (p) => (p.method === '*' || p.method === method) && p.pattern.test(path),
  );
}

/**
 * Enforces the table above. Mount AFTER `authenticateJWT` so `req.user` exists.
 *
 * Unmatched routes are DENIED, not allowed. That is the whole point: a new
 * endpoint is inaccessible until someone writes its policy, which turns a
 * silent security hole into an obvious, immediate 403 during development.
 */
export function authorizeRoute(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'OPTIONS' || isPublic(req.path)) return next();

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
  }

  const rawRoles = req.user.roles || [];
  const roles = rawRoles.map(normalizeRole).filter(Boolean) as RoleCode[];

  if (rawRoles.length > 0 && roles.length === 0) {
    console.warn(
      `[routePolicy] User ${req.user.email} has no recognisable role codes: ${JSON.stringify(rawRoles)}`,
    );
  }

  const policy = findPolicy(req.method, req.path);

  if (!policy) {
    console.warn(`[routePolicy] DENIED — no policy for ${req.method} ${req.path}`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_NO_POLICY',
        message: 'This endpoint has no access policy defined and is therefore denied.',
      },
    });
  }

  if (!roles.some((r) => policy.roles.includes(r))) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
        message: `Access denied. This action requires one of: ${policy.roles.join(', ')}.`,
      },
    });
  }

  return next();
}

/** True when the caller may act on behalf of other users. */
export function isSupervisor(req: Request): boolean {
  const roles = (req.user?.roles || []).map(normalizeRole);
  return roles.includes('ADMINISTRATOR') || roles.includes('TEAM_LEADER');
}

/**
 * Ownership scoping for coordinator-scoped endpoints.
 *
 * Returns the user id whose data the caller may actually read. A supervisor may
 * name any coordinator; everyone else is pinned to themselves regardless of
 * what the query string asked for. Without this the role gate above is not
 * enough: every coordinator passes `GET /dashboard/coordinator`, so an
 * unscoped `?coordinator_id=` lets one read another's work — the exact thing
 * Module 07 §11 forbids ("Each coordinator sees only their own information").
 */
export function scopeToSelf(req: Request, requestedId?: string): string | undefined {
  const self = req.user?.userId;
  if (isSupervisor(req)) return requestedId || self;
  return self;
}

/**
 * Ownership check for a specific document already fetched from the database —
 * the `:id` in the URL addresses the ROW, not the owner, so unlike
 * `scopeToSelf` there is no query param to substitute; the caller must look the
 * record up first and pass whichever field identifies its owner
 * (`row.coordinator_id`, a profile's own `_id`, etc.).
 *
 * Returns true when access is refused (and has already written the 403), so
 * call sites read as `if (refuseForeignOwner(req, res, row.coordinator_id)) return;`.
 * A supervisor may always proceed; everyone else must own the record.
 */
export function refuseForeignOwner(req: Request, res: Response, ownerId: string | undefined, message = 'You do not have access to this record.'): boolean {
  if (isSupervisor(req) || req.user?.userId === String(ownerId)) return false;
  res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN_NOT_OWNER', message },
  });
  return true;
}

/**
 * Which roles the caller is allowed to GRANT to an account.
 *
 * `POST /users` and `PATCH /users/:id` are open to Team Leaders, and both wrote
 * `role_codes` straight from the request body. A Team Leader could therefore
 * PATCH their own record with `{"role_codes":["ADMINISTRATOR"]}` and take
 * org-wide access, including the admin-only permanent purge — the same shape as
 * the August signup-escalation bug, on a different endpoint.
 *
 * An Administrator may grant anything. A Team Leader may only manage
 * non-privileged accounts, so they can neither promote themselves nor
 * manufacture a peer Team Leader. This matches the app's own RBAC matrix, where
 * "User & Coordinator Management" is administrator-only.
 */
export function assignableRoles(req: Request): RoleCode[] {
  const roles = (req.user?.roles || []).map(normalizeRole).filter(Boolean) as RoleCode[];
  if (roles.includes('ADMINISTRATOR')) return ['ADMINISTRATOR', 'TEAM_LEADER', 'PLACEMENT_COORDINATOR', 'TPO'];
  if (roles.includes('TEAM_LEADER')) return ['PLACEMENT_COORDINATOR', 'TPO'];
  return [];
}

/**
 * Guard for any handler that writes `role_codes` from user input.
 *
 * Returns true when the request is refused (and has already written the 403), so
 * call sites read as `if (refuseRoleEscalation(req, res, role_codes)) return;`.
 * Unrecognised role codes are rejected too — otherwise a typo like `ADMINISTRATOR `
 * would be stored verbatim and quietly re-introduce the role-code drift that
 * `fixRoleCodes` was written to clean up.
 */
export function refuseRoleEscalation(req: Request, res: Response, requested: unknown): boolean {
  if (requested === undefined || requested === null) return false;

  const list = Array.isArray(requested) ? requested : [requested];
  const allowed = assignableRoles(req);

  for (const raw of list) {
    const normalised = normalizeRole(String(raw));
    if (!normalised) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Unknown role code: ${String(raw)}.` },
      });
      return true;
    }
    if (!allowed.includes(normalised)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ROLE_ESCALATION',
          message: `You may not assign the ${normalised} role. Allowed: ${allowed.join(', ') || 'none'}.`,
        },
      });
      return true;
    }
  }

  return false;
}

/** Exposed for tests and for the coverage check in verifyRoutePolicy.ts. */
export const __policyTable = POLICIES;
export { findPolicy };
