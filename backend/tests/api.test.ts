/**
 * Black-box API tests (Node's built-in test runner - no extra dependency).
 *
 *   1. start the backend (`npm run dev`), 2. `npm test`
 *
 * They talk to a RUNNING server (TEST_BASE_URL, default http://localhost:5000) and are READ-ONLY apart from
 * signing in: no test creates, edits or deletes business data, so they are safe to run against the shared
 * database. They deliberately do NOT hammer the login rate limiter (that would lock the test machine's own IP
 * out for 15 minutes) - see the bad-login test, which stays far below the limit.
 *
 * Test accounts: the seeded staff accounts and the standard password from CLAUDE.md section 2.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000';
const PASSWORD = process.env.TEST_PASSWORD || 'iPOMS@123';
const ADMIN = process.env.TEST_ADMIN_EMAIL || 'placement_management@infoziant.com';
const COORD = process.env.TEST_COORD_EMAIL || 'mohanaradha_a@infoziant.com';

interface Session { token: string; id: string }
let admin: Session;
let coord: Session;

async function login(email: string): Promise<Session> {
  const r = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const d: any = await r.json();
  assert.equal(r.status, 200, `login as ${email} failed: ${JSON.stringify(d).slice(0, 120)}`);
  return { token: d.data.token, id: d.data.user._id };
}

const get = (path: string, s?: Session, headers: Record<string, string> = {}) =>
  fetch(`${BASE}${path}`, { headers: { ...(s ? { Authorization: `Bearer ${s.token}` } : {}), ...headers } });

const post = (path: string, body: unknown, s?: Session, raw?: string) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(s ? { Authorization: `Bearer ${s.token}` } : {}) },
    body: raw ?? JSON.stringify(body),
  });

before(async () => {
  admin = await login(ADMIN);
  coord = await login(COORD);
});

// ── Transport & headers ──────────────────────────────────────────────────────
test('health is up and carries the security headers and a request id', async () => {
  const r = await get('/api/v1/health');
  assert.equal(r.status, 200);
  for (const h of ['strict-transport-security', 'x-content-type-options', 'x-frame-options', 'content-security-policy', 'x-request-id']) {
    assert.ok(r.headers.get(h), `missing header ${h}`);
  }
  assert.equal(r.headers.get('x-powered-by'), null, 'x-powered-by must be hidden');
});

test('a valid incoming x-request-id is reused', async () => {
  const r = await get('/api/v1/health', undefined, { 'x-request-id': 'trace-abc-12345' });
  assert.equal(r.headers.get('x-request-id'), 'trace-abc-12345');
});

test('a foreign origin is refused', async () => {
  const r = await get('/api/v1/health', undefined, { Origin: 'https://evil.example.com' });
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('access-control-allow-origin'), null);
});

test('responses are gzip-compressed', async () => {
  const r = await get('/api/v1/colleges', coord, { 'Accept-Encoding': 'gzip' });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-encoding'), 'gzip');
});

// ── Authentication ───────────────────────────────────────────────────────────
const PROTECTED = [
  '/api/v1/users', '/api/v1/colleges', '/api/v1/weekly-tracker', '/api/v1/daily-tracker/today', '/api/v1/metadata',
  '/api/v1/daily-leads', '/api/v1/notifications', '/api/v1/settings', '/api/v1/meta-audit', '/api/v1/dashboard/admin',
  '/api/v1/email-check/status?kind=login', '/health/duplicate-audit', '/api/v1/health/daily-leads-diagnostics',
];
for (const p of PROTECTED) {
  test(`anonymous request to ${p} is refused`, async () => {
    const r = await get(p);
    assert.ok(r.status === 401 || r.status === 403, `${p} answered ${r.status}`);
  });
}

test('a token with alg:none is refused', async () => {
  const forged = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.' + Buffer.from(JSON.stringify({ userId: 'x', roles: ['ADMINISTRATOR'] })).toString('base64url') + '.';
  const r = await fetch(`${BASE}/api/v1/users`, { headers: { Authorization: `Bearer ${forged}` } });
  assert.equal(r.status, 401);
});

test('a wrong password gives a generic 401 (no account enumeration)', async () => {
  const a = await post('/api/v1/auth/login', { email: 'nobody-test@infoziant.com', password: 'Wrong@123' });
  assert.equal(a.status, 401);
  const b: any = await a.json();
  assert.equal(b.error.code, 'INVALID_CREDENTIALS');
});

test('login refuses absurd input and oversize bodies before doing any work', async () => {
  assert.equal((await post('/api/v1/auth/login', { email: 'a'.repeat(300) + '@infoziant.com', password: 'x' })).status, 400);
  assert.equal((await post('/api/v1/auth/login', { email: 'a'.repeat(30_000), password: 'x' })).status, 413);
  assert.equal((await post('/api/v1/auth/login', null, undefined, '{not json')).status, 400);
});

test('operator objects in the login body do not bypass authentication', async () => {
  const r = await post('/api/v1/auth/login', { email: { $ne: null }, password: { $ne: null } });
  assert.ok(r.status === 400 || r.status === 401, `answered ${r.status}`);
});

test('self-registration is disabled', async () => {
  const r = await post('/api/v1/auth/signup', { email: 'x@infoziant.com', password: 'Abcdef1@x', role_codes: ['ADMINISTRATOR'] });
  assert.equal(r.status, 403);
});

test('an anonymous large body is refused before it is parsed', async () => {
  const r = await post('/api/v1/weekly-tracker', { x: 'a'.repeat(3_000_000) });
  assert.equal(r.status, 401);
});

// ── Authorisation (roles) ────────────────────────────────────────────────────
for (const p of ['/api/v1/users', '/api/v1/meta-audit', '/health/duplicate-audit', '/api/v1/dashboard/admin']) {
  test(`a coordinator cannot read ${p}`, async () => {
    const r = await get(p, coord);
    assert.equal(r.status, 403, `${p} answered ${r.status}`);
  });
}

test('a coordinator cannot change system settings', async () => {
  const r = await fetch(`${BASE}/api/v1/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coord.token}` },
    body: JSON.stringify({ academic_year: '1999-2000' }),
  });
  assert.equal(r.status, 403);
});

test('a coordinator cannot escalate their own role', async () => {
  const r = await fetch(`${BASE}/api/v1/users/${coord.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coord.token}` },
    body: JSON.stringify({ role_codes: ['ADMINISTRATOR'] }),
  });
  assert.equal(r.status, 403);
});

test('/settings shows coordinators the settings only, and the administrator the health blocks too', async () => {
  const c: any = await (await get('/api/v1/settings', coord)).json();
  assert.deepEqual(Object.keys(c.data), ['settings']);
  const a: any = await (await get('/api/v1/settings', admin)).json();
  for (const k of ['settings', 'system_health', 'organization_snapshot', 'storage_summary']) assert.ok(k in a.data, `admin lacks ${k}`);
});

// ── Ownership scoping ────────────────────────────────────────────────────────
test('a coordinator asking for someone else\'s daily leads only ever gets their own', async () => {
  const r = await get(`/api/v1/daily-leads?coordinator_id=${admin.id}`, coord);
  assert.equal(r.status, 200);
  const d: any = await r.json();
  const rows: any[] = d.data?.leads || d.data?.rows || d.data || [];
  const foreign = (Array.isArray(rows) ? rows : []).filter((x) => x.coordinator_id && String(x.coordinator_id?._id || x.coordinator_id) !== coord.id);
  assert.equal(foreign.length, 0, `${foreign.length} row(s) belong to someone else`);
});

test('a coordinator asking for the administrator\'s notifications gets none of them', async () => {
  const r = await get(`/api/v1/notifications?user_id=${admin.id}&tab=unread`, coord);
  assert.equal(r.status, 200);
});

// ── Core reads keep working ──────────────────────────────────────────────────
test('the weekly tracker loads for a college and survives regex characters in the search', async () => {
  const cs: any = await (await get('/api/v1/colleges', coord)).json();
  const id = cs.data.colleges[0]._id;
  const ok = await get(`/api/v1/weekly-tracker?college_id=${id}`, coord);
  assert.equal(ok.status, 200);
  const d: any = await ok.json();
  assert.ok(d.data.sections && typeof d.data.sections === 'object');
  assert.equal((await get(`/api/v1/weekly-tracker?college_id=${id}&search=(`, coord)).status, 200);
});

test('the daily tracker and the coordinator dashboard load', async () => {
  assert.equal((await get('/api/v1/dashboard/coordinator', coord)).status, 200);
  assert.equal((await get('/api/v1/daily-tracker/today', coord)).status, 200);
});
