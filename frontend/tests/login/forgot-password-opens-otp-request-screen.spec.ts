// spec: specs/login.plan.md
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';

test.describe('Sign-in', () => {
  test('forgot password opens OTP request screen', async ({ page }) => {
    // 1. Click "Forgot password?".
    await page.getByRole('button', { name: 'Forgot password?' }).click();

    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Verification Code' })).toBeVisible();
  });
});
