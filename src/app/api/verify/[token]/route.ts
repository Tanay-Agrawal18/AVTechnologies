import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { User, Project, Task } from "@/models";
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
      .lean();

    // Fetch Tasks worked on
    const tasks = await mongoose
      .model("Task")
      .find({
        assignedInternId: user._id,
      })
      .select("title description status priority assignmentDate dueDate")
      .sort({ createdAt: -1 })
      .lean();

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
        internId: user.internId || internId,
        department: user.department || "Engineering & Innovation",
        designation: user.designation || "Software Development Intern",
        college: user.college,
        bio: user.bio,
        githubUrl: user.githubUrl,
        linkedinUrl: user.linkedinUrl,
        profilePicture: user.profilePicture,
        startDate: user.startDate,
        endDate: user.endDate,
        certificateUrl: user.certificateUrl || null,
        status: user.status,
      },
      projects: projects.map((p: any) => ({
        id: p._id.toString(),
        title: p.title,
        description: p.description,
        status: p.status,
        startDate: p.startDate,
        dueDate: p.dueDate,
      })),
      tasksSummary: {
        total: tasks.length,
        completed: tasks.filter((t: any) => t.status === "approved").length,
        inProgress: tasks.filter((t: any) => t.status === "in_progress" || t.status === "submitted").length,
      },
      recentTasks: tasks.slice(0, 6).map((t: any) => ({
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
