import { DashboardClient } from "@/features/dashboard/components/dashboard-client";
import { getDashboardAnalytics } from "@/features/dashboard/services/dashboard.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const analytics = await getDashboardAnalytics();

  return <DashboardClient initialData={analytics} />;
}
