// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CSV_HEADER, csvField, findingsToCsv, neutralizeFormula } from './export';
import { scanText } from '@/lib/detectors';
import type { FindingRow } from '@/lib/findings/query';

const row = (over: Partial<FindingRow> = {}): FindingRow => ({
  id: 'r1',
  filename: 'customers.csv',
  scannedAt: '2026-10-21T06:00:00.000Z',
  detector: 'email',
  risk: 'Low',
  occurrences: 2,
  maskedExample: 'a***@example.test',
  ...over,
});

/** Minimal RFC 4180 parser for round-trip checks. */
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let rowBuf: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      rowBuf.push(field);
      field = '';
    } else if (c === '\r' && text[i + 1] === '\n') {
      rowBuf.push(field);
      out.push(rowBuf);
      rowBuf = [];
      field = '';
      i++;
    } else field += c;
  }
  return out;
}

describe('csvField', () => {
  it('always double-quotes', () => {
    expect(csvField('plain')).toBe('"plain"');
    expect(csvField(3)).toBe('"3"');
  });

  it('keeps commas and newlines inside quotes', () => {
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('doubles inner quotes', () => {
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
  });
});

describe('formula neutralisation', () => {
  it.each([
    ["=cmd|' /C calc'!A0", "'=cmd|' /C calc'!A0"],
    ['+1', "'+1"],
    ['-1', "'-1"],
    ['@SUM(A1:A2)', "'@SUM(A1:A2)"],
    ['\t=1', "'\t=1"],
    ['\r=1', "'\r=1"],
  ])('%j → %j', (input, expected) => {
    expect(neutralizeFormula(input)).toBe(expected);
  });

  it('leaves safe values unchanged', () => {
    expect(neutralizeFormula('report.csv')).toBe('report.csv');
    expect(neutralizeFormula('a=b')).toBe('a=b');
    expect(neutralizeFormula('')).toBe('');
  });

  it('applies to filenames and quotes the payload', () => {
    const csv = findingsToCsv([row({ filename: "=cmd|' /C calc'!A0.csv" })]);
    expect(csv).toContain(`"'=cmd|' /C calc'!A0.csv"`);
    expect(csv).not.toMatch(/(^|,)"=cmd/m);
  });

  it('applies to masked examples that start with a trigger character', () => {
    const csv = findingsToCsv([row({ maskedExample: '-***@example.test' })]);
    expect(csv).toContain(`"'-***@example.test"`);
  });
});

describe('findingsToCsv', () => {
  it('writes the exact header and CRLF line endings', () => {
    const csv = findingsToCsv([]);
    expect(csv).toBe('"filename","scanned_at","detector","risk","occurrences","masked_example"\r\n');
    expect(CSV_HEADER).toEqual(['filename', 'scanned_at', 'detector', 'risk', 'occurrences', 'masked_example']);
  });

  it('round-trips awkward filenames through an RFC 4180 parser', () => {
    const tricky = 'a "quoted", multi\nline name.csv';
    const parsed = parseCsv(findingsToCsv([row({ filename: tricky })]));
    expect(parsed).toHaveLength(2);
    expect(parsed[1]).toEqual([tricky, '2026-10-21T06:00:00.000Z', 'email', 'Low', '2', 'a***@example.test']);
  });

  it('contains no raw detected values', () => {
    const raws = ['alex@example.test', '07700 900123', 'AB 12 34 56 C', '4111 1111 1111 1111'];
    const { findings } = scanText(raws.join('\n'));
    const rows = findings.map((f, i) =>
      row({ id: `r${i}`, detector: f.detector, risk: f.risk, occurrences: f.occurrences, maskedExample: f.maskedExample }),
    );
    const csv = findingsToCsv(rows);
    for (const raw of raws) {
      expect(csv).not.toContain(raw);
      expect(csv).not.toContain(raw.replace(/\s/g, ''));
    }
    expect(csv).toContain('************1111');
  });
});
