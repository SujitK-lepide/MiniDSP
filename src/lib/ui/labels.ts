import type { Detector, Risk } from '@/lib/detectors/types';

export const DETECTORS: readonly Detector[] = ['email', 'uk_phone', 'uk_nino', 'payment_card'];

export const DETECTOR_LABELS: Readonly<Record<Detector, string>> = {
  email: 'Email address',
  uk_phone: 'UK phone number',
  uk_nino: 'UK National Insurance number',
  payment_card: 'Payment card',
};

/** Badge variant chosen by meaning; the badge text always states the risk. */
export const RISK_BADGE_VARIANT: Readonly<Record<Risk, 'success' | 'neutral' | 'warning' | 'error'>> = {
  None: 'success',
  Low: 'neutral',
  Medium: 'warning',
  High: 'error',
  Critical: 'error',
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

/** Deterministic (UTC) so server and client render the same text. */
export function formatScanDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : `${DATE_FORMAT.format(d)} UTC`;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat('en-GB').format(n);
}
