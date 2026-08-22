// spec: specs/login.plan.md
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';
import { createTestCoordinator } from '../helpers';

test.describe('Sign-in', () => {
  test('account locks after four failed attempts', async ({ page }) => {
    // 1. Create a fresh test coordinator account via the signup API.
    const { email } = await createTestCoordinator('lockout');

    const submitWrongPassword = async (wrongPassword: string) => {
      await page.getByPlaceholder('name@infoziant.com').fill(email);
      await page.getByPlaceholder('••••••••').fill(wrongPassword);
      await page.getByRole('button', { name: 'Sign-In' }).click();
    };

    // 2. Submit the login form with a wrong password (1st failure).
    await submitWrongPassword('Wrong1@Attempt');
    await expect(
      page.getByText('Incorrect password. 2 attempts remaining before your account is locked.')
    ).toBeVisible();

    // 3. Submit again with a wrong password (2nd failure).
    await submitWrongPassword('Wrong2@Attempt');
    await expect(
      page.getByText('Incorrect password. 1 attempt remaining before your account is locked.')
    ).toBeVisible();

    // 4. Submit again with a wrong password (3rd failure).
    await submitWrongPassword('Wrong3@Attempt');
    await expect(
      page.getByText('Incorrect password. One more failed attempt will lock your account.')
    ).toBeVisible();

    // 5. Submit again with a wrong password (4th failure — exceeds the allowance).
    await submitWrongPassword('Wrong4@Attempt');
    await expect(page.getByRole('heading', { name: 'Verify & Unlock Account' })).toBeVisible();
    await expect(page.getByPlaceholder('0 0 0 0 0 0')).toBeVisible();
  });
});
