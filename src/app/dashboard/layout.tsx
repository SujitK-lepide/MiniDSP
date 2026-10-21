import { requireUser } from '@/lib/auth/session';

// Auth check outside loading.tsx's Suspense boundary → signed-out users get an HTTP 307, not a streamed redirect.
export default async function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  await requireUser('/dashboard');
  return children;
}
