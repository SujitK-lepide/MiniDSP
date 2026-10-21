import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

// Session refresh only. Authorisation is enforced in each page / route handler with getUser().
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
