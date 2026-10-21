import { maskEmail } from './mask';
import type { DetectorMatch } from './types';

const LOCAL = String.raw`[A-Za-z0-9_%+\-]+(?:\.[A-Za-z0-9_%+\-]+)*`;
const LABEL = String.raw`[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?`;
const TLD = String.raw`[A-Za-z]{2,24}`;

// Boundaries: no local-part char or "@" directly before; no domain char, "@" or ".<alnum>" directly after.
const EMAIL_SOURCE =
  String.raw`(?<![A-Za-z0-9._%+\-@])` +
  `${LOCAL}@(?:${LABEL}\\.)+${TLD}` +
  String.raw`(?![A-Za-z0-9_\-@]|\.[A-Za-z0-9])`;

export function detectEmails(text: string): DetectorMatch[] {
  const re = new RegExp(EMAIL_SOURCE, 'g');
  const out: DetectorMatch[] = [];
  for (const m of text.matchAll(re)) {
    out.push({ start: m.index, end: m.index + m[0].length, masked: maskEmail(m[0]) });
  }
  return out;
}
