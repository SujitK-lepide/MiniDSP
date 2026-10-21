'use client';

import { RouteError } from '@/components/route-error';

export default function DashboardError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title="The dashboard could not be loaded" retry={retry} />;
}
