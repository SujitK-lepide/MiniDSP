// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { detectEmails } from './email';
import { scanText } from './index';
import { luhnValid } from './luhn';
import { detectPhones } from './phone';

describe('scanText (acceptance check 5)', () => {
  it('mixed file → Critical with one aggregated finding per detector', () => {
    const r = scanText(
      'alex@example.test, 07700 900123, AB 12 34 56 C, 4111 1111 1111 1111',
    );
    expect(r.risk).toBe('Critical');
    expect(r.findings).toEqual([
      { detector: 'payment_card', risk: 'Critical', occurrences: 1, maskedExample: '************1111' },
      { detector: 'uk_nino', risk: 'High', occurrences: 1, maskedExample: 'AB******C' },
      { detector: 'uk_phone', risk: 'Medium', occurrences: 1, maskedExample: '07******123' },
      { detector: 'email', risk: 'Low', occurrences: 1, maskedExample: 'a***@example.test' },
    ]);
  });

  it('clean file → None with no findings', () => {
    expect(scanText('Quarterly inventory: 12 chairs, 4 desks, ref 12345.')).toEqual({
      risk: 'None',
      findings: [],
    });
  });

  it('counts repeated matches and uses the first occurrence as the example', () => {
    const r = scanText('bob@example.org then alex@example.test then bob@example.org');
    expect(r.findings).toEqual([
      { detector: 'email', risk: 'Low', occurrences: 3, maskedExample: 'b***@example.org' },
    ]);
  });

  it('a card span blocks a phone match inside it', () => {
    // "123X 07700 900123" is a 15-digit card candidate; its tail is also a valid UK mobile.
    const d = [...'0123456789'].find((c) => luhnValid(`123${c}07700900123`))!;
    const text = `ref 123${d} 07700 900123`;
    expect(detectPhones(text)).toHaveLength(1);
    const r = scanText(text);
    expect(r.risk).toBe('Critical');
    expect(r.findings.map((f) => f.detector)).toEqual(['payment_card']);
  });

  it('a NINO span blocks an email match overlapping it', () => {
    const text = 'AB123456C@example.com';
    expect(detectEmails(text)).toHaveLength(1);
    const r = scanText(text);
    expect(r.findings.map((f) => f.detector)).toEqual(['uk_nino']);
    expect(r.risk).toBe('High');
  });
});

describe('scanText performance', () => {
  it('scans ~1 MiB of adversarial text quickly (no catastrophic backtracking)', () => {
    const inputs = [
      'a'.repeat(1_048_000),
      'a.'.repeat(524_000),
      '1 '.repeat(524_000),
      'ab@'.repeat(349_000),
      ('07700 900123 alex@example.test AB123456C 4111111111111111\n').repeat(17_000),
    ];
    for (const text of inputs) {
      const t0 = performance.now();
      scanText(text);
      expect(performance.now() - t0).toBeLessThan(5000);
    }
    const r = scanText(inputs[4]);
    expect(r.findings.map((f) => f.occurrences)).toEqual([17_000, 17_000, 17_000, 17_000]);
  });
});

describe('scanText never returns raw values', () => {
  it('JSON output contains masks only', () => {
    const raws = [
      'alex@example.test',
      'jane.doe@example.org',
      '07700 900123',
      '+44 20 7946 0958',
      'AB 12 34 56 C',
      'ab123456c',
      '4111 1111 1111 1111',
      '5555-5555-5555-4444',
    ];
    const json = JSON.stringify(scanText(raws.join('\n')));
    for (const raw of raws) {
      expect(json).not.toContain(raw);
      const compact = raw.replace(/[\s-]/g, '');
      expect(json).not.toContain(compact);
      expect(json.toUpperCase()).not.toContain(compact.toUpperCase());
    }
    expect(json).toContain('************1111');
  });
});
