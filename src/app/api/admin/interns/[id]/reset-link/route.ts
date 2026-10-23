import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { UserService } from "@/services/userService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const resetToken = await UserService.generatePasswordResetLink(id);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/setup-password?token=${resetToken}`;

    return NextResponse.json({
      success: true,
      resetLink,
      message: "One-time password setup link generated successfully",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to generate setup link";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
