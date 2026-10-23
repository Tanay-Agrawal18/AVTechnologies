import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  await connectDB();
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status");

  // Strictly enforce ownership: only fetch tasks assigned to this intern
  const query: Record<string, unknown> = {
    assignedInternId: auth.user.id,
    isArchived: false,
  };

  if (status && status !== "all") {
    query.status = status;
  }

  const tasks = await Task.find(query).sort({ dueDate: 1 }).lean();

  return NextResponse.json({ tasks });
}
