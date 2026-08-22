// spec: specs/login.plan.md
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';
import { createTestCoordinator } from '../helpers';

test.describe('Sign-in', () => {
  test('wrong password shows attempts remaining', async ({ page }) => {
    // 1. Create a fresh test coordinator account via the signup API.
    const { email } = await createTestCoordinator('wrongpw');

    // 2. Type the account's email into "Official Email Address".
    await page.getByPlaceholder('name@infoziant.com').fill(email);

    // 3. Type an incorrect password into "Password".
    await page.getByPlaceholder('••••••••').fill('DefinitelyWrong1@');

    // 4. Click "Sign-In".
    await page.getByRole('button', { name: 'Sign-In' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText('Incorrect password. 2 attempts remaining before your account is locked.')
    ).toBeVisible();
  });
});
