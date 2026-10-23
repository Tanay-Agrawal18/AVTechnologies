import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { ProjectService } from "@/services/projectService";
import { UpdateProjectSchema } from "@/validators";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const data = await ProjectService.getProjectById(id, auth.user);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch project";
    const status = errorMsg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: errorMsg }, { status });
  }
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
    const parsed = UpdateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const project = await ProjectService.updateProject(id, parsed.data, auth.user);
    return NextResponse.json({ success: true, project });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update project";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
