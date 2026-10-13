import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4322' },
  webServer: {
    command: 'npx astro preview --port 4322',
    url: 'http://localhost:4322',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
