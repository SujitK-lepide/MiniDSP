import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { hasUser, readTestEnv } from '../helpers/env-local';

const env = readTestEnv();
const HAS_USER_A = hasUser(env, 'A');
const SKIP_REASON = 'SKIPPED: TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD missing from .env.local';

const FIXTURE = join(process.cwd(), 'tests', 'fixtures', 'additional', '22_all_four.csv');

/** Data lines of the fixture (header excluded) — none may appear verbatim in the UI or export. */
const rawLines = () =>
  readFileSync(FIXTURE, 'utf8')
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.trim())
    .filter(Boolean);

async function signInAsA(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(env.TEST_USER_A_EMAIL!);
  await page.getByLabel('Password').fill(env.TEST_USER_A_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('unauthenticated', () => {
  test('protected pages redirect to /login, which loads the Lepidus design system', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    await expect(page.getByRole('heading', { name: 'Sign in to MiniDSP' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(() => page.evaluate(() => typeof window.Lepidus?.init)).toBe('function');
  });

  test('POST /api/scan without a session → 401', async ({ request }) => {
    const res = await request.post('/api/scan', {
      multipart: { file: { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') } },
    });
    expect(res.status()).toBe(401);
  });

  test('protected pages answer with a real HTTP 307 (not a streamed redirect)', async ({ request }) => {
    for (const path of ['/dashboard', '/upload', '/findings']) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(307);
      expect(res.headers()['location'], path).toContain('/login?next=');
    }
  });

  test('GET /api/export without a session → 401', async ({ request }) => {
    expect((await request.get('/api/export')).status()).toBe(401);
  });

  test('sign-up page validates on the server without creating an account', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Confirm password').fill('different');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Enter a valid email address, e.g. name@example.com.')).toBeVisible();
    await expect(page.getByText('Use at least 8 characters.')).toBeVisible();
    await expect(page.getByText('The passwords do not match.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  test('an invalid confirmation link lands on /login with an explanation', async ({ page }) => {
    await page.goto('/auth/confirm?token_hash=bogus&type=nope');
    await expect(page).toHaveURL(/\/login\?error=confirm$/);
    await expect(page.getByRole('alert').filter({ hasText: 'Confirmation link not valid' })).toBeVisible();
  });
});

test.describe('signed in as user A', () => {
  test.skip(!HAS_USER_A, SKIP_REASON);

  test('upload 22_all_four.csv → Critical (masked) → filter findings → export masked CSV', async ({ page }) => {
    await signInAsA(page);

    // Upload
    await page.goto('/upload');
    await page.getByLabel('File').setInputFiles(FIXTURE);
    await page.getByRole('button', { name: 'Scan file' }).click();
    const result = page.getByRole('region', { name: 'Scan result' });
    await expect(result).toBeVisible();
    await expect(result.locator('.lp-card__actions')).toContainText('Critical');
    const table = result.getByRole('table', { name: 'Masked findings for this file' });
    await expect(table).toContainText('Payment card');
    await expect(table).toContainText('************');
    const resultText = (await result.innerText()) ?? '';
    for (const line of rawLines()) expect(resultText).not.toContain(line);

    // Findings filter (lepidus.js dropdown in a real browser)
    await page.goto('/findings');
    await page.getByRole('button', { name: 'All detectors' }).click();
    await page.getByRole('option', { name: 'Payment card' }).click();
    await expect(page).toHaveURL(/\/findings\?detector=payment_card$/);
    const rows = page.getByRole('table', { name: 'Masked findings' }).locator('tbody tr');
    await expect(rows.first()).toContainText('Payment card');
    for (const text of await rows.allInnerTexts()) expect(text).toContain('Payment card');

    // Export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^minidsp-findings-\d{8}-\d{6}\.csv$/);
    const csv = readFileSync((await download.path())!, 'utf8');
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe('"filename","scanned_at","detector","risk","occurrences","masked_example"');
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines.slice(1)) {
      expect(line).toContain('"payment_card"');
      expect(line).toMatch(/"\*+\d{4}"$/);
    }
    for (const raw of rawLines()) expect(csv).not.toContain(raw);
  });

  test('oversized upload shows the server rejection message', async ({ page }) => {
    await signInAsA(page);
    await page.goto('/upload');
    await page.getByLabel('File').setInputFiles({
      name: 'oversized.txt',
      mimeType: 'text/plain',
      buffer: Buffer.alloc(1_048_577, 'a'),
    });
    await page.getByRole('button', { name: 'Scan file' }).click();
    const alert = page.getByRole('alert').filter({ hasText: 'Upload rejected' });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('larger than 1 MiB');
  });

  test('folder scan uploads every .csv/.txt in the fixtures folder separately', async ({ page }) => {
    test.setTimeout(180_000);
    await signInAsA(page);
    await page.goto('/upload');
    // 31 files: 29 .csv/.txt (27 scannable + 28_empty + 30_oversized) and 2 .json.
    await page.getByLabel('Folder').setInputFiles(join(process.cwd(), 'tests', 'fixtures', 'additional'));
    await expect(page.getByText('29 files to scan, 2 skipped.')).toBeVisible();
    await page.getByRole('button', { name: 'Scan 29 files' }).click();
    await expect(page.getByText('27 scanned, 2 rejected, 2 skipped.')).toBeVisible({ timeout: 150_000 });
    const table = page.getByRole('table', { name: 'Folder scan results' });
    await expect(table.locator('tr', { hasText: '28_empty.txt' })).toContainText('The file is empty.');
    await expect(table.locator('tr', { hasText: '30_oversized.txt' })).toContainText('larger than 1 MiB');
    await expect(table.locator('tr', { hasText: '22_all_four.csv' })).toContainText('Critical');
    for (const line of rawLines()) await expect(table).not.toContainText(line);
  });
});
