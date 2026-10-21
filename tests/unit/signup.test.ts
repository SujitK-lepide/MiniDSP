// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PASSWORD_MAX_BYTES, signupErrorMessage, validateSignup } from '@/lib/auth/signup';

const signUpMock = vi.fn();
const signInMock = vi.fn();
const headerValues = new Map<string, string>();

vi.mock('next/headers', () => ({ headers: async () => ({ get: (k: string) => headerValues.get(k) ?? null }) }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { signUp: signUpMock, signInWithPassword: signInMock } })),
}));

const { signUp, login } = await import('@/lib/auth/actions');

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
};
const IDLE = { status: 'idle' as const, message: null, fieldErrors: {} };
const VALID = { email: 'new.user@example.test', password: 'correct-horse-9', confirm: 'correct-horse-9' };

beforeEach(() => {
  signUpMock.mockReset();
  signInMock.mockReset();
  headerValues.clear();
  headerValues.set('origin', 'http://localhost:8050');
});

describe('validateSignup', () => {
  it('accepts a valid email and matching 8+ character passwords', () => {
    expect(validateSignup(VALID)).toEqual({});
  });

  it.each([
    [{ ...VALID, email: '' }, 'email', 'Enter your email address.'],
    [{ ...VALID, email: 'not-an-email' }, 'email', /valid email/],
    [{ ...VALID, email: 'a@b' }, 'email', /valid email/],
    [{ ...VALID, password: '', confirm: '' }, 'password', 'Choose a password.'],
    [{ ...VALID, password: 'short1', confirm: 'short1' }, 'password', /at least 8/],
    [{ ...VALID, confirm: 'different-pass' }, 'confirm', /do not match/],
    [{ ...VALID, confirm: '' }, 'confirm', /Re-enter/],
  ])('%j → %s error', (input, field, message) => {
    const errors = validateSignup(input) as Record<string, string>;
    expect(errors[field]).toMatch(message);
  });

  it(`rejects passwords over ${PASSWORD_MAX_BYTES} bytes (bcrypt limit)`, () => {
    const long = 'é'.repeat(37); // 74 bytes
    expect(validateSignup({ ...VALID, password: long, confirm: long }).password).toMatch(/at most 72 bytes/);
  });
});

describe('signupErrorMessage', () => {
  it('maps known Supabase codes and never echoes server text', () => {
    expect(signupErrorMessage('user_already_exists')).toMatch(/already exists/);
    expect(signupErrorMessage('email_exists')).toMatch(/already exists/);
    expect(signupErrorMessage('weak_password')).toMatch(/stronger password/);
    expect(signupErrorMessage('over_email_send_rate_limit')).toMatch(/Too many/);
    expect(signupErrorMessage('signup_disabled')).toMatch(/turned off/);
    expect(signupErrorMessage('something_new')).toBe('The account could not be created. Try again in a moment.');
    expect(signupErrorMessage(undefined)).toBe('The account could not be created. Try again in a moment.');
  });
});

describe('signUp server action', () => {
  it('returns field errors and makes no Supabase call for invalid input', async () => {
    const state = await signUp(IDLE, form({ email: 'bad', password: 'x', confirm: 'y' }));
    expect(state.status).toBe('error');
    expect(Object.keys(state.fieldErrors).sort()).toEqual(['confirm', 'email', 'password']);
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('calls Supabase with a confirmation redirect on this origin', async () => {
    signUpMock.mockResolvedValue({ data: { user: { id: 'u' }, session: null }, error: null });
    await signUp(IDLE, form(VALID));
    expect(signUpMock).toHaveBeenCalledWith({
      email: VALID.email,
      password: VALID.password,
      options: { emailRedirectTo: 'http://localhost:8050/auth/confirm?next=/dashboard' },
    });
  });

  it('falls back to Host when Origin is missing or malformed', async () => {
    headerValues.set('origin', 'javascript:alert(1)');
    headerValues.set('host', 'minidsp.example.test');
    headerValues.set('x-forwarded-proto', 'https');
    signUpMock.mockResolvedValue({ data: { user: { id: 'u' }, session: null }, error: null });
    await signUp(IDLE, form(VALID));
    expect(signUpMock.mock.calls[0][0].options.emailRedirectTo).toBe(
      'https://minidsp.example.test/auth/confirm?next=/dashboard',
    );
  });

  it('email confirmation on (no session) → "check-email" state', async () => {
    signUpMock.mockResolvedValue({ data: { user: { id: 'u' }, session: null }, error: null });
    expect(await signUp(IDLE, form(VALID))).toEqual({ status: 'check-email', message: null, fieldErrors: {} });
  });

  it('email confirmation off (session returned) → redirect to /dashboard', async () => {
    signUpMock.mockResolvedValue({ data: { user: { id: 'u' }, session: { access_token: 't' } }, error: null });
    await expect(signUp(IDLE, form(VALID))).rejects.toThrow('REDIRECT:/dashboard');
  });

  it('maps Supabase errors to safe messages', async () => {
    signUpMock.mockResolvedValue({ data: { user: null, session: null }, error: { code: 'user_already_exists', message: 'raw server text' } });
    const state = await signUp(IDLE, form(VALID));
    expect(state).toEqual({
      status: 'error',
      message: 'An account with this email already exists. Sign in instead.',
      fieldErrors: {},
    });
  });
});

describe('login server action', () => {
  it('tells unconfirmed users to confirm their email', async () => {
    signInMock.mockResolvedValue({ error: { code: 'email_not_confirmed' } });
    expect(await login({ error: null }, form({ email: 'a@example.test', password: 'whatever1' }))).toEqual({
      error: 'Confirm your email address first, using the link we sent you.',
    });
  });

  it('keeps a generic message for wrong credentials', async () => {
    signInMock.mockResolvedValue({ error: { code: 'invalid_credentials' } });
    expect(await login({ error: null }, form({ email: 'a@example.test', password: 'whatever1' }))).toEqual({
      error: 'Invalid email or password.',
    });
  });
});
