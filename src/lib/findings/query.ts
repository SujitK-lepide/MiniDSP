import type { SupabaseClient } from '@supabase/supabase-js';
import { RISK_ORDER } from '@/lib/detectors/classify';
import type { Detector, Risk } from '@/lib/detectors/types';
import { DETECTORS } from '@/lib/ui/labels';

export type FindingsFilters = { detector?: Detector; risk?: Risk };

export type FindingRow = {
  id: string;
  filename: string;
  scannedAt: string;
  detector: Detector;
  risk: Risk;
  occurrences: number;
  maskedExample: string;
};

export const FINDINGS_PAGE_SIZE = 200;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Unknown values are ignored (treated as "all"), never passed to the database. */
export function parseFindingsFilters(params: SearchParams): FindingsFilters {
  const detector = first(params.detector);
  const risk = first(params.risk);
  return {
    detector: DETECTORS.includes(detector as Detector) ? (detector as Detector) : undefined,
    risk: RISK_ORDER.includes(risk as Risk) ? (risk as Risk) : undefined,
  };
}

export function findingsSearch(filters: FindingsFilters): string {
  const qs = new URLSearchParams();
  if (filters.detector) qs.set('detector', filters.detector);
  if (filters.risk) qs.set('risk', filters.risk);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const findingsHref = (filters: FindingsFilters) => `/findings${findingsSearch(filters)}`;

type DbFinding = {
  id: string;
  detector: Detector;
  risk: Risk;
  occurrences: number;
  masked_example: string;
  created_at: string;
  scan: { filename: string; created_at: string } | null;
};

export class FindingsQueryError extends Error {
  constructor(public readonly code: string) {
    super('Could not load findings.');
  }
}

const SELECT = 'id, detector, risk, occurrences, masked_example, created_at, scan:scans(filename, created_at)';

const toRow = (f: DbFinding): FindingRow => ({
  id: f.id,
  filename: f.scan?.filename ?? '-',
  scannedAt: f.scan?.created_at ?? f.created_at,
  detector: f.detector,
  risk: f.risk,
  occurrences: f.occurrences,
  maskedExample: f.masked_example,
});

/**
 * One page of findings, newest first (id breaks ties so paging is stable).
 * RLS-scoped: the caller passes the signed-in user's client. Filtering happens in the database.
 */
async function fetchFindingsRange(
  supabase: SupabaseClient,
  filters: FindingsFilters,
  from: number,
  to: number,
  withCount: boolean,
): Promise<{ rows: FindingRow[]; count: number | null }> {
  let query = supabase.from('findings').select(SELECT, withCount ? { count: 'exact' } : undefined);
  if (filters.detector) query = query.eq('detector', filters.detector);
  if (filters.risk) query = query.eq('risk', filters.risk);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to);
  if (error) throw new FindingsQueryError(error.code ?? 'unknown');
  return { rows: ((data ?? []) as unknown as DbFinding[]).map(toRow), count: count ?? null };
}

export async function fetchFindings(
  supabase: SupabaseClient,
  filters: FindingsFilters,
  limit = FINDINGS_PAGE_SIZE,
): Promise<{ rows: FindingRow[]; total: number }> {
  const { rows, count } = await fetchFindingsRange(supabase, filters, 0, limit - 1, true);
  return { rows, total: count ?? rows.length };
}

const EXPORT_PAGE = 1000;
export const EXPORT_MAX_ROWS = 50_000;

/** All matching findings (paged past the PostgREST row cap), up to EXPORT_MAX_ROWS. */
export async function fetchAllFindings(
  supabase: SupabaseClient,
  filters: FindingsFilters,
  max = EXPORT_MAX_ROWS,
): Promise<FindingRow[]> {
  const out: FindingRow[] = [];
  for (let from = 0; from < max; from += EXPORT_PAGE) {
    const to = Math.min(from + EXPORT_PAGE, max) - 1;
    const { rows } = await fetchFindingsRange(supabase, filters, from, to, false);
    out.push(...rows);
    if (rows.length < to - from + 1) break;
  }
  return out;
}
