import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { NotificationService } from "@/services/notificationService";
import { NotificationQuerySchema, UpdateNotificationSchema } from "@/validators";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = NotificationQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { page, limit, unreadOnly } = parsed.data;
    const result = await NotificationService.getUserNotifications(
      auth.user.id,
      page,
      limit,
      unreadOnly === "true"
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load notifications";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = UpdateNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { notificationId, markAllAsRead, isRead } = parsed.data;

    const result = await NotificationService.markAsRead(auth.user.id, {
      notificationId,
      markAllAsRead,
      isRead,
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update notification";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
