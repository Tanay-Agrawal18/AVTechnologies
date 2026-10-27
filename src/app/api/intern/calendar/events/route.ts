import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { CalendarEvent } from "@/models/CalendarEvent";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  await connectDB();
  const searchParams = req.nextUrl.searchParams;

  const type = searchParams.get("type");
  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");

  // Retrieve intern's current department for accurate department-targeted queries
  const internUser = await User.findById(auth.user.id).select("department").lean();
  const internDepartment = internUser?.department;
  const internObjectId = new mongoose.Types.ObjectId(auth.user.id);

  // Audience filter:
  // 1. All active interns (`audienceType: "all"`)
  // 2. Department-scoped matching this intern's department
  // 3. Individual audience explicitly naming this intern's ObjectId
  const audienceConditions: Record<string, unknown>[] = [
    { audienceType: "all" },
    { audienceType: "individual", targetInternIds: internObjectId },
  ];

  if (internDepartment) {
    audienceConditions.push({
      audienceType: "department",
      targetDepartment: internDepartment,
    });
  }

  // Base query: MUST be published (strictly hide drafts and cancelled entries from intern)
  const query: Record<string, unknown> = {
    status: "published",
    $or: audienceConditions,
  };

  if (type && type !== "all") {
    query.type = type;
  }

  if (startParam || endParam) {
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
    .select("title description type startDate endDate isAllDay location meetingUrl audienceType publishedAt createdAt")
    .sort({ startDate: 1 })
    .lean();

  return NextResponse.json({ events });
}
