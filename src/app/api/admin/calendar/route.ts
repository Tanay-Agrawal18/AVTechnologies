import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  await connectDB();
  const searchParams = req.nextUrl.searchParams;

  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");
  const internId = searchParams.get("internId");
  const priority = searchParams.get("priority");
  const status = searchParams.get("status");

  const query: Record<string, unknown> = {
    isArchived: false,
  };

  // Date range filtering on dueDate
  if (startParam || endParam) {
    const dateQuery: Record<string, Date> = {};
    if (startParam) {
      const start = new Date(startParam);
      if (!isNaN(start.getTime())) {
        dateQuery.$gte = start;
      }
    }
    if (endParam) {
      const end = new Date(endParam);
      if (!isNaN(end.getTime())) {
        dateQuery.$lte = end;
      }
    }
    if (Object.keys(dateQuery).length > 0) {
      query.dueDate = dateQuery;
    }
  }

  if (internId && internId !== "all") {
    query.assignedInternId = internId;
  }

  if (priority && priority !== "all") {
    query.priority = priority;
  }

  if (status && status !== "all") {
    query.status = status;
  }

  // Populate assignedInternId with key fields for the Admin calendar
  const tasks = await Task.find(query)
    .populate("assignedInternId", "name email internId department")
    .sort({ dueDate: 1 })
    .lean();

  return NextResponse.json({ tasks });
}
