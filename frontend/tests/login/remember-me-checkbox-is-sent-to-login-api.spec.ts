// spec: specs/login.plan.md
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';
import { createTestCoordinator } from '../helpers';

test.describe('Sign-in', () => {
  test('remember-me checkbox is sent to the login API', async ({ page }) => {
    // 1. Create a fresh test coordinator account via the signup API.
    const { email, password } = await createTestCoordinator('remember');

    // 2. Confirm "Remember this device for 30 days" is checked by default.
    const rememberCheckbox = page.getByRole('checkbox', { name: 'Remember this device for 30 days' });
    await expect(rememberCheckbox).toBeChecked();

    // 3. Type the account's email and password.
    await page.getByPlaceholder('name@infoziant.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);

    // 4. Intercept the POST /api/v1/auth/login request while clicking "Sign-In".
    const [loginRequest] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/api/v1/auth/login') && req.method() === 'POST'),
      page.getByRole('button', { name: 'Sign-In' }).click(),
    ]);

    expect(loginRequest.postDataJSON()).toMatchObject({ remember_me: true });
  });
});
