// spec: specs/login.plan.md
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';

test.describe('Sign-in', () => {
  test('wrong domain email is rejected', async ({ page }) => {
    // 1. Type an email at a non-Infoziant domain into "Official Email Address".
    await page.getByPlaceholder('name@infoziant.com').fill('someone@gmail.com');

    // 2. Type any password into "Password".
    await page.getByPlaceholder('••••••••').fill('AnyPassword1@');

    // 3. Click "Sign-In".
    await page.getByRole('button', { name: 'Sign-In' }).click();

    await expect(page.getByText('Use your Infoziant address — it must end in @infoziant.com.')).toBeVisible();
  });
});
