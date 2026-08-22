// spec: specs/login.plan.md
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';

test.describe('Sign-in', () => {
  test('unknown email shows no account message', async ({ page }) => {
    // 1. Type a syntactically valid but non-existent @infoziant.com address into "Official Email Address".
    await page.getByPlaceholder('name@infoziant.com').fill('definitely.not.a.real.user@infoziant.com');

    // 2. Type any password into "Password".
    await page.getByPlaceholder('••••••••').fill('AnyPassword1@');

    // 3. Click "Sign-In".
    await page.getByRole('button', { name: 'Sign-In' }).click();

    await expect(page.getByText('No iPOMS account exists for this email address.')).toBeVisible();
  });
});
