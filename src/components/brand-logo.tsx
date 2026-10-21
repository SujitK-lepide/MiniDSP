import Image from 'next/image';

/** Official Lepide mark from the design system: https://lepide-design-system.vercel.app/v1/brand/lepide-mark.svg */
export function BrandLogo({ size = 48 }: { size?: number }) {
  return <Image src="/brand/lepide-mark.svg" alt="Lepide" width={size} height={size} unoptimized priority />;
}
