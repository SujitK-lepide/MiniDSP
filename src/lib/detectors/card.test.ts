// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { detectCards } from './card';

describe('detectCards (acceptance check 4)', () => {
  it('detects 4111 1111 1111 1111 and masks it', () => {
    const m = detectCards('card 4111 1111 1111 1111 end');
    expect(m).toHaveLength(1);
    expect(m[0].masked).toBe('************1111');
  });

  it('rejects ...1112 (Luhn failure)', () => {
    expect(detectCards('card 4111 1111 1111 1112')).toEqual([]);
  });

  it('accepts hyphen and compact forms', () => {
    expect(detectCards('4111-1111-1111-1111')).toHaveLength(1);
    expect(detectCards('4111111111111111')).toHaveLength(1);
    expect(detectCards('3782 822463 10005')).toHaveLength(1);
  });

  it('rejects fewer than 13 digits and double separators', () => {
    expect(detectCards('4111 1111 1111')).toEqual([]);
    expect(detectCards('4111  1111  1111  1111')).toEqual([]);
  });

  it('avoids partial matches inside longer digit runs', () => {
    expect(detectCards('94111111111111111')).toEqual([]);
    expect(detectCards('41111111111111119')).toEqual([]);
  });

  it('finds two cards separated by a space', () => {
    expect(detectCards('4111 1111 1111 1111 5555 5555 5555 4444')).toHaveLength(2);
  });
});
