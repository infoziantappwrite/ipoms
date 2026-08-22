// spec: specs/login.plan.md
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';
import { createTestCoordinator } from '../helpers';

test.describe('Sign-in', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    // 1. Create a fresh test coordinator account via the signup API.
    const { email, password } = await createTestCoordinator('success');

    // 2. Type the account's email into "Official Email Address".
    await page.getByPlaceholder('name@infoziant.com').fill(email);

    // 3. Type the account's password into "Password".
    await page.getByPlaceholder('••••••••').fill(password);

    // 4. Click "Sign-In".
    await page.getByRole('button', { name: 'Sign-In' }).click();

    // Generous timeout: first hit on /dashboard in a fresh dev server compiles on demand.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
  });
});
