// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanText } from '@/lib/detectors';

type Expected = { file: string; expected_file_risk: string; bytes: number; purpose: string };

const dir = join(process.cwd(), 'tests', 'fixtures', 'additional');
const expected: Expected[] = JSON.parse(readFileSync(join(dir, 'EXPECTED_RESULTS.json'), 'utf8'));
const scannable = expected.filter((e) => e.expected_file_risk !== 'Reject');

describe('fixtures/additional EXPECTED_RESULTS.json', () => {
  it('has scannable fixtures to check', () => {
    expect(scannable.length).toBeGreaterThan(0);
  });

  it.each(scannable)('$file ($purpose) → $expected_file_risk', ({ file, expected_file_risk }) => {
    const text = readFileSync(join(dir, file), 'utf8');
    expect(scanText(text).risk).toBe(expected_file_risk);
  });

  // Counts implied by the "purpose" field (EXPECTED_RESULTS.json itself only lists risk).
  it.each([
    ['04_many_emails.csv', 'email', 2],
    ['05_repeated_email.txt', 'email', 2],
    ['23_repeated_cards.txt', 'payment_card', 2],
  ] as const)('%s → %s occurrences = %i', (file, detector, count) => {
    const { findings } = scanText(readFileSync(join(dir, file), 'utf8'));
    expect(findings.find((f) => f.detector === detector)?.occurrences).toBe(count);
  });

  it('22_all_four.csv → all four detectors', () => {
    const { findings } = scanText(readFileSync(join(dir, '22_all_four.csv'), 'utf8'));
    expect(findings.map((f) => f.detector).sort()).toEqual(
      ['email', 'payment_card', 'uk_nino', 'uk_phone'],
    );
  });
});
