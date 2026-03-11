import { getDashboardAnalytics } from "@/features/dashboard/services/dashboard.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const analytics = await getDashboardAnalytics();

  return Response.json(analytics, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
