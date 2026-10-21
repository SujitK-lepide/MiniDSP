import { luhnValid } from './luhn';
import { maskCard } from './mask';
import type { DetectorMatch } from './types';

// 13–19 digits, optionally separated by a single space or hyphen; no digit on either side.
const CARD_SOURCE = String.raw`(?<!\d)\d(?:[ \-]?\d){12,18}(?!\d)`;

export function detectCards(text: string): DetectorMatch[] {
  const re = new RegExp(CARD_SOURCE, 'g');
  const out: DetectorMatch[] = [];
  for (const m of text.matchAll(re)) {
    if (!luhnValid(m[0].replace(/\D/g, ''))) continue;
    out.push({ start: m.index, end: m.index + m[0].length, masked: maskCard(m[0]) });
  }
  return out;
}
