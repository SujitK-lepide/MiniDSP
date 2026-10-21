import type { SupabaseClient } from '@supabase/supabase-js';
import { RISK_ORDER } from '@/lib/detectors/classify';
import type { Risk } from '@/lib/detectors/types';

export type ScanStatRow = { risk: Risk; total_findings: number };

export type RecentScan = {
  id: string;
  filename: string;
  risk: Risk;
  total_findings: number;
  created_at: string;
};

export type DashboardSummary = {
  filesScanned: number;
  totalFindings: number;
  highOrCritical: number;
  distribution: Record<Risk, number>;
};

export function summarizeScans(rows: readonly ScanStatRow[]): DashboardSummary {
  const distribution = Object.fromEntries(RISK_ORDER.map((r) => [r, 0])) as Record<Risk, number>;
  let totalFindings = 0;
  for (const row of rows) {
    distribution[row.risk] += 1;
    totalFindings += row.total_findings;
  }
  return {
    filesScanned: rows.length,
    totalFindings,
    highOrCritical: distribution.High + distribution.Critical,
    distribution,
  };
}

export class DashboardQueryError extends Error {
  constructor(public readonly code: string) {
    super('Could not load the dashboard.');
  }
}

const PAGE = 1000;

/** Pages through all of the user's scans (PostgREST caps each response). RLS scopes rows. */
async function fetchAllScanStats(supabase: SupabaseClient): Promise<ScanStatRow[]> {
  const out: ScanStatRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('scans')
      .select('risk, total_findings')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new DashboardQueryError(error.code ?? 'unknown');
    const rows = (data ?? []) as ScanStatRow[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

export async function fetchDashboard(supabase: SupabaseClient) {
  const [stats, recent] = await Promise.all([
    fetchAllScanStats(supabase),
    supabase
      .from('scans')
      .select('id, filename, risk, total_findings, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);
  if (recent.error) throw new DashboardQueryError(recent.error.code ?? 'unknown');
  return { summary: summarizeScans(stats), recent: (recent.data ?? []) as RecentScan[] };
}
