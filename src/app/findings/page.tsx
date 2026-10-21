import { AppShell } from '@/components/app-shell';
import { ExportButton } from '@/components/export-button';
import { FindingsFilters } from '@/components/findings-filters';
import { FindingsTable } from '@/components/findings-table';
import { requireUser } from '@/lib/auth/session';
import { fetchFindings, findingsSearch, parseFindingsFilters } from '@/lib/findings/query';
import { formatCount } from '@/lib/ui/labels';

export default async function FindingsPage({ searchParams }: PageProps<'/findings'>) {
  const filters = parseFindingsFilters(await searchParams);
  const { supabase, user } = await requireUser(`/findings${findingsSearch(filters)}`);
  const { rows, total } = await fetchFindings(supabase, filters);
  const filtered = Boolean(filters.detector || filters.risk);

  return (
    <AppShell
      active="findings"
      title="Findings"
      intro="Masked findings from all of your scans. Filter by detector and risk, or export the filtered list as CSV."
      email={user.email}
    >
      <div className="stack--tight">
        <div className="toolbar">
          <FindingsFilters filters={filters} />
          <span className="toolbar__spacer"></span>
          <ExportButton filters={filters} />
        </div>
        <p className="muted" role="status">
          {rows.length < total
            ? `Showing the ${formatCount(rows.length)} most recent of ${formatCount(total)} findings.`
            : `${formatCount(total)} ${total === 1 ? 'finding' : 'findings'}.`}
        </p>
        <FindingsTable rows={rows} filtered={filtered} />
      </div>
    </AppShell>
  );
}
