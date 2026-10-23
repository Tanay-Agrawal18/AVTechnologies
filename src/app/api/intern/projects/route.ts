import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { ProjectService } from "@/services/projectService";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status") || undefined;

  try {
    const projects = await ProjectService.getProjects(auth.user, status);
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch your projects";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
