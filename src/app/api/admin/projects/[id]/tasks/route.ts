import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { ProjectService } from "@/services/projectService";
import { z } from "zod";
import { TaskPrioritySchema } from "@/validators";

const CreateProjectTaskPayloadSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
    description: z.string().trim().min(10, "Description must be at least 10 characters"),
    priority: TaskPrioritySchema.default("medium"),
    assignedInternId: z.string().trim().min(1, "Assigned intern is required"),
    assignmentDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid assignment date"),
    dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid due date"),
  })
  .refine(
    (data) => new Date(data.dueDate) >= new Date(data.assignmentDate),
    {
      message: "Due date cannot be before assignment date",
      path: ["dueDate"],
    }
  );

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = CreateProjectTaskPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const task = await ProjectService.createProjectTask(id, parsed.data, auth.user);
    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create project task";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
