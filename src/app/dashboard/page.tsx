import { DashboardClient } from "@/features/dashboard/components/dashboard-client";
import { getDashboardAnalytics } from "@/features/dashboard/services/dashboard.service";
import { requireCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const analytics = await getDashboardAnalytics(user.id);

  return <DashboardClient initialData={analytics} />;
}
