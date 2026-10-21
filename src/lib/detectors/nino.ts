import { maskNino } from './mask';
import type { DetectorMatch } from './types';

// 1st letter: not D F I Q U V. 2nd letter: not D F I O Q U V. Matched case-insensitively.
const FIRST = '[A-CEGHJ-PR-TW-Z]';
const SECOND = '[A-CEGHJ-NPR-TW-Z]';
const FORBIDDEN_PREFIXES = new Set(['BG', 'GB', 'NK', 'KN', 'TN', 'NT', 'ZZ']);

const NINO_SOURCE =
  String.raw`(?<![A-Za-z0-9])` +
  `(${FIRST}${SECOND}) ?\\d{2} ?\\d{2} ?\\d{2}(?: ?[A-D])?` +
  String.raw`(?![A-Za-z0-9])`;

export function detectNinos(text: string): DetectorMatch[] {
  const re = new RegExp(NINO_SOURCE, 'gi');
  const out: DetectorMatch[] = [];
  for (const m of text.matchAll(re)) {
    if (FORBIDDEN_PREFIXES.has(m[1].toUpperCase())) continue;
    out.push({ start: m.index, end: m.index + m[0].length, masked: maskNino(m[0]) });
  }
  return out;
}
