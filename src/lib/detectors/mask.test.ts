// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MAX_MASK_LENGTH, maskCard, maskEmail, maskNino, maskPhone } from './mask';

describe('masks', () => {
  it('email: first char + ***@ + domain', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
  });

  it('email: very long domains stay within the DB limit', () => {
    const long = `a@${'b'.repeat(70)}.example.com`;
    const masked = maskEmail(long);
    expect(masked.length).toBeLessThanOrEqual(MAX_MASK_LENGTH);
    expect(masked.startsWith('a***@')).toBe(true);
    expect(masked.endsWith('.example.com')).toBe(true);
  });

  it('phone: first 2 + last 3 digits', () => {
    expect(maskPhone('07700 900321')).toBe('07******321');
    expect(maskPhone('+44 7700 900321')).toBe('44*******321');
  });

  it('nino: uppercase prefix + 6 stars + suffix', () => {
    expect(maskNino('ab 12 34 56 c')).toBe('AB******C');
    expect(maskNino('AB123456')).toBe('AB******');
  });

  it('card: stars + last 4', () => {
    expect(maskCard('4111 1111 1111 1111')).toBe('************1111');
    expect(maskCard('3782-822463-10005')).toBe('***********0005');
  });
});
