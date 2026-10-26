import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  await connectDB();
  const searchParams = req.nextUrl.searchParams;

  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");
  const priority = searchParams.get("priority");
  const status = searchParams.get("status");

  // Enforce self-only ownership strictly on the server: exclude archived and unassigned/transferred
  const query: Record<string, unknown> = {
    assignedInternId: auth.user.id,
    isArchived: false,
    status: { $nin: ["unassigned", "transferred"] },
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

  if (priority && priority !== "all") {
    query.priority = priority;
  }

  if (status && status !== "all") {
    query.status = status;
  }

  const tasks = await Task.find(query).sort({ dueDate: 1 }).lean();

  return NextResponse.json({ tasks });
}
