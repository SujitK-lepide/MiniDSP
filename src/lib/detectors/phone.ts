import { maskPhone } from './mask';
import type { DetectorMatch } from './types';

// Up to two separator characters (space, hyphen, bracket) between digits, e.g. "(020) 7946".
const SEP = String.raw`[ \-()]{0,2}`;
// After the trunk "0" / "+44": 7 = mobile, 1/2/3 = geographic; then 9 more digits (10 in total).
const SUBSCRIBER = `[1237](?:${SEP}\\d){9}`;
const INTERNATIONAL = String.raw`\+44` + `${SEP}(?:\\(0\\)${SEP})?`;
const NATIONAL = String.raw`\(?0`;

const PHONE_SOURCE =
  String.raw`(?<![\d+])` + `(?:${INTERNATIONAL}|${NATIONAL})${SUBSCRIBER}` + String.raw`(?!\d)`;

export function detectPhones(text: string): DetectorMatch[] {
  const re = new RegExp(PHONE_SOURCE, 'g');
  const out: DetectorMatch[] = [];
  for (const m of text.matchAll(re)) {
    out.push({ start: m.index, end: m.index + m[0].length, masked: maskPhone(m[0]) });
  }
  return out;
}
