// @vitest-environment node
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { hasUser, readTestEnv, type TestEnv } from '../helpers/env-local';

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const env = readTestEnv() as Required<TestEnv>;
const hasCreds = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && hasUser(env, 'A') && hasUser(env, 'B'),
);

const newClient = () =>
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const TAG = `rls-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const MASKED_FINDINGS = [
  { detector: 'payment_card', risk: 'Critical', occurrences: 2, masked_example: '************1111' },
  { detector: 'email', risk: 'Low', occurrences: 1, masked_example: 'a***@example.test' },
];

describe.skipIf(!hasCreds)('Supabase RLS (two users)', () => {
  let a: SupabaseClient;
  let b: SupabaseClient;
  let aId = '';
  let bId = '';
  let scanId = '';

  beforeAll(async () => {
    a = newClient();
    b = newClient();
    const ra = await a.auth.signInWithPassword({ email: env.TEST_USER_A_EMAIL, password: env.TEST_USER_A_PASSWORD });
    if (ra.error || !ra.data.user) throw new Error(`User A sign-in failed: ${ra.error?.message ?? 'no user'}`);
    const rb = await b.auth.signInWithPassword({ email: env.TEST_USER_B_EMAIL, password: env.TEST_USER_B_PASSWORD });
    if (rb.error || !rb.data.user) throw new Error(`User B sign-in failed: ${rb.error?.message ?? 'no user'}`);
    aId = ra.data.user.id;
    bId = rb.data.user.id;
    expect(aId).not.toBe(bId);
  });

  afterAll(async () => {
    if (a) {
      await a.from('scans').delete().like('filename', `${TAG}%`);
      await a.auth.signOut();
    }
    if (b) {
      await b.from('scans').delete().like('filename', `${TAG}%`);
      await b.auth.signOut();
    }
  });

  it('A saves a scan via save_scan and can read it back', async () => {
    const { data, error } = await a.rpc('save_scan', {
      p_filename: `${TAG}-a.csv`,
      p_size_bytes: 123,
      p_risk: 'Critical',
      p_findings: MASKED_FINDINGS,
    });
    expect(error).toBeNull();
    expect(typeof data).toBe('string');
    scanId = data as string;

    const scan = await a.from('scans').select('id,user_id,risk,total_findings').eq('id', scanId).single();
    expect(scan.error).toBeNull();
    expect(scan.data).toMatchObject({ id: scanId, user_id: aId, risk: 'Critical', total_findings: 3 });

    const findings = await a.from('findings').select('detector,occurrences,masked_example').eq('scan_id', scanId);
    expect(findings.error).toBeNull();
    expect(findings.data).toHaveLength(2);
  });

  it('B cannot select A’s scan or findings', async () => {
    expect(scanId).not.toBe('');
    const scans = await b.from('scans').select('id').eq('id', scanId);
    expect(scans.error).toBeNull();
    expect(scans.data).toEqual([]);

    const findings = await b.from('findings').select('id').eq('scan_id', scanId);
    expect(findings.error).toBeNull();
    expect(findings.data).toEqual([]);
  });

  it('B cannot insert a finding into A’s scan_id (own or spoofed user_id)', async () => {
    const asB = await b
      .from('findings')
      .insert({ scan_id: scanId, user_id: bId, detector: 'uk_nino', risk: 'High', occurrences: 1, masked_example: 'AB******C' });
    expect(asB.error).not.toBeNull();

    const spoofed = await b
      .from('findings')
      .insert({ scan_id: scanId, user_id: aId, detector: 'uk_phone', risk: 'Medium', occurrences: 1, masked_example: '07******123' });
    expect(spoofed.error).not.toBeNull();

    const check = await a.from('findings').select('detector').eq('scan_id', scanId);
    expect(check.data?.map((f) => f.detector).sort()).toEqual(['email', 'payment_card']);
  });

  it('B cannot create a scan owned by A, nor delete A’s scan', async () => {
    const spoof = await b
      .from('scans')
      .insert({ user_id: aId, filename: `${TAG}-spoof.txt`, size_bytes: 1, risk: 'None' });
    expect(spoof.error).not.toBeNull();

    const del = await b.from('scans').delete().eq('id', scanId).select('id');
    expect(del.data ?? []).toEqual([]);
    const still = await a.from('scans').select('id').eq('id', scanId);
    expect(still.data).toHaveLength(1);
  });

  it('anonymous clients cannot read scans or call save_scan', async () => {
    const anon = newClient();
    const read = await anon.from('scans').select('id').eq('id', scanId);
    expect(read.data ?? []).toEqual([]);
    const rpc = await anon.rpc('save_scan', {
      p_filename: `${TAG}-anon.txt`,
      p_size_bytes: 1,
      p_risk: 'None',
      p_findings: [],
    });
    expect(rpc.error).not.toBeNull();
  });

  it('save_scan with a bad detector leaves NO scan row (atomic)', async () => {
    const filename = `${TAG}-atomic.csv`;
    const { data, error } = await a.rpc('save_scan', {
      p_filename: filename,
      p_size_bytes: 10,
      p_risk: 'High',
      p_findings: [
        { detector: 'email', risk: 'Low', occurrences: 1, masked_example: 'a***@example.test' },
        { detector: 'not_a_detector', risk: 'High', occurrences: 1, masked_example: 'XX' },
      ],
    });
    expect(error).not.toBeNull();
    expect(data).toBeNull();

    const rows = await a.from('scans').select('id').eq('filename', filename);
    expect(rows.error).toBeNull();
    expect(rows.data).toEqual([]);
  });
});

describe.runIf(!hasCreds)('Supabase RLS (two users)', () => {
  it.skip('SKIPPED: TEST_USER_A/B_EMAIL/PASSWORD (or Supabase URL/key) missing from .env.local', () => {});
});
