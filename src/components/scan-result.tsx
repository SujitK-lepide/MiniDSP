import { LpMessage } from '@/components/lp-message';
import { LpTable, Td, Th } from '@/components/lp-table';
import { RiskBadge } from '@/components/risk-badge';
import type { Finding, Risk } from '@/lib/detectors/types';
import { DETECTOR_LABELS, formatCount } from '@/lib/ui/labels';

export type ScanResult = { scanId: string; risk: Risk; findings: Finding[] };

export function ScanResultCard({ filename, result }: { filename: string; result: ScanResult }) {
  const total = result.findings.reduce((n, f) => n + f.occurrences, 0);
  return (
    <section className="lp-card" aria-labelledby="scan-result-title" aria-live="polite">
      <div className="lp-card__header">
        <div className="lp-card__title">
          <h2 className="heading-reset" id="scan-result-title">
            Scan result
          </h2>
        </div>
        <div className="lp-card__actions">
          <span className="muted">File risk:</span> <RiskBadge risk={result.risk} />
        </div>
      </div>
      <div className="lp-card__body stack--tight">
        <p className="page-intro">
          {filename} — {formatCount(total)} {total === 1 ? 'finding' : 'findings'}. Only masked values are shown and
          stored; the original file was discarded.
        </p>
        {result.findings.length === 0 ? (
          <LpMessage variant="success" title="No sensitive data found">
            None of the email, UK phone, UK National Insurance or payment card detectors matched this file.
          </LpMessage>
        ) : (
          <LpTable
            caption="Masked findings for this file"
            head={
              <>
                <Th>Detector</Th>
                <Th>Risk</Th>
                <Th>Count</Th>
                <Th>Masked example</Th>
              </>
            }
          >
            {result.findings.map((f) => (
              <tr key={f.detector}>
                <Td>{DETECTOR_LABELS[f.detector]}</Td>
                <Td>
                  <RiskBadge risk={f.risk} />
                </Td>
                <Td>{formatCount(f.occurrences)}</Td>
                <Td>{f.maskedExample}</Td>
              </tr>
            ))}
          </LpTable>
        )}
        <div>
          <a className="lp-link lp-link--standalone" href="/findings">
            View all findings
          </a>
        </div>
      </div>
    </section>
  );
}
