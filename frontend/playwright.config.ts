import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'html',
  // Auth round trips here do real bcrypt work (cost factor 12, deliberately
  // slow) plus a live MongoDB call, and Next.js dev compiles routes on
  // demand — the default 5s assertion timeout is too tight against a real
  // backend under those conditions. Signup specifically has been observed
  // taking 6-18s under load on this machine, so the test-level timeout
  // needs matching headroom.
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
