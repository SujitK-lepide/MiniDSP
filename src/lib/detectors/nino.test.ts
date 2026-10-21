// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { detectNinos } from './nino';

describe('detectNinos (acceptance check 3)', () => {
  it('detects AB 12 34 56 C and masks it', () => {
    const m = detectNinos('NI: AB 12 34 56 C');
    expect(m).toHaveLength(1);
    expect(m[0].masked).toBe('AB******C');
  });

  it('is case-insensitive and accepts compact form / no suffix', () => {
    expect(detectNinos('ab123456c')[0].masked).toBe('AB******C');
    expect(detectNinos('AB123456')[0].masked).toBe('AB******');
  });

  it('ignores malformed equivalents', () => {
    expect(detectNinos('AB 12 34 5 C')).toEqual([]);
    expect(detectNinos('AB123456E')).toEqual([]);
    expect(detectNinos('A1 12 34 56 C')).toEqual([]);
    expect(detectNinos('XAB123456C')).toEqual([]);
  });

  it('treats a spaced non A–D letter as a separate word (suffix is optional)', () => {
    expect(detectNinos('AB 12 34 56 E').map((m) => m.masked)).toEqual(['AB******']);
  });

  it.each(['D', 'F', 'I', 'Q', 'U', 'V'])('rejects first letter %s', (l) => {
    expect(detectNinos(`${l}A 12 34 56 C`)).toEqual([]);
  });

  it.each(['D', 'F', 'I', 'O', 'Q', 'U', 'V'])('rejects second letter %s', (l) => {
    expect(detectNinos(`A${l} 12 34 56 C`)).toEqual([]);
  });

  it.each(['BG', 'GB', 'NK', 'KN', 'TN', 'NT', 'ZZ'])('rejects forbidden prefix %s', (p) => {
    expect(detectNinos(`${p} 12 34 56 C`)).toEqual([]);
    expect(detectNinos(`${p.toLowerCase()}123456c`)).toEqual([]);
  });
});
