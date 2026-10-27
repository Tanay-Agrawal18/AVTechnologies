import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { CalendarEvent } from "@/models/CalendarEvent";
import { CancelCalendarEventSchema } from "@/validators";
import { CalendarEventNotificationService } from "@/services/calendarEventNotificationService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  await connectDB();
  const event = await CalendarEvent.findById(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.status === "cancelled") {
    return NextResponse.json(
      { error: "Event is already cancelled" },
      { status: 400 }
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional on cancel
  }

  const parseResult = CancelCalendarEventSchema.safeParse(body);
  const reason = parseResult.success
    ? parseResult.data.cancellationReason
    : undefined;

  const wasPublished = event.status === "published";

  event.status = "cancelled";
  event.cancelledAt = new Date();
  event.cancellationReason = reason;
  event.lastModifiedByAdminId = new mongoose.Types.ObjectId(auth.user.id);
  await event.save();

  // If the event was previously published, notify affected recipients of the cancellation
  if (wasPublished) {
    try {
      await CalendarEventNotificationService.notifyEventCancelled(
        event,
        auth.user,
        reason
      );
    } catch (e) {
      console.error(
        "[Calendar API] Failed to dispatch cancellation notifications:",
        e
      );
    }
  }

  return NextResponse.json({
    message: "Event cancelled successfully",
    event,
  });
}
