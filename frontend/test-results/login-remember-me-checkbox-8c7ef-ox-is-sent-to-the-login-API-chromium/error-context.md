# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login\remember-me-checkbox-is-sent-to-login-api.spec.ts >> Sign-in >> remember-me checkbox is sent to the login API
- Location: tests\login\remember-me-checkbox-is-sent-to-login-api.spec.ts:7:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForRequest: Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main"
  - main [ref=e3]:
    - generic [ref=e8]:
      - generic [ref=e9]:
        - img "Infoziant" [ref=e11]
        - heading "Sign in to iPOMS" [level=1] [ref=e12]
        - paragraph [ref=e13]: Infoziant Placement Operations Management System
      - generic [ref=e14]:
        - button "Sign In" [ref=e15] [cursor=pointer]
        - button "Create Account" [ref=e19] [cursor=pointer]
      - generic [ref=e22]:
        - generic [ref=e23]:
          - generic [ref=e24]: Official Email Address
          - textbox "name@infoziant.com" [ref=e25]: e2e.remember.1787407047814.298076@infoziant.com
          - paragraph [ref=e26]: Type your name and press Tab — @infoziant.com is added for you.
        - generic [ref=e27]:
          - generic [ref=e28]:
            - generic [ref=e29]: Password
            - button "Forgot password?" [ref=e30] [cursor=pointer]
          - generic [ref=e31]:
            - textbox "••••••••" [active] [ref=e32]: TestPass1@2026
            - button "Show" [ref=e33] [cursor=pointer]
        - generic [ref=e34] [cursor=pointer]:
          - checkbox "Remember this device for 30 days" [checked] [ref=e35]
          - generic [ref=e36]: Remember this device for 30 days
        - button "Sign-In" [ref=e37] [cursor=pointer]
  - status
  - alert [ref=e38]
```

# Test source

```ts
  1  | // spec: specs/login.plan.md
  2  | // seed: tests/seed.spec.ts
  3  | import { test, expect } from '../fixtures';
  4  | import { createTestCoordinator } from '../helpers';
  5  | 
  6  | test.describe('Sign-in', () => {
  7  |   test('remember-me checkbox is sent to the login API', async ({ page }) => {
  8  |     // 1. Create a fresh test coordinator account via the signup API.
  9  |     const { email, password } = await createTestCoordinator('remember');
  10 | 
  11 |     // 2. Confirm "Remember this device for 30 days" is checked by default.
  12 |     const rememberCheckbox = page.getByRole('checkbox', { name: 'Remember this device for 30 days' });
  13 |     await expect(rememberCheckbox).toBeChecked();
  14 | 
  15 |     // 3. Type the account's email and password.
  16 |     await page.getByPlaceholder('name@infoziant.com').fill(email);
  17 |     await page.getByPlaceholder('••••••••').fill(password);
  18 | 
  19 |     // 4. Intercept the POST /api/v1/auth/login request while clicking "Sign-In".
  20 |     const [loginRequest] = await Promise.all([
> 21 |       page.waitForRequest((req) => req.url().includes('/api/v1/auth/login') && req.method() === 'POST'),
     |            ^ Error: page.waitForRequest: Test timeout of 60000ms exceeded.
  22 |       page.getByRole('button', { name: 'Sign-In' }).click(),
  23 |     ]);
  24 | 
  25 |     expect(loginRequest.postDataJSON()).toMatchObject({ remember_me: true });
  26 |   });
  27 | });
  28 | 
```