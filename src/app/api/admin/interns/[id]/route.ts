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

    // Check email uniqueness if email is changed
    if (parsed.data.email && parsed.data.email.toLowerCase() !== intern.email.toLowerCase()) {
      const emailExists = await User.findOne({
        email: parsed.data.email.toLowerCase(),
        _id: { $ne: intern._id },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: `Email ${parsed.data.email} is already in use by another user` },
          { status: 409 }
        );
      }
    }

    // Check internId uniqueness if changed
    if (parsed.data.internId && parsed.data.internId !== intern.internId) {
      const idExists = await User.findOne({
        internId: parsed.data.internId,
        _id: { $ne: intern._id },
      });
      if (idExists) {
        return NextResponse.json(
          { error: `Intern ID ${parsed.data.internId} is already in use` },
          { status: 409 }
        );
      }
    }

    // Collect changed fields for audit logging
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (parsed.data.name !== undefined && parsed.data.name !== intern.name) {
      changes.name = { from: intern.name, to: parsed.data.name };
      intern.name = parsed.data.name;
    }
    if (parsed.data.email !== undefined && parsed.data.email.toLowerCase() !== intern.email) {
      changes.email = { from: intern.email, to: parsed.data.email.toLowerCase() };
      intern.email = parsed.data.email.toLowerCase();
    }
    if (parsed.data.internId !== undefined && parsed.data.internId !== intern.internId) {
      changes.internId = { from: intern.internId, to: parsed.data.internId };
      intern.internId = parsed.data.internId;
    }
    if (parsed.data.department !== undefined && parsed.data.department !== intern.department) {
      changes.department = { from: intern.department, to: parsed.data.department };
      intern.department = parsed.data.department;
    }
    if (parsed.data.designation !== undefined && parsed.data.designation !== intern.designation) {
      changes.designation = { from: intern.designation, to: parsed.data.designation };
      intern.designation = parsed.data.designation;
    }
    if (parsed.data.phone !== undefined && parsed.data.phone !== intern.phone) {
      changes.phone = { from: intern.phone, to: parsed.data.phone };
      intern.phone = parsed.data.phone;
    }
    if (parsed.data.startDate !== undefined && parsed.data.startDate !== intern.startDate) {
      changes.startDate = { from: intern.startDate, to: parsed.data.startDate };
      intern.startDate = parsed.data.startDate;
    }
    if (parsed.data.endDate !== undefined && parsed.data.endDate !== intern.endDate) {
      changes.endDate = { from: intern.endDate, to: parsed.data.endDate };
      intern.endDate = parsed.data.endDate;
    }
    if (parsed.data.status !== undefined && parsed.data.status !== intern.status) {
      changes.status = { from: intern.status, to: parsed.data.status };
      intern.status = parsed.data.status;
    }

    await intern.save();

    // Import AuditLog and record changes
    if (Object.keys(changes).length > 0) {
      const { AuditLog } = await import("@/models/AuditLog");
      await AuditLog.create({
        action: "member_profile_updated",
        targetModel: "User",
        targetId: intern._id,
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: auth.user.role,
        changes,
      });
    }

    return NextResponse.json({ success: true, intern });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update intern";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
