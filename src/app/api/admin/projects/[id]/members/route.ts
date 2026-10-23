import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { ProjectService } from "@/services/projectService";
import { ManageProjectMemberSchema } from "@/validators";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = ManageProjectMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const project = await ProjectService.manageTeamMember(id, parsed.data, auth.user);
    return NextResponse.json({ success: true, project });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to modify team member";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
