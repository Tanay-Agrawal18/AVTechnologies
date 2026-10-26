import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { AnalyticsService } from "@/services/analyticsService";
import { AnalyticsFilterSchema } from "@/validators";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = AnalyticsFilterSchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid analytics filter parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const analytics = await AnalyticsService.getAdminAnalytics(parsed.data);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load admin analytics";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
