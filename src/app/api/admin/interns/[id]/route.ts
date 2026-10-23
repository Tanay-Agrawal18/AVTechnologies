import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Task } from "@/models/Task";
import { UserService } from "@/services/userService";
import { UpdateInternSchema } from "@/validators";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await connectDB();

  const intern = await User.findOne({ _id: id, role: "intern" }).lean();
  if (!intern) {
    return NextResponse.json({ error: "Intern not found" }, { status: 404 });
  }

  const tasks = await Task.find({ assignedInternId: id }).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ intern, tasks });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await connectDB();

  try {
    const body = await req.json();
    const parsed = UpdateInternSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const intern = await User.findOne({ _id: id, role: "intern" });
    if (!intern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    if (parsed.data.name) intern.name = parsed.data.name;
    if (parsed.data.department !== undefined) intern.department = parsed.data.department;
    if (parsed.data.startDate !== undefined) intern.startDate = parsed.data.startDate;
    if (parsed.data.endDate !== undefined) intern.endDate = parsed.data.endDate;
    if (parsed.data.status) intern.status = parsed.data.status;

    await intern.save();

    return NextResponse.json({ success: true, intern });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update intern";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
