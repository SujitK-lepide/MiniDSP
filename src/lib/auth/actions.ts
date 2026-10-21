'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeNextPath } from '@/lib/auth/session';
import { signupErrorMessage, validateSignup, type SignupFieldErrors } from '@/lib/auth/signup';
import { createClient } from '@/lib/supabase/server';

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === 'email_not_confirmed') {
    return { error: 'Confirm your email address first, using the link we sent you.' };
  }
  if (error) return { error: 'Invalid email or password.' };

  redirect(safeNextPath(formData.get('next')));
}

export type SignupState = {
  status: 'idle' | 'error' | 'check-email';
  message: string | null;
  fieldErrors: SignupFieldErrors;
};

/** Origin of this request, for the email confirmation link (Supabase only honours allow-listed redirect URLs). */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get('origin');
  if (origin && /^https?:\/\/[^/\s]+$/.test(origin)) return origin;
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return host ? `${proto}://${host}` : 'http://localhost:8050';
}

export async function signUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  const fieldErrors = validateSignup({ email, password, confirm });
  if (Object.keys(fieldErrors).length > 0) return { status: 'error', message: null, fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await requestOrigin()}/auth/confirm?next=/dashboard` },
  });
  if (error) return { status: 'error', message: signupErrorMessage(error.code), fieldErrors: {} };

  // Email confirmation off → Supabase returns a session straight away.
  if (data.session) redirect('/dashboard');
  return { status: 'check-email', message: null, fieldErrors: {} };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
