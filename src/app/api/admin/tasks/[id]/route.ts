import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { TaskEvent } from "@/models/TaskEvent";
import { Submission } from "@/models/Submission";
import { TaskService } from "@/services/taskService";
import { UpdateTaskSchema } from "@/validators";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await connectDB();

  const task = await Task.findById(id)
    .populate("assignedInternId", "name email internId department status")
    .lean();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
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
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = UpdateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const task = await TaskService.updateTask(id, parsed.data, auth.user);

    return NextResponse.json({ success: true, task });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update task";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
