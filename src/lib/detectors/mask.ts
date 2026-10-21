/** Max length of a stored masked example (matches the DB check constraint). */
export const MAX_MASK_LENGTH = 64;

const digitsOnly = (raw: string) => raw.replace(/\D/g, '');

/** j***@example.com */
export function maskEmail(raw: string): string {
  const at = raw.lastIndexOf('@');
  const domain = raw.slice(at + 1);
  const masked = `${raw.charAt(0)}***@${domain}`;
  if (masked.length <= MAX_MASK_LENGTH) return masked;
  // Keep the end of the domain (incl. TLD) so the mask stays within the DB limit.
  return `${raw.charAt(0)}***@…${domain.slice(-(MAX_MASK_LENGTH - 6))}`;
}

/** Keep the first 2 and last 3 digits: 07******321 */
export function maskPhone(raw: string): string {
  const d = digitsOnly(raw);
  return d.slice(0, 2) + '*'.repeat(Math.max(0, d.length - 5)) + d.slice(-3);
}

/** AB******C (uppercase; suffix only when present) */
export function maskNino(raw: string): string {
  const c = raw.replace(/\s/g, '').toUpperCase();
  const suffix = c.length === 9 ? c.charAt(8) : '';
  return `${c.slice(0, 2)}******${suffix}`;
}

/** ************1111 */
export function maskCard(raw: string): string {
  const d = digitsOnly(raw);
  return '*'.repeat(Math.max(0, d.length - 4)) + d.slice(-4);
}
