import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { User, Project, Task } from "@/models";
import { verifyIdVerificationToken } from "@/lib/idVerification";

interface LeanProjectDoc {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: string;
  startDate?: Date;
  dueDate?: Date;
}

interface LeanTaskDoc {
  _id: mongoose.Types.ObjectId;
  title: string;
  status: string;
  priority: string;
}

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

    // 1. Try verifying as signed JWT token first
    const verificationResult = await verifyIdVerificationToken(token);
    let resolvedInternId: string | undefined;
    let resolvedUserId: string | undefined;

    if (verificationResult.valid && verificationResult.payload) {
      resolvedInternId = verificationResult.payload.internId;
      resolvedUserId = verificationResult.payload.userId;
    } else {
      // 2. Fallback: check if the param is directly an internId or MongoDB ObjectId
      resolvedInternId = decodeURIComponent(token).trim();
      if (mongoose.Types.ObjectId.isValid(resolvedInternId)) {
        resolvedUserId = resolvedInternId;
      }
    }

    await connectDB();

    const queryConditions: Record<string, unknown>[] = [];
    if (resolvedUserId && mongoose.Types.ObjectId.isValid(resolvedUserId)) {
      queryConditions.push({ _id: resolvedUserId });
    }
    if (resolvedInternId) {
      queryConditions.push({ internId: resolvedInternId });
      queryConditions.push({ internId: new RegExp(`^${resolvedInternId}$`, "i") });
    }

    if (queryConditions.length === 0) {
      return NextResponse.json(
        { verified: false, error: "Invalid verification identifier" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ $or: queryConditions }).select(
      "name internId role status department designation college profilePicture startDate endDate certificateUrl createdAt bio githubUrl linkedinUrl"
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

    // Check expiration / completion
    const now = new Date();
    const hasEndDate = Boolean(user.endDate);
    const isPastEndDate = hasEndDate ? new Date(user.endDate!) <= now : false;

    // Fetch Collaborative Projects where intern is a member
    const projects = await mongoose
      .model("Project")
      .find({
        "teamMembers.internId": user._id,
      })
      .select("title description status startDate dueDate")
      .sort({ createdAt: -1 })
      .lean<LeanProjectDoc[]>();

    // Fetch Tasks worked on
    const tasks = await mongoose
      .model("Task")
      .find({
        assignedInternId: user._id,
      })
      .select("title description status priority assignmentDate dueDate")
      .sort({ createdAt: -1 })
      .lean<LeanTaskDoc[]>();

    let idStatus: "active" | "completed" | "inactive" | "pending_setup" = "active";
    if (isRevoked) {
      idStatus = "inactive";
    } else if (isPastEndDate || user.certificateUrl) {
      idStatus = "completed";
    } else if (isPending) {
      idStatus = "pending_setup";
    }

    const isVerifiedValid = !isRevoked && !isPending;

    return NextResponse.json({
      verified: isVerifiedValid,
      idStatus,
      isInternshipCompleted: isPastEndDate || Boolean(user.certificateUrl),
      statusLabel: isPastEndDate
        ? "Internship Completed (Alumnus)"
        : isVerifiedValid
        ? "Official & Active Credential"
        : isRevoked
        ? "Revoked / Inactive Credential"
        : "Pending Setup",
      intern: {
        name: user.name,
        internId: user.internId || resolvedInternId,
        department: user.department || "Engineering & Innovation",
        designation: user.designation || "Software Development Intern",
        college: user.college,
        bio: user.bio,
        githubUrl: user.githubUrl,
        linkedinUrl: user.linkedinUrl,
        portfolioUrl: user.portfolioUrl,
        twitterUrl: user.twitterUrl,
        skills: user.skills || [],
        profilePicture: user.profilePicture,
        startDate: user.startDate,
        endDate: user.endDate,
        certificateUrl: user.certificateUrl || null,
        status: user.status,
      },
      projects: projects.map((p: LeanProjectDoc) => ({
        id: p._id.toString(),
        title: p.title,
        description: p.description,
        status: p.status,
        startDate: p.startDate,
        dueDate: p.dueDate,
      })),
      tasksSummary: {
        total: tasks.length,
        completed: tasks.filter((t: LeanTaskDoc) => t.status === "approved").length,
        inProgress: tasks.filter((t: LeanTaskDoc) => t.status === "in_progress" || t.status === "submitted").length,
      },
      recentTasks: tasks.slice(0, 6).map((t: LeanTaskDoc) => ({
        id: t._id.toString(),
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
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
