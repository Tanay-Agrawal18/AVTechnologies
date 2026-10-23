import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { TaskService } from "@/services/taskService";
import { UnassignTaskSchema } from "@/validators";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional for unassigning
      body = {};
    }

    const parsed = UnassignTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const task = await TaskService.unassignTask(id, parsed.data, auth.user);
    return NextResponse.json({ success: true, task });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to unassign task";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
