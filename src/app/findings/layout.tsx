import { requireUser } from '@/lib/auth/session';

// Auth check outside loading.tsx's Suspense boundary → signed-out users get an HTTP 307, not a streamed redirect.
export default async function FindingsLayout({ children }: LayoutProps<'/findings'>) {
  await requireUser('/findings');
  return children;
}
