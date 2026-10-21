'use client';

import { RouteError } from '@/components/route-error';

export default function FindingsError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title="Findings could not be loaded" retry={retry} />;
}
