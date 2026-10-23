import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { ProjectService } from "@/services/projectService";
import { CreateProjectSchema } from "@/validators";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status") || undefined;

  try {
    const projects = await ProjectService.getProjects(auth.user, status);
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch projects";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const project = await ProjectService.createProject(parsed.data, auth.user);
    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create project";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
