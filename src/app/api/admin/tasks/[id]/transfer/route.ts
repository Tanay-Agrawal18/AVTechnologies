import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { TaskService } from "@/services/taskService";
import { TransferTaskSchema } from "@/validators";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = TransferTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { previousTask, newTask } = await TaskService.transferTask(
      id,
      parsed.data,
      auth.user
    );

    return NextResponse.json({
      success: true,
      previousTask,
      newTask,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to transfer task";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
