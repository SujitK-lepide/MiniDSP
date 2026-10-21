// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { luhnValid } from './luhn';

describe('luhnValid', () => {
  it('accepts well-known public test numbers', () => {
    expect(luhnValid('4111111111111111')).toBe(true);
    expect(luhnValid('5555555555554444')).toBe(true);
    expect(luhnValid('378282246310005')).toBe(true);
  });

  it('rejects a changed check digit', () => {
    expect(luhnValid('4111111111111112')).toBe(false);
  });

  it('rejects non-digit and empty input', () => {
    expect(luhnValid('')).toBe(false);
    expect(luhnValid('4111 1111 1111 1111')).toBe(false);
  });
});
