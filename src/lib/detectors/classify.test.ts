// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DETECTOR_RISK, RISK_ORDER, maxRisk } from './classify';

describe('classification', () => {
  it('orders risks None < Low < Medium < High < Critical', () => {
    expect(RISK_ORDER).toEqual(['None', 'Low', 'Medium', 'High', 'Critical']);
  });

  it('maps detectors to risks', () => {
    expect(DETECTOR_RISK).toEqual({
      email: 'Low',
      uk_phone: 'Medium',
      uk_nino: 'High',
      payment_card: 'Critical',
    });
  });

  it('returns the highest risk, or None when empty', () => {
    expect(maxRisk([])).toBe('None');
    expect(maxRisk(['Low', 'Critical', 'Medium'])).toBe('Critical');
    expect(maxRisk(['Low', 'High'])).toBe('High');
  });
});
