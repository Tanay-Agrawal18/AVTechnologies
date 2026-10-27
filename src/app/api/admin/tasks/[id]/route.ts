import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { TaskEvent } from "@/models/TaskEvent";
import { Submission } from "@/models/Submission";
import { DailyProgressImage } from "@/models/DailyProgressImage";
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

  const now = new Date();

  const [submissions, events, images] = await Promise.all([
    Submission.find({ taskId: id }).sort({ version: -1 }).lean(),
    TaskEvent.find({ taskId: id }).sort({ timestamp: -1 }).lean(),
    DailyProgressImage.find({
      taskId: id,
      isDeleted: false,
      expiresAt: { $gt: now },
    })
      .populate("internId", "name email internId department")
      .sort({ uploadedAt: -1 })
      .lean(),
  ]);

  const formattedImages = images.map((img) => {
    const remainingMs = Math.max(0, new Date(img.expiresAt).getTime() - now.getTime());
    const internDoc = img.internId as unknown as { name?: string; email?: string; internId?: string } | null;
    return {
      _id: img._id,
      originalFileName: img.originalFileName,
      caption: img.caption,
      uploadedAt: img.uploadedAt,
      expiresAt: img.expiresAt,
      remainingMinutes: Math.floor(remainingMs / (1000 * 60)),
      status: img.status || "active",
      uploaderName: internDoc?.name || "Intern",
      uploaderEmail: internDoc?.email || "",
      uploaderInternId: internDoc?.internId || "",
      viewUrl: `/api/progress-images/${img._id}/view`,
      downloadUrl: `/api/progress-images/${img._id}/view?download=true`,
    };
  });

  return NextResponse.json({
    task,
    submissions,
    events,
    progressImages: formattedImages,
  });
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
