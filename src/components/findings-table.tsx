import { EmptyState } from '@/components/empty-state';
import { EmptyRow, LpTable, Td, Th } from '@/components/lp-table';
import { RiskBadge } from '@/components/risk-badge';
import type { FindingRow } from '@/lib/findings/query';
import { DETECTOR_LABELS, formatCount, formatScanDate } from '@/lib/ui/labels';

export function FindingsTable({ rows, filtered }: { rows: readonly FindingRow[]; filtered: boolean }) {
  return (
    <div aria-live="polite">
      <LpTable
        caption="Masked findings"
        head={
          <>
            <Th>File name</Th>
            <Th>Scanned</Th>
            <Th>Detector</Th>
            <Th>Risk</Th>
            <Th>Count</Th>
            <Th>Masked example</Th>
          </>
        }
      >
        {rows.length === 0 ? (
          <EmptyRow colSpan={6}>
            <EmptyState
              message={
                filtered
                  ? 'No findings match these filters. Change the detector or risk filter.'
                  : 'No findings yet. Upload a CSV or TXT file to scan it.'
              }
              action={
                filtered ? (
                  <a className="lp-link lp-link--standalone" href="/findings">
                    Clear filters
                  </a>
                ) : (
                  <a className="lp-link lp-link--standalone" href="/upload">
                    Upload a file
                  </a>
                )
              }
            />
          </EmptyRow>
        ) : (
          rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.filename}</Td>
              <Td>{formatScanDate(r.scannedAt)}</Td>
              <Td>{DETECTOR_LABELS[r.detector]}</Td>
              <Td>
                <RiskBadge risk={r.risk} />
              </Td>
              <Td>{formatCount(r.occurrences)}</Td>
              <Td>{r.maskedExample}</Td>
            </tr>
          ))
        )}
      </LpTable>
    </div>
  );
}
