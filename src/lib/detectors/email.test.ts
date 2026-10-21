// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { detectEmails } from './email';

const found = (t: string) => detectEmails(t).map((m) => t.slice(m.start, m.end));

describe('detectEmails (acceptance check 1)', () => {
  it('detects alex@example.test and masks it', () => {
    const matches = detectEmails('Contact: alex@example.test.');
    expect(matches).toHaveLength(1);
    expect(matches[0].masked).toBe('a***@example.test');
  });

  it('ignores alex@@example.test', () => {
    expect(detectEmails('bad: alex@@example.test')).toEqual([]);
  });

  it('rejects consecutive dots in local part or domain', () => {
    expect(detectEmails('john..doe@example.com')).toEqual([]);
    expect(detectEmails('john@example..com')).toEqual([]);
  });

  it('rejects missing or too-short TLD', () => {
    expect(detectEmails('alex@example')).toEqual([]);
    expect(detectEmails('alex@example.c')).toEqual([]);
  });

  it('does not partially match inside a longer token', () => {
    expect(detectEmails('x@y@example.com')).toEqual([]);
    expect(detectEmails('alex@example.com.')).toHaveLength(1);
    expect(detectEmails('alex@example.com_suffix')).toEqual([]);
  });

  it('matches common plausible forms', () => {
    expect(found('a j.smith+tag@mail.example.co.uk b')).toEqual(['j.smith+tag@mail.example.co.uk']);
    expect(found('"alex@example.test","bob@example.org"')).toEqual([
      'alex@example.test',
      'bob@example.org',
    ]);
  });
});
