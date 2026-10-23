import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { TaskService } from "@/services/taskService";
import { CreateTaskSchema } from "@/validators";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  await connectDB();
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status");
  const internId = searchParams.get("internId");
  const priority = searchParams.get("priority");
  const includeArchived = searchParams.get("archived") === "true";

  const query: Record<string, unknown> = {};

  if (!includeArchived) {
    query.isArchived = false;
  }

  if (status && status !== "all") {
    query.status = status;
  }

  if (internId && internId !== "all") {
    query.assignedInternId = internId;
  }

  if (priority && priority !== "all") {
    query.priority = priority;
  }

  const tasks = await Task.find(query)
    .populate("assignedInternId", "name email internId department")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = CreateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const tasks = await TaskService.createTasks(parsed.data, auth.user);

    return NextResponse.json(
      { success: true, task: tasks[0], tasks, count: tasks.length },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create task";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
