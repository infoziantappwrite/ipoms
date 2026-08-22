const API = process.env.API_URL || 'http://localhost:5000/api/v1';

/** Valid per backend/src/lib/passwordPolicy.ts: 9+ chars, upper, lower, digit, only @ or . as specials. */
export const VALID_TEST_PASSWORD = 'TestPass1@2026';

/**
 * Creates a disposable @infoziant.com coordinator account via the public
 * signup endpoint, unique per call so lockout/failed-attempt tests never
 * collide with each other or with real staff accounts.
 */
export async function createTestCoordinator(labelPrefix: string) {
  const unique = `${labelPrefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}`;
  const email = `e2e.${unique}@infoziant.com`;
  const username = `e2e_${unique}`;

  const res = await fetch(`${API}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: `E2E ${labelPrefix}`,
      username,
      official_email: email,
      primary_mobile: '9999999999',
      password: VALID_TEST_PASSWORD,
    }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Failed to create test coordinator: ${data.error?.message}`);
  }
  return { email, password: VALID_TEST_PASSWORD };
}
