import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const PROTECTED_PATHS = ['/dashboard', '/upload', '/findings'] as const;

/** Only allow redirects back to known in-app pages (prevents open redirects). */
export function safeNextPath(next: unknown): string {
  if (typeof next !== 'string') return '/dashboard';
  const match = PROTECTED_PATHS.find((p) => next === p || next.startsWith(`${p}?`));
  return match ? next : '/dashboard';
}

/** One verified getUser() per server render, shared by a segment's layout and page. */
const getVerifiedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/**
 * For pages/layouts: verified user (via Supabase Auth server) or redirect to /login.
 * Call it from the segment layout too when the segment has a loading.tsx, so the redirect
 * happens before streaming starts (a real HTTP 307 instead of a streamed redirect).
 */
export async function requireUser(nextPath: string) {
  const { supabase, user } = await getVerifiedUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return { supabase, user };
}

/** For route handlers: verified user, or null (caller returns 401). */
export async function getApiUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}
