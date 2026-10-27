import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { CalendarEvent } from "@/models/CalendarEvent";
import { User } from "@/models/User";
import { CreateCalendarEventSchema } from "@/validators";
import { CalendarEventNotificationService } from "@/services/calendarEventNotificationService";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  await connectDB();
  const searchParams = req.nextUrl.searchParams;

  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");

  const query: Record<string, unknown> = {};

  if (type && type !== "all") {
    query.type = type;
  }

  if (status && status !== "all") {
    query.status = status;
  }

  if (startParam || endParam) {
    // Events overlapping or within the date window
    const dateFilters: Record<string, unknown>[] = [];
    if (startParam) {
      const start = new Date(startParam);
      if (!isNaN(start.getTime())) {
        dateFilters.push({ endDate: { $gte: start } });
      }
    }
    if (endParam) {
      const end = new Date(endParam);
      if (!isNaN(end.getTime())) {
        dateFilters.push({ startDate: { $lte: end } });
      }
    }
    if (dateFilters.length > 0) {
      query.$and = dateFilters;
    }
  }

  const events = await CalendarEvent.find(query)
    .populate("targetInternIds", "name email internId department")
    .populate("createdByAdminId", "name email")
    .sort({ startDate: 1 })
    .lean();

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  await connectDB();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = CreateCalendarEventSchema.safeParse(body);
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

  // Validate target intern IDs if individual audience is specified
  const targetObjectIds: mongoose.Types.ObjectId[] = [];
  if (data.audienceType === "individual" && data.targetInternIds?.length) {
    for (const id of data.targetInternIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(
          { error: `Invalid intern ID: ${id}` },
          { status: 400 }
        );
      }
    }
    const foundInterns = await User.find({
      _id: { $in: data.targetInternIds },
      role: "intern",
      status: "active",
    })
      .select("_id")
      .lean();

    if (foundInterns.length === 0) {
      return NextResponse.json(
        { error: "None of the selected interns are currently active" },
        { status: 400 }
      );
    }
    targetObjectIds.push(...foundInterns.map((i) => i._id));
  }

  const isPublished = data.status === "published";
  const now = new Date();

  const newEvent = await CalendarEvent.create({
    title: data.title,
    description: data.description,
    type: data.type,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
    isAllDay: data.isAllDay ?? false,
    location: data.location,
    meetingUrl: data.meetingUrl || undefined,
    audienceType: data.audienceType,
    targetInternIds: targetObjectIds,
    targetDepartment:
      data.audienceType === "department" ? data.targetDepartment : undefined,
    status: data.status,
    publishedAt: isPublished ? now : undefined,
    createdByAdminId: new mongoose.Types.ObjectId(auth.user.id),
    lastModifiedByAdminId: new mongoose.Types.ObjectId(auth.user.id),
    notificationSentVersion: 0,
  });

  // If published immediately, dispatch notifications to intended recipients
  if (isPublished) {
    try {
      await CalendarEventNotificationService.notifyEventPublished(
        newEvent,
        auth.user
      );
    } catch (notifyErr) {
      console.error(
        "[Calendar API] Failed to dispatch notifications on event creation:",
        notifyErr
      );
    }
  }

  return NextResponse.json({ event: newEvent }, { status: 201 });
}
