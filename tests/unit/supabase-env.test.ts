// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { supabaseEnv } from '@/lib/supabase/env';

afterEach(() => vi.unstubAllEnvs());

describe('supabaseEnv', () => {
  it('returns trimmed values when both are set', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', ' https://abc.supabase.co ');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-key');
    expect(supabaseEnv()).toEqual({ url: 'https://abc.supabase.co', anonKey: 'public-anon-key' });
  });

  it('names every missing variable and how to fix it', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(() => supabaseEnv()).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL is not set; NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.*Vercel.*redeploy/,
    );
  });

  it('rejects a URL that is not http(s) without echoing the value', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'abc.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'secret-looking-value');
    let message = '';
    try {
      supabaseEnv();
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/NEXT_PUBLIC_SUPABASE_URL is not an http\(s\) URL/);
    expect(message).not.toContain('abc.supabase.co');
    expect(message).not.toContain('secret-looking-value');
  });
});
