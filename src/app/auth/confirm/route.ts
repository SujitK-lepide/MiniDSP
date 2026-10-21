import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const OTP_TYPES: readonly EmailOtpType[] = ['signup', 'email', 'invite', 'magiclink', 'recovery', 'email_change'];

/**
 * Email confirmation landing route. Supports both Supabase link styles:
 * `?token_hash=…&type=signup` (custom email template) and `?code=…` (default PKCE flow).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get('next'));
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  const code = params.get('code');

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  redirect(ok ? next : '/login?error=confirm');
}
