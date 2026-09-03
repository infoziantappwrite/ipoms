# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seed.spec.ts >> seed
- Location: tests\seed.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import { test as baseTest } from '@playwright/test';
  2  | export { expect } from '@playwright/test';
  3  | 
  4  | export const test = baseTest.extend({
  5  |   page: async ({ page }, use) => {
> 6  |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  7  |     await use(page);
  8  |   },
  9  | });
  10 | 
```