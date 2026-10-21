import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const LEPIDUS_CSS = 'https://lepide-design-system.vercel.app/v1/lepidus.css';
export const LEPIDUS_JS = 'https://lepide-design-system.vercel.app/v1/lepidus.js';

export const metadata: Metadata = {
  title: 'MiniDSP',
  description: 'Training-only data discovery and classification for synthetic CSV/TXT files.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="stylesheet" href={LEPIDUS_CSS} />
      </head>
      <body>
        {children}
        <Script src={LEPIDUS_JS} strategy="afterInteractive" />
      </body>
    </html>
  );
}
