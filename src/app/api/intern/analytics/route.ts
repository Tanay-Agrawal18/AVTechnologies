import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { AnalyticsService } from "@/services/analyticsService";

export async function GET() {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  try {
    // Strictly scope to authenticated user ID
    const analytics = await AnalyticsService.getInternAnalytics(auth.user.id);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load intern analytics";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
