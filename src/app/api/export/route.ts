import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/auth/session';
import { findingsToCsv } from '@/lib/csv/export';
import { fetchAllFindings, parseFindingsFilters } from '@/lib/findings/query';

export const runtime = 'nodejs';

/** GET /api/export?detector=&risk= — the signed-in user's masked findings as CSV (same filters as /findings). */
export async function GET(request: Request) {
  const auth = await getApiUser();
  if (!auth) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Sign in required.' } },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filters = parseFindingsFilters(params);

  let csv: string;
  try {
    csv = findingsToCsv(await fetchAllFindings(auth.supabase, filters));
  } catch (err) {
    console.error('export failed', { code: (err as { code?: string }).code ?? 'unknown' });
    return NextResponse.json(
      { error: { code: 'export_failed', message: 'The export could not be created. Please try again.' } },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="minidsp-findings-${stamp}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
