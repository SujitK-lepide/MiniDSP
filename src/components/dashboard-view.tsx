import { EmptyState } from '@/components/empty-state';
import { EmptyRow, LpTable, Td, Th } from '@/components/lp-table';
import { RiskBadge } from '@/components/risk-badge';
import type { DashboardSummary, RecentScan } from '@/lib/dashboard/summary';
import { RISK_ORDER } from '@/lib/detectors/classify';
import { formatCount, formatScanDate } from '@/lib/ui/labels';

function Kpi({ title, value, testId }: { title: string; value: number; testId: string }) {
  return (
    <div className="lp-card">
      <div className="lp-card__header">
        <div className="lp-card__title">
          <h2 className="heading-reset">{title}</h2>
        </div>
      </div>
      <div className="lp-card__body">
        <span className="kpi-value" data-testid={testId}>
          {formatCount(value)}
        </span>
      </div>
    </div>
  );
}

export function DashboardView({ summary, recent }: { summary: DashboardSummary; recent: readonly RecentScan[] }) {
  if (summary.filesScanned === 0) {
    return (
      <div className="lp-card">
        <div className="lp-card__body">
          <EmptyState
            message="No files scanned yet. Upload a synthetic CSV or TXT file to see its risk here."
            action={
              <a className="lp-link lp-link--standalone" href="/upload">
                Upload a file
              </a>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="kpi-grid" aria-label="Totals">
        <Kpi title="Files scanned" value={summary.filesScanned} testId="kpi-files" />
        <Kpi title="Total findings" value={summary.totalFindings} testId="kpi-findings" />
        <Kpi title="High + Critical files" value={summary.highOrCritical} testId="kpi-high-critical" />
      </section>

      <section className="lp-card" aria-labelledby="risk-distribution-title">
        <div className="lp-card__header">
          <div className="lp-card__title">
            <h2 className="heading-reset" id="risk-distribution-title">
              Risk distribution
            </h2>
          </div>
        </div>
        <div className="lp-card__body">
          <LpTable
            caption="Files by risk level"
            head={
              <>
                <Th>Risk</Th>
                <Th>Files</Th>
              </>
            }
          >
            {RISK_ORDER.map((risk) => (
              <tr key={risk} data-testid={`dist-${risk}`}>
                <Td>
                  <RiskBadge risk={risk} />
                </Td>
                <Td>{formatCount(summary.distribution[risk])}</Td>
              </tr>
            ))}
          </LpTable>
        </div>
      </section>

      <section className="lp-card" aria-labelledby="recent-scans-title">
        <div className="lp-card__header">
          <div className="lp-card__title">
            <h2 className="heading-reset" id="recent-scans-title">
              Recent scans
            </h2>
          </div>
          <div className="lp-card__actions">
            <a className="lp-link lp-link--standalone" href="/findings">
              View all findings
            </a>
          </div>
        </div>
        <div className="lp-card__body">
          <LpTable
            caption="10 most recent scans"
            head={
              <>
                <Th>File name</Th>
                <Th>Scanned</Th>
                <Th>Risk</Th>
                <Th>Findings</Th>
              </>
            }
          >
            {recent.length === 0 ? (
              <EmptyRow colSpan={4}>
                <EmptyState message="No recent scans." />
              </EmptyRow>
            ) : (
              recent.map((s) => (
                <tr key={s.id}>
                  <Td>{s.filename}</Td>
                  <Td>{formatScanDate(s.created_at)}</Td>
                  <Td>
                    <RiskBadge risk={s.risk} />
                  </Td>
                  <Td>{formatCount(s.total_findings)}</Td>
                </tr>
              ))
            )}
          </LpTable>
        </div>
      </section>
    </div>
  );
}
