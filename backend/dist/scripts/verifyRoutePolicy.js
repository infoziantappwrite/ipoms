"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const routePolicy_1 = require("../lib/routePolicy");
/**
 * Static coverage check for the route authorization table.
 *
 *   npm run verify:policy
 *
 * Scrapes every `app.<verb>('/api/v1/...')` out of server.ts and asserts each
 * one resolves to a policy. Because `authorizeRoute` is default-deny, a route
 * with no policy is not a security hole — it is a dead endpoint returning 403.
 * This turns that into a build-time failure instead of a bug report.
 *
 * Exits non-zero when something is uncovered, so CI can gate on it.
 */
const SERVER = path_1.default.join(__dirname, '..', 'server.ts');
const ROUTE_RE = /^app\.(get|post|put|patch|delete)\(\s*'(\/api\/v1[^']*)'/gm;
/** Substitute a real-looking ObjectId for `:param` so patterns can match. */
const SAMPLE_ID = 'a'.repeat(24);
function main() {
    const src = fs_1.default.readFileSync(SERVER, 'utf8');
    const routes = [];
    for (const m of src.matchAll(ROUTE_RE)) {
        const method = m[1].toUpperCase();
        const full = m[2];
        const rel = full.replace(/^\/api\/v1/, '').replace(/:[A-Za-z_]+/g, SAMPLE_ID);
        routes.push({ method, full, rel: rel || '/' });
    }
    const skipped = [];
    const uncovered = [];
    const covered = [];
    for (const r of routes) {
        if (r.rel === '/health' || r.rel.startsWith('/auth')) {
            skipped.push(`${r.method} ${r.full}`);
            continue;
        }
        const policy = (0, routePolicy_1.findPolicy)(r.method, r.rel);
        if (!policy)
            uncovered.push(`${r.method} ${r.full}`);
        else
            covered.push({ method: r.method, full: r.full, roles: policy.roles.join(', ') });
    }
    console.log('\n=== iPOMS route authorization coverage ===\n');
    for (const c of covered.sort((a, b) => a.full.localeCompare(b.full))) {
        console.log(`  ${c.method.padEnd(6)} ${c.full.padEnd(48)} ${c.roles}`);
    }
    console.log(`\n  public (pre-auth) : ${skipped.length}`);
    console.log(`  covered           : ${covered.length}`);
    console.log(`  UNCOVERED         : ${uncovered.length}`);
    if (uncovered.length) {
        console.error('\n[FAIL] These endpoints have no policy and will return 403:\n');
        uncovered.forEach((u) => console.error(`  - ${u}`));
        console.error('\nAdd an entry to POLICIES in src/lib/routePolicy.ts.\n');
        process.exit(1);
    }
    console.log('\n[OK] Every endpoint resolves to a policy.\n');
}
main();
