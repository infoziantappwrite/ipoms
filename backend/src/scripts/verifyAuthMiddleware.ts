import jwt from 'jsonwebtoken';
import http from 'http';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'ipoms_dev_access_secret_super_secure_key_2026';

function generateTestToken(payload: { userId: string; email: string; roles: string[]; fullName: string }, expiresIn = '1h') {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: expiresIn as any });
}

function makeRequest(path: string, method = 'GET', headers: Record<string, string> = {}, body: any = null): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode || 0, data: raw });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function verifyAuth() {
  console.log('\n===============================================================');
  console.log('🔒 iPOMS — AUTHENTICATION & RBAC MIDDLEWARE VERIFICATION');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, detail = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${title}`);
    } else {
      console.error(`❌ [FAIL] ${title} — ${detail}`);
    }
  }

  try {
    // 1. Public Health Check
    const resHealth = await makeRequest('/api/v1/health');
    assert('Public endpoint /api/v1/health is accessible without token', resHealth.status === 200 && resHealth.data?.status === 'HEALTHY', `Status: ${resHealth.status}`);

    // 2. Protected Route without token
    const resNoToken = await makeRequest('/api/v1/users');
    assert('Protected endpoint /api/v1/users rejects unauthenticated requests with 401', resNoToken.status === 401 && resNoToken.data?.error?.code === 'UNAUTHORIZED_TOKEN_MISSING', `Status: ${resNoToken.status}, Response: ${JSON.stringify(resNoToken.data)}`);

    // 3. Protected Route with invalid token
    const resInvalidToken = await makeRequest('/api/v1/users', 'GET', { Authorization: 'Bearer forged_fake_token_123' });
    assert('Protected endpoint rejects invalid token with 401', resInvalidToken.status === 401 && resInvalidToken.data?.error?.code === 'UNAUTHORIZED_TOKEN_INVALID', `Status: ${resInvalidToken.status}`);

    // 4. Coordinator Access (Valid Token)
    const coordToken = generateTestToken({
      userId: '6a84719afa3bf51271bc1548',
      email: 'mohanaradha_a@infoziant.com',
      roles: ['PLACEMENT_COORDINATOR'],
      fullName: 'A.Mohanaradha',
    });

    const resCoordUsers = await makeRequest('/api/v1/users', 'GET', { Authorization: `Bearer ${coordToken}` });
    assert('Coordinator with valid token can access general authenticated route /api/v1/users (GET)', resCoordUsers.status === 200, `Status: ${resCoordUsers.status}`);

    // 5. Coordinator attempting Admin action (Role Guard check)
    const resCoordCreateUser = await makeRequest('/api/v1/settings', 'PATCH', { Authorization: `Bearer ${coordToken}` }, { org_name: 'Hacked Org' });
    assert('Coordinator is BLOCKED with 403 Forbidden on Admin-only /api/v1/settings', resCoordCreateUser.status === 403 && resCoordCreateUser.data?.error?.code === 'FORBIDDEN_INSUFFICIENT_PERMISSIONS', `Status: ${resCoordCreateUser.status}`);

    // 6. Admin Access (Full Permissions)
    const adminToken = generateTestToken({
      userId: '6a84719afa3bf51271bc1500',
      email: 'placement_management@infoziant.com',
      roles: ['ADMINISTRATOR'],
      fullName: 'Administrator',
    });

    const resAdminSettings = await makeRequest('/api/v1/settings', 'GET', { Authorization: `Bearer ${adminToken}` });
    assert('Administrator with valid token has full access to /api/v1/settings', resAdminSettings.status === 200, `Status: ${resAdminSettings.status}`);

    console.log('\n===============================================================');
    console.log(`🎯 RESULT: ${passed} / ${total} tests passed successfully!`);
    console.log('===============================================================\n');

    process.exit(passed === total ? 0 : 1);
  } catch (err: any) {
    console.error('❌ Error executing test runner:', err.message);
    process.exit(1);
  }
}

verifyAuth();
