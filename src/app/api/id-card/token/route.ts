import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createIdVerificationToken } from "@/lib/idVerification";
import { getBaseUrl } from "@/lib/getBaseUrl";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId || session?.id;
    const targetInternId = body.internId || session?.internId;

    if (!targetUserId && !targetInternId) {
      return NextResponse.json(
        { error: "Missing intern identification" },
        { status: 400 }
      );
    }

    const token = await createIdVerificationToken({
      userId: targetUserId,
      internId: targetInternId,
    });

    const origin = getBaseUrl(req);
    const verificationUrl = `${origin}/verify/${encodeURIComponent(token)}`;

    return NextResponse.json({
      token,
      verificationUrl,
    });
  } catch (error: unknown) {
    console.error("Failed to generate verification token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
