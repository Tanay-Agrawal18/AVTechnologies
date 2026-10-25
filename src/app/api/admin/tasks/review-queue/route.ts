import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { TaskService } from "@/services/taskService";
import { z } from "zod";

const ReviewQueueQuerySchema = z.object({
  status: z.enum(["pending", "changes_requested", "approved", "all"]).optional(),
  internId: z.string().trim().optional(),
  department: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = ReviewQueueQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await TaskService.getReviewQueue(parsed.data, auth.user);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load review queue";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
