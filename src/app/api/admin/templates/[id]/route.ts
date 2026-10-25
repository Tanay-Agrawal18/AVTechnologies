import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { TaskTemplateService } from "@/services/taskTemplateService";
import { UpdateTaskTemplateSchema } from "@/validators";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const template = await TaskTemplateService.getTemplateById(id, auth.user);
    return NextResponse.json({ success: true, template });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch task template";
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
    const parsed = UpdateTaskTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const template = await TaskTemplateService.updateTemplate(id, parsed.data, auth.user);
    return NextResponse.json({ success: true, template });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update task template";
    const status = errorMsg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const result = await TaskTemplateService.deleteOrDeactivate(id, auth.user);
    return NextResponse.json({
      success: true,
      action: result.action,
      message:
        result.action === "deactivated"
          ? "Template has been deactivated because it was used in tasks"
          : "Template deleted successfully",
      template: result.template,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to remove task template";
    const status = errorMsg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: errorMsg }, { status });
  }
}
