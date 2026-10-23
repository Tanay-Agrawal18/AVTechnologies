import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { ProjectService } from "@/services/projectService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const data = await ProjectService.getProjectById(id, auth.user);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch project details";
    const status = errorMsg.includes("Access denied") ? 403 : errorMsg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}
