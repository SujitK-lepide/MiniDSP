import { existsSync } from 'node:fs';
import { chromium, defineConfig, devices } from '@playwright/test';

const PORT = 8050;
const baseURL = `http://localhost:${PORT}`;

// Chromium only. Use Playwright's bundled Chromium when installed; otherwise fall back to the locally
// installed Google Chrome (Chromium-based) — on this network cdn.playwright.dev is blocked (untrusted cert).
// Override with PW_CHANNEL (e.g. "chromium", "chrome", "msedge").
const bundledChromium = (() => {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();
const channel = process.env.PW_CHANNEL || (bundledChromium ? undefined : 'chrome');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    acceptDownloads: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel } }],
  webServer: {
    command: 'npm run dev',
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Lets Node trust a corporate TLS-inspection root from the OS store; harmless elsewhere.
    env: { NODE_USE_SYSTEM_CA: '1' },
  },
});
