import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { UserService } from "@/services/userService";
import { CreateInternSchema } from "@/validators";
import { getBaseUrl } from "@/lib/getBaseUrl";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  await connectDB();
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const department = searchParams.get("department") || "";

  const query: Record<string, unknown> = { role: "intern" };

  if (status && status !== "all") {
    query.status = status;
  }

  if (department && department !== "all") {
    query.department = department;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { internId: { $regex: search, $options: "i" } },
    ];
  }

  const interns = await User.find(query).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ interns });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = CreateInternSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { intern, activationToken } = await UserService.createIntern(parsed.data);

    const baseUrl = getBaseUrl(req);
    const activationLink = `${baseUrl}/setup-password?token=${activationToken}`;

    return NextResponse.json(
      {
        success: true,
        intern: {
          id: intern._id,
          name: intern.name,
          email: intern.email,
          internId: intern.internId,
          department: intern.department,
          status: intern.status,
          startDate: intern.startDate,
          endDate: intern.endDate,
        },
        activationLink,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create intern";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const result = await UserService.deleteAllInterns({
      id: auth.user.id,
      name: auth.user.name,
      role: "admin",
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedInternsCount} intern(s) and all associated data.`,
      result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete interns";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
