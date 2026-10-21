import { AppShell } from '@/components/app-shell';
import { DashboardView } from '@/components/dashboard-view';
import { requireUser } from '@/lib/auth/session';
import { fetchDashboard } from '@/lib/dashboard/summary';

export default async function DashboardPage() {
  const { supabase, user } = await requireUser('/dashboard');
  const { summary, recent } = await fetchDashboard(supabase);

  return (
    <AppShell
      active="dashboard"
      title="Dashboard"
      intro="Your scanned files, findings and risk at a glance. Only masked values are stored."
      email={user.email}
    >
      <DashboardView summary={summary} recent={recent} />
    </AppShell>
  );
}
