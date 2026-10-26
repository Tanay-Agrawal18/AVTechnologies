import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { verifyIdVerificationToken } from "@/lib/idVerification";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { verified: false, error: "Verification token is required" },
        { status: 400 }
      );
    }

    const verificationResult = await verifyIdVerificationToken(token);
    if (!verificationResult.valid || !verificationResult.payload) {
      return NextResponse.json(
        {
          verified: false,
          error: verificationResult.error || "Invalid or tampered verification token",
        },
        { status: 400 }
      );
    }

    const { internId, userId } = verificationResult.payload;

    await connectDB();

    const query: Record<string, unknown> = {};
    if (userId) {
      query._id = userId;
    } else if (internId) {
      query.internId = internId;
    }

    const user = await User.findOne(query).select(
      "name internId role status department designation college profilePicture startDate endDate createdAt"
    );

    if (!user) {
      return NextResponse.json(
        {
          verified: false,
          status: "not_found",
          error: "No active record found for this credential token",
        },
        { status: 404 }
      );
    }

    // Determine verification status
    const statusLower = (user.status || "").toLowerCase();
    const isRevoked = statusLower === "inactive";
    const isPending = statusLower === "pending_setup";
    const isActive = statusLower === "active";

    // Check expiration
    const now = new Date();
    const isExpired = user.endDate ? new Date(user.endDate) < now : false;

    let idStatus: "active" | "inactive" | "expired" | "pending_setup" = "active";
    if (isRevoked) {
      idStatus = "inactive";
    } else if (isExpired) {
      idStatus = "expired";
    } else if (isPending) {
      idStatus = "pending_setup";
    }

    const isVerifiedValid = isActive && !isExpired;

    return NextResponse.json({
      verified: isVerifiedValid,
      idStatus,
      statusLabel: isVerifiedValid
        ? "Official & Active Credential"
        : isExpired
        ? "Expired Credential"
        : isRevoked
        ? "Revoked / Inactive Credential"
        : "Pending Setup",
      intern: {
        name: user.name,
        internId: user.internId || internId,
        department: user.department || "Engineering & Innovation",
        designation: user.designation || "Software Development Intern",
        college: user.college,
        profilePicture: user.profilePicture,
        startDate: user.startDate,
        endDate: user.endDate,
        status: user.status,
      },
      verifiedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { verified: false, error: "Internal server error during verification" },
      { status: 500 }
    );
  }
}
