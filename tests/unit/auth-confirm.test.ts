// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { verifyOtp, exchangeCodeForSession } })),
}));

const { GET } = await import('@/app/auth/confirm/route');

const call = (qs: string) => GET(new NextRequest(`http://localhost:8050/auth/confirm${qs}`));

beforeEach(() => {
  verifyOtp.mockReset();
  exchangeCodeForSession.mockReset();
});

describe('GET /auth/confirm', () => {
  it('verifies a token_hash link and redirects to next', async () => {
    verifyOtp.mockResolvedValue({ error: null });
    await expect(call('?token_hash=abc&type=signup&next=/dashboard')).rejects.toThrow('REDIRECT:/dashboard');
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'signup', token_hash: 'abc' });
  });

  it('exchanges a PKCE code', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    await expect(call('?code=xyz&next=/upload')).rejects.toThrow('REDIRECT:/upload');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('xyz');
  });

  it('sends failures back to /login with an error flag', async () => {
    verifyOtp.mockResolvedValue({ error: { code: 'otp_expired' } });
    await expect(call('?token_hash=abc&type=signup')).rejects.toThrow('REDIRECT:/login?error=confirm');
  });

  it('rejects unknown types and empty links without calling Supabase', async () => {
    await expect(call('?token_hash=abc&type=bogus')).rejects.toThrow('REDIRECT:/login?error=confirm');
    await expect(call('')).rejects.toThrow('REDIRECT:/login?error=confirm');
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('never redirects off-site via next', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    await expect(call('?code=xyz&next=https://evil.example')).rejects.toThrow('REDIRECT:/dashboard');
    await expect(call('?code=xyz&next=//evil.example')).rejects.toThrow('REDIRECT:/dashboard');
  });
});
