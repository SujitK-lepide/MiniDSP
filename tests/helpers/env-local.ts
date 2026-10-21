import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const TEST_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'TEST_USER_A_EMAIL',
  'TEST_USER_A_PASSWORD',
  'TEST_USER_B_EMAIL',
  'TEST_USER_B_PASSWORD',
] as const;

export type TestEnv = Partial<Record<(typeof TEST_ENV_KEYS)[number], string>>;

/** Reads only the test-related keys from .env.local (falls back to process.env). Values are never printed. */
export function readTestEnv(cwd = process.cwd()): TestEnv {
  let text = '';
  try {
    text = readFileSync(join(cwd, '.env.local'), 'utf8');
  } catch {
    // no .env.local
  }
  const out: TestEnv = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    const key = m?.[1] as (typeof TEST_ENV_KEYS)[number] | undefined;
    if (m && key && TEST_ENV_KEYS.includes(key)) out[key] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  for (const k of TEST_ENV_KEYS) if (!out[k] && process.env[k]) out[k] = process.env[k];
  return out;
}

export const hasUser = (env: TestEnv, who: 'A' | 'B') =>
  Boolean(env[`TEST_USER_${who}_EMAIL`] && env[`TEST_USER_${who}_PASSWORD`]);
