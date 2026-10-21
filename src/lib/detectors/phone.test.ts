// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { detectPhones } from './phone';

const found = (t: string) => detectPhones(t).map((m) => t.slice(m.start, m.end));

describe('detectPhones (acceptance check 2)', () => {
  it('detects 07700 900123 and +44 7700 900123', () => {
    expect(found('call 07700 900123 now')).toEqual(['07700 900123']);
    expect(found('call +44 7700 900123 now')).toEqual(['+44 7700 900123']);
  });

  it('ignores 12345', () => {
    expect(detectPhones('ref 12345')).toEqual([]);
  });

  it('detects geographic 01/02/03 numbers and +44 equivalents', () => {
    expect(found('020 7946 0958')).toEqual(['020 7946 0958']);
    expect(found('0161 496 0000')).toEqual(['0161 496 0000']);
    expect(found('0300-123-4567')).toEqual(['0300-123-4567']);
    expect(found('+44 20 7946 0958')).toEqual(['+44 20 7946 0958']);
  });

  it('allows spaces, hyphens and brackets', () => {
    expect(found('(020) 7946 0958')).toEqual(['(020) 7946 0958']);
    expect(found('+44 (0)20 7946 0958')).toEqual(['+44 (0)20 7946 0958']);
    expect(found('07700-900-123')).toEqual(['07700-900-123']);
    expect(found('+447700900123')).toEqual(['+447700900123']);
  });

  it('avoids partial matches (digit or + before, digit after)', () => {
    expect(detectPhones('907700900123')).toEqual([]);
    expect(detectPhones('077009001234')).toEqual([]);
    expect(detectPhones('++447700900123')).toEqual([]);
  });

  it('rejects other prefixes and wrong lengths', () => {
    expect(detectPhones('06700 900123')).toEqual([]);
    expect(detectPhones('07700 90012')).toEqual([]);
  });

  it('masks keeping the first 2 and last 3 digits', () => {
    expect(detectPhones('07700 900321')[0].masked).toBe('07******321');
  });
});
