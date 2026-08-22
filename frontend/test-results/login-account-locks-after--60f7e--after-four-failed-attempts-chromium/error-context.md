# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login\account-locks-after-four-failed-attempts.spec.ts >> Sign-in >> account locks after four failed attempts
- Location: tests\login\account-locks-after-four-failed-attempts.spec.ts:7:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.fill: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByPlaceholder('name@infoziant.com')

```

# Test source

```ts
  1  | // spec: specs/login.plan.md
  2  | // seed: tests/seed.spec.ts
  3  | import { test, expect } from '../fixtures';
  4  | import { createTestCoordinator } from '../helpers';
  5  | 
  6  | test.describe('Sign-in', () => {
  7  |   test('account locks after four failed attempts', async ({ page }) => {
  8  |     // 1. Create a fresh test coordinator account via the signup API.
  9  |     const { email } = await createTestCoordinator('lockout');
  10 | 
  11 |     const submitWrongPassword = async (wrongPassword: string) => {
> 12 |       await page.getByPlaceholder('name@infoziant.com').fill(email);
     |                                                         ^ Error: locator.fill: Test timeout of 60000ms exceeded.
  13 |       await page.getByPlaceholder('••••••••').fill(wrongPassword);
  14 |       await page.getByRole('button', { name: 'Sign-In' }).click();
  15 |     };
  16 | 
  17 |     // 2. Submit the login form with a wrong password (1st failure).
  18 |     await submitWrongPassword('Wrong1@Attempt');
  19 |     await expect(
  20 |       page.getByText('Incorrect password. 2 attempts remaining before your account is locked.')
  21 |     ).toBeVisible();
  22 | 
  23 |     // 3. Submit again with a wrong password (2nd failure).
  24 |     await submitWrongPassword('Wrong2@Attempt');
  25 |     await expect(
  26 |       page.getByText('Incorrect password. 1 attempt remaining before your account is locked.')
  27 |     ).toBeVisible();
  28 | 
  29 |     // 4. Submit again with a wrong password (3rd failure).
  30 |     await submitWrongPassword('Wrong3@Attempt');
  31 |     await expect(
  32 |       page.getByText('Incorrect password. One more failed attempt will lock your account.')
  33 |     ).toBeVisible();
  34 | 
  35 |     // 5. Submit again with a wrong password (4th failure — exceeds the allowance).
  36 |     await submitWrongPassword('Wrong4@Attempt');
  37 |     await expect(page.getByRole('heading', { name: 'Verify & Unlock Account' })).toBeVisible();
  38 |     await expect(page.getByPlaceholder('0 0 0 0 0 0')).toBeVisible();
  39 |   });
  40 | });
  41 | 
```