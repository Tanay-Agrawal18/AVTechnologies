import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { TaskEvent } from "@/models/TaskEvent";
import { Submission } from "@/models/Submission";
import { TaskService } from "@/services/taskService";
import { InternStatusUpdateSchema } from "@/validators";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await connectDB();

  const task = await Task.findById(id).lean();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // IDOR Protection: ensure task belongs to this intern
  if (!task.assignedInternId || task.assignedInternId.toString() !== auth.user.id) {
    return NextResponse.json(
      { error: "Access denied: This task is not assigned to you" },
      { status: 403 }
    );
  }

  const [submissions, events] = await Promise.all([
    Submission.find({ taskId: id }).sort({ version: -1 }).lean(),
    TaskEvent.find({ taskId: id }).sort({ timestamp: -1 }).lean(),
  ]);

  return NextResponse.json({ task, submissions, events });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = InternStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const task = await TaskService.updateTaskStatus(
      id,
      parsed.data.status,
      auth.user,
      "Intern updated task status"
    );

    return NextResponse.json({ success: true, task });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update status";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
