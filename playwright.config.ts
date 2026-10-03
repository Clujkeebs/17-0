import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure', launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {} },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } } },
  ],
  // The standalone server needs the static assets beside it, exactly as the Dockerfile copies them; without them pages load unstyled and never hydrate.
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/ && node .next/standalone/server.js', url: `${baseURL}/api/health`, reuseExistingServer: true, timeout: 120_000 },
});
