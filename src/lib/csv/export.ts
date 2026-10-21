import type { FindingRow } from '@/lib/findings/query';

export const CSV_HEADER = ['filename', 'scanned_at', 'detector', 'risk', 'occurrences', 'masked_example'] as const;

// Spreadsheet formula triggers (OWASP CSV injection): = + - @ TAB CR at the start of a cell.
const FORMULA_START = /^[=+\-@\t\r]/;

export function neutralizeFormula(value: string): string {
  return FORMULA_START.test(value) ? `'${value}` : value;
}

/** RFC 4180 field: always double-quoted, inner quotes doubled, formulas neutralised. */
export function csvField(value: string | number): string {
  return `"${neutralizeFormula(String(value)).replace(/"/g, '""')}"`;
}

const csvLine = (fields: ReadonlyArray<string | number>) => fields.map(csvField).join(',');

/** CRLF line endings (RFC 4180). Only masked values are ever passed in. */
export function findingsToCsv(rows: readonly FindingRow[]): string {
  const lines = [
    csvLine(CSV_HEADER),
    ...rows.map((r) => csvLine([r.filename, r.scannedAt, r.detector, r.risk, r.occurrences, r.maskedExample])),
  ];
  return `${lines.join('\r\n')}\r\n`;
}
