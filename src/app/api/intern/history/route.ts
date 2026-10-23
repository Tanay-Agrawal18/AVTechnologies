import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { Submission } from "@/models/Submission";
import { Task } from "@/models/Task";

export async function GET() {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  await connectDB();

  const submissions = await Submission.find({ internId: auth.user.id })
    .populate("taskId", "title status priority dueDate")
    .sort({ createdAt: -1 })
    .lean();

  const completedTasksCount = await Task.countDocuments({
    assignedInternId: auth.user.id,
    status: "approved",
  });

  const pendingReviewsCount = await Task.countDocuments({
    assignedInternId: auth.user.id,
    status: "submitted",
  });

  return NextResponse.json({
    submissions,
    stats: {
      totalSubmissions: submissions.length,
      approvedTasks: completedTasksCount,
      pendingReviews: pendingReviewsCount,
    },
  });
}
