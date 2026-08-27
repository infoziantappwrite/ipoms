"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__policyTable = void 0;
exports.normalizeRole = normalizeRole;
exports.authorizeRoute = authorizeRoute;
exports.isSupervisor = isSupervisor;
exports.scopeToSelf = scopeToSelf;
exports.refuseForeignOwner = refuseForeignOwner;
exports.findPolicy = findPolicy;
const ADMIN = ['ADMINISTRATOR'];
const TL_ADMIN = ['ADMINISTRATOR', 'TEAM_LEADER'];
/** Internal operational staff. Deliberately excludes TPO, who is external. */
const STAFF = ['ADMINISTRATOR', 'TEAM_LEADER', 'PLACEMENT_COORDINATOR'];
const STAFF_AND_TPO = [...STAFF, 'TPO'];
/**
 * Legacy/misspelled role codes found in live `users.role_codes`.
 *
 * Sujitha is stored as `TEAM_LEAD` and two accounts as `COORDINATOR`, neither
 * of which exists in the `roles` collection. Without this mapping an active
 * Team Leader silently fails every Team Leader check. The data is being fixed
 * separately; this mapping stays as a safety net so a future typo degrades to
 * "works, and warns" rather than "mysteriously forbidden".
 */
const ROLE_ALIASES = {
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
function normalizeRole(raw) {
    return ROLE_ALIASES[String(raw || '').trim().toUpperCase()] ?? null;
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
const POLICIES = [
    // ── Master company database ───────────────────────────────────────────────
    { method: 'GET', pattern: new RegExp(`^/companies/search/?$`), roles: STAFF },
    { method: 'DELETE', pattern: new RegExp(`^/metadata/${ID}/purge/?$`), roles: ADMIN },
    { method: 'POST', pattern: new RegExp(`^/metadata/${ID}/restore/?$`), roles: TL_ADMIN },
    { method: 'POST', pattern: new RegExp(`^/metadata/bulk-import/?$`), roles: TL_ADMIN },
    { method: 'PATCH', pattern: new RegExp(`^/metadata/${ID}/?$`), roles: TL_ADMIN },
    { method: 'DELETE', pattern: new RegExp(`^/metadata/${ID}/?$`), roles: TL_ADMIN },
    // Coordinators add contacts they discover while calling (Module 02 §17).
    { method: 'POST', pattern: /^\/metadata\/?$/, roles: STAFF },
    { method: 'GET', pattern: /^\/metadata\/?$/, roles: STAFF },
    // ── Colleges & staff directory ────────────────────────────────────────────
    { method: 'GET', pattern: /^\/colleges\/?$/, roles: STAFF_AND_TPO },
    { method: 'GET', pattern: /^\/coordinators\/?$/, roles: TL_ADMIN },
    // ── Daily Tracker (own call log) ──────────────────────────────────────────
    { method: '*', pattern: /^\/daily-tracker(\/.*)?$/, roles: STAFF },
    // ── Weekly Tracker ────────────────────────────────────────────────────────
    // TPO is excluded entirely: their access is the finalized Weekly Placement
    // REPORT, not the live operational board (V1_DECISIONS §8.2).
    { method: '*', pattern: /^\/weekly-tracker(\/.*)?$/, roles: STAFF },
    // ── Daily Leads & Active Leads ────────────────────────────────────────────
    { method: '*', pattern: /^\/daily-leads(\/.*)?$/, roles: STAFF },
    { method: '*', pattern: /^\/active-leads(\/.*)?$/, roles: STAFF },
    // ── Pending Tasks ─────────────────────────────────────────────────────────
    { method: '*', pattern: /^\/pending-tasks(\/.*)?$/, roles: STAFF },
    // ── Analytics & Reports ───────────────────────────────────────────────────
    { method: '*', pattern: /^\/analytics(\/.*)?$/, roles: STAFF },
    { method: '*', pattern: /^\/reports(\/.*)?$/, roles: STAFF },
    // ── Dashboards ────────────────────────────────────────────────────────────
    { method: 'GET', pattern: /^\/dashboard\/admin\/?$/, roles: ADMIN },
    { method: 'GET', pattern: /^\/dashboard\/team-leader\/?$/, roles: TL_ADMIN },
    { method: 'GET', pattern: /^\/dashboard\/college-kpis\/?$/, roles: STAFF },
    // Any staff member may call this; WHICH coordinator's data comes back is
    // decided by ownership scoping in the handler, not here.
    { method: 'GET', pattern: /^\/dashboard\/coordinator\/?$/, roles: STAFF },
    // ── Assigned Work ─────────────────────────────────────────────────────────
    // Creating an assignment is a Team Leader action (Module 07 §8); acting on
    // one is the receiving coordinator's.
    { method: 'POST', pattern: /^\/assigned-work\/?$/, roles: TL_ADMIN },
    { method: 'GET', pattern: /^\/assigned-work\/?$/, roles: STAFF },
    { method: '*', pattern: new RegExp(`^/assigned-work/${ID}/.*$`), roles: STAFF },
    // ── Notifications ─────────────────────────────────────────────────────────
    // Senders are CEO / Director / Team Leader / System (Module 07 §7.2).
    { method: 'POST', pattern: /^\/notifications\/?$/, roles: TL_ADMIN },
    { method: '*', pattern: /^\/notifications(\/.*)?$/, roles: STAFF },
    // ── Users, profiles, roles ────────────────────────────────────────────────
    { method: 'PATCH', pattern: new RegExp(`^/users/${ID}/unlock-profile/?$`), roles: TL_ADMIN },
    { method: 'DELETE', pattern: new RegExp(`^/users/${ID}/?$`), roles: ADMIN },
    { method: 'PATCH', pattern: new RegExp(`^/users/${ID}/?$`), roles: TL_ADMIN },
    { method: 'POST', pattern: /^\/users\/?$/, roles: TL_ADMIN },
    // Coordinators must not enumerate other coordinators (Module 08 §18).
    { method: 'GET', pattern: /^\/users\/?$/, roles: TL_ADMIN },
    // Own profile — ownership enforced in the handler.
    { method: '*', pattern: new RegExp(`^/profile/${ID}/?$`), roles: STAFF },
    { method: 'PATCH', pattern: new RegExp(`^/roles/${ID}/?$`), roles: ADMIN },
    { method: 'GET', pattern: /^\/roles\/?$/, roles: TL_ADMIN },
    // ── Settings ──────────────────────────────────────────────────────────────
    { method: 'PATCH', pattern: /^\/settings\/?$/, roles: ADMIN },
    // Read is open to staff: the UI reads branding and dropdown enums from here.
    { method: 'GET', pattern: /^\/settings\/?$/, roles: STAFF },
    // ── Active Leads Module ───────────────────────────────────────────────────
    { method: '*', pattern: /^\/active-leads(\/.*)?$/, roles: STAFF },
];
/** Paths served before authentication; never reach this middleware. */
function isPublic(path) {
    return path === '/health' || path.startsWith('/auth') || path === '/colleges' || path.startsWith('/weekly-tracker-import');
}
function findPolicy(method, path) {
    return POLICIES.find((p) => (p.method === '*' || p.method === method) && p.pattern.test(path));
}
/**
 * Enforces the table above. Mount AFTER `authenticateJWT` so `req.user` exists.
 *
 * Unmatched routes are DENIED, not allowed. That is the whole point: a new
 * endpoint is inaccessible until someone writes its policy, which turns a
 * silent security hole into an obvious, immediate 403 during development.
 */
function authorizeRoute(req, res, next) {
    if (req.method === 'OPTIONS' || isPublic(req.path))
        return next();
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        });
    }
    const rawRoles = req.user.roles || [];
    const roles = rawRoles.map(normalizeRole).filter(Boolean);
    if (rawRoles.length > 0 && roles.length === 0) {
        console.warn(`[routePolicy] User ${req.user.email} has no recognisable role codes: ${JSON.stringify(rawRoles)}`);
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
function isSupervisor(req) {
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
function scopeToSelf(req, requestedId) {
    const self = req.user?.userId;
    if (isSupervisor(req))
        return requestedId || self;
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
function refuseForeignOwner(req, res, ownerId, message = 'You do not have access to this record.') {
    if (isSupervisor(req) || req.user?.userId === String(ownerId))
        return false;
    res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_NOT_OWNER', message },
    });
    return true;
}
/** Exposed for tests and for the coverage check in verifyRoutePolicy.ts. */
exports.__policyTable = POLICIES;
