import { detectCards } from './card';
import { DETECTOR_RISK, maxRisk } from './classify';
import { detectEmails } from './email';
import { detectNinos } from './nino';
import { detectPhones } from './phone';
import type { Detector, DetectorMatch, Finding, ScanResult } from './types';

export type { Detector, Finding, Risk, ScanResult } from './types';
export { DETECTOR_RISK, RISK_ORDER, maxRisk, riskRank } from './classify';

// Priority order: a later detector ignores any match overlapping an earlier detector's match.
const PIPELINE: ReadonlyArray<{ detector: Detector; detect: (text: string) => DetectorMatch[] }> = [
  { detector: 'payment_card', detect: detectCards },
  { detector: 'uk_nino', detect: detectNinos },
  { detector: 'uk_phone', detect: detectPhones },
  { detector: 'email', detect: detectEmails },
];

type Span = { start: number; end: number };

/** `spans` is sorted by start and non-overlapping. */
function overlapsAny(spans: Span[], s: Span): boolean {
  let lo = 0;
  let hi = spans.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (spans[mid].end <= s.start) lo = mid + 1;
    else hi = mid;
  }
  return lo < spans.length && spans[lo].start < s.end;
}

/**
 * Scans text in memory. The result contains masked values and counts only;
 * raw matched values never leave this function.
 */
export function scanText(text: string): ScanResult {
  let taken: Span[] = [];
  const findings: Finding[] = [];

  for (const { detector, detect } of PIPELINE) {
    const accepted: Span[] = [];
    let maskedExample: string | undefined;
    for (const m of detect(text)) {
      if (overlapsAny(taken, m)) continue;
      accepted.push({ start: m.start, end: m.end });
      maskedExample ??= m.masked;
    }
    if (accepted.length > 0 && maskedExample !== undefined) {
      findings.push({
        detector,
        risk: DETECTOR_RISK[detector],
        occurrences: accepted.length,
        maskedExample,
      });
      taken = [...taken, ...accepted].sort((a, b) => a.start - b.start);
    }
  }

  return { risk: maxRisk(findings.map((f) => f.risk)), findings };
}
