import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { TaskService } from "@/services/taskService";
import { CreateSubmissionSchema } from "@/validators";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = CreateSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await TaskService.submitWork(id, parsed.data, auth.user);

    return NextResponse.json({
      success: true,
      task: result.task,
      submission: result.submission,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to submit work";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
