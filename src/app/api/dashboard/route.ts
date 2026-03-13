import { getDashboardAnalytics } from "@/features/dashboard/services/dashboard.service";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const analytics = await getDashboardAnalytics(user.id);

  return Response.json(analytics, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
