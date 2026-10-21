import type { Detector, Risk } from './types';

export const RISK_ORDER: readonly Risk[] = ['None', 'Low', 'Medium', 'High', 'Critical'];

export const DETECTOR_RISK: Readonly<Record<Detector, Risk>> = {
  email: 'Low',
  uk_phone: 'Medium',
  uk_nino: 'High',
  payment_card: 'Critical',
};

export function riskRank(risk: Risk): number {
  return RISK_ORDER.indexOf(risk);
}

/** Highest risk in the list, or 'None' when empty. */
export function maxRisk(risks: Iterable<Risk>): Risk {
  let best: Risk = 'None';
  for (const r of risks) {
    if (riskRank(r) > riskRank(best)) best = r;
  }
  return best;
}
