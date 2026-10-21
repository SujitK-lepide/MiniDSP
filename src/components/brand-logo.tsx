import Image from 'next/image';

/** Lepide mark (from LOGO/lepide.ico, converted losslessly to PNG for next/image). */
export function BrandLogo({ size = 48 }: { size?: number }) {
  return <Image src="/brand/lepide.png" alt="Lepide" width={size} height={size} priority />;
}
