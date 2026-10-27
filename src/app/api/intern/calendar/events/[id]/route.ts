import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { CalendarEvent } from "@/models/CalendarEvent";
import { User } from "@/models/User";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  await connectDB();
  const event = await CalendarEvent.findById(id).lean();

  if (!event || event.status !== "published") {
    // Hide existence of non-published/cancelled events from interns
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Audience access check: Ensure caller has permission to view this specific event
  const internUser = await User.findById(auth.user.id).select("department").lean();
  const internDept = internUser?.department;
  const internIdStr = auth.user.id;

  let hasAccess = false;
  if (event.audienceType === "all") {
    hasAccess = true;
  } else if (event.audienceType === "department" && event.targetDepartment && internDept === event.targetDepartment) {
    hasAccess = true;
  } else if (event.audienceType === "individual" && event.targetInternIds?.length) {
    hasAccess = event.targetInternIds.some(
      (tid) => tid.toString() === internIdStr
    );
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Return sanitized event payload without exposing other target intern IDs or admin internal audit IDs
  const sanitizedEvent = {
    _id: event._id,
    title: event.title,
    description: event.description,
    type: event.type,
    startDate: event.startDate,
    endDate: event.endDate,
    isAllDay: event.isAllDay,
    location: event.location,
    meetingUrl: event.meetingUrl,
    audienceType: event.audienceType,
    publishedAt: event.publishedAt,
    createdAt: event.createdAt,
  };

  return NextResponse.json({ event: sanitizedEvent });
}
