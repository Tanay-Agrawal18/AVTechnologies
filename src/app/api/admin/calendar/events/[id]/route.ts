import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { CalendarEvent } from "@/models/CalendarEvent";
import { User } from "@/models/User";
import { UpdateCalendarEventSchema } from "@/validators";
import { CalendarEventNotificationService } from "@/services/calendarEventNotificationService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  await connectDB();
  const event = await CalendarEvent.findById(id)
    .populate("targetInternIds", "name email internId department")
    .populate("createdByAdminId", "name email")
    .populate("lastModifiedByAdminId", "name email")
    .lean();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = UpdateCalendarEventSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parseResult.data;
  const previousStatus = event.status;
  const wasDraft = previousStatus === "draft";
  const wasPublished = previousStatus === "published";

  // Check if dates or critical details changed for material update check
  let isMaterialUpdate = false;

  if (data.title !== undefined && data.title !== event.title) {
    event.title = data.title;
    isMaterialUpdate = true;
  }
  if (data.description !== undefined && data.description !== event.description) {
    event.description = data.description;
  }
  if (data.type !== undefined && data.type !== event.type) {
    event.type = data.type;
    isMaterialUpdate = true;
  }
  if (data.startDate !== undefined) {
    const newStart = new Date(data.startDate);
    if (newStart.getTime() !== event.startDate.getTime()) {
      event.startDate = newStart;
      isMaterialUpdate = true;
    }
  }
  if (data.endDate !== undefined) {
    const newEnd = new Date(data.endDate);
    if (newEnd.getTime() !== event.endDate.getTime()) {
      event.endDate = newEnd;
      isMaterialUpdate = true;
    }
  }
  if (data.isAllDay !== undefined) {
    event.isAllDay = data.isAllDay;
  }
  if (data.location !== undefined) {
    if (data.location !== event.location) isMaterialUpdate = true;
    event.location = data.location;
  }
  if (data.meetingUrl !== undefined) {
    event.meetingUrl = data.meetingUrl || undefined;
  }

  if (data.audienceType !== undefined) {
    if (data.audienceType !== event.audienceType) isMaterialUpdate = true;
    event.audienceType = data.audienceType;
  }

  if (data.targetDepartment !== undefined) {
    if (data.targetDepartment !== event.targetDepartment) isMaterialUpdate = true;
    event.targetDepartment = data.targetDepartment || undefined;
  }

  if (data.targetInternIds !== undefined) {
    const targetObjectIds: mongoose.Types.ObjectId[] = [];
    if (data.targetInternIds.length > 0) {
      for (const tId of data.targetInternIds) {
        if (!mongoose.Types.ObjectId.isValid(tId)) {
          return NextResponse.json({ error: `Invalid intern ID: ${tId}` }, { status: 400 });
        }
      }
      const foundInterns = await User.find({
        _id: { $in: data.targetInternIds },
        role: "intern",
        status: "active",
      })
        .select("_id")
        .lean();
      targetObjectIds.push(...foundInterns.map((i) => i._id));
    }
    event.targetInternIds = targetObjectIds;
    isMaterialUpdate = true;
  }

  // Ensure end date does not precede start date
  if (event.endDate.getTime() < event.startDate.getTime()) {
    return NextResponse.json(
      { error: "End date/time cannot precede start date/time" },
      { status: 400 }
    );
  }

  if (data.status !== undefined) {
    if (data.status === "published" && wasDraft) {
      event.status = "published";
      event.publishedAt = new Date();
    }
  }

  event.lastModifiedByAdminId = new mongoose.Types.ObjectId(auth.user.id);
  await event.save();

  // Handle Notifications
  if (wasDraft && event.status === "published") {
    // Freshly published draft: notify audience
    try {
      await CalendarEventNotificationService.notifyEventPublished(event, auth.user);
    } catch (e) {
      console.error("[Calendar API] Failed to notify upon draft publication:", e);
    }
  } else if (wasPublished && event.status === "published" && isMaterialUpdate) {
    // Material update to an existing published event: notify affected recipients
    try {
      await CalendarEventNotificationService.notifyEventUpdated(event, auth.user);
    } catch (e) {
      console.error("[Calendar API] Failed to notify upon event update:", e);
    }
  }

  return NextResponse.json({ event });
}
