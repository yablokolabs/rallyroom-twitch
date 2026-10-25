import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e', fullyParallel: false, workers: 1, timeout: 120000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3100', viewport: { width: 1440, height: 1080 }, trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev', url: 'http://127.0.0.1:3100/api/health', reuseExistingServer: false,
    env: { PORT: '3100', RALLY_MODE: 'simulation', RALLY_DATA_DIR: '.data/e2e', CONTROL_KEY: 'rallyroom-e2e-only-control-key', TWITCH_REDIRECT_URI: 'http://localhost:3100/auth/twitch/callback' },
    timeout: 30000,
  },
});
