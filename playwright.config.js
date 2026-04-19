import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration.
 *
 * Tests live in `tests/e2e/`. Before running, start both:
 *   - Vite dev server: `npm run dev:frontend`
 *   - Wrangler dev:    `npm run dev:worker`
 * Or use the combined `npm run dev` which launches both.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] }
    }
  ],

  // Run the dev server before tests start
  webServer: [
    {
      command: 'npm run dev:worker',
      port: 8787,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe'
    },
    {
      command: 'npm run dev:frontend',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe'
    }
  ]
});
