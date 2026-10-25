import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { TaskTemplateService } from "@/services/taskTemplateService";
import { CreateTaskTemplateSchema, TaskTemplateQuerySchema } from "@/validators";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const searchParams = req.nextUrl.searchParams;
    const queryParsed = TaskTemplateQuerySchema.safeParse({
      search: searchParams.get("search") || undefined,
      priority: searchParams.get("priority") || undefined,
      includeInactive: searchParams.get("includeInactive") || undefined,
    });

    const filter = {
      search: queryParsed.success ? queryParsed.data.search : undefined,
      priority: queryParsed.success ? queryParsed.data.priority : undefined,
      includeInactive: queryParsed.success
        ? queryParsed.data.includeInactive === "true"
        : searchParams.get("includeInactive") === "true",
    };

    const templates = await TaskTemplateService.getTemplates(filter, auth.user);
    return NextResponse.json({ success: true, templates });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch task templates";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = CreateTaskTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const template = await TaskTemplateService.createTemplate(parsed.data, auth.user);
    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create task template";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
