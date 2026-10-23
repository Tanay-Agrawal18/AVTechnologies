import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { TaskService } from "@/services/taskService";
import { ReviewSubmissionSchema } from "@/validators";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id: taskId, submissionId } = await params;

  try {
    const body = await req.json();
    const parsed = ReviewSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await TaskService.reviewSubmission(
      taskId,
      submissionId,
      parsed.data.decision,
      parsed.data.feedback,
      auth.user
    );

    return NextResponse.json({
      success: true,
      task: result.task,
      submission: result.submission,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Review submission failed";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
