import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { DailyProgressImage } from "@/models/DailyProgressImage";
import { Task } from "@/models/Task";
import { getCloudinaryClient } from "@/lib/cloudinary";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin", "intern"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await connectDB();

  const image = await DailyProgressImage.findById(id);
  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Check 24-hour expiry strictly
  const now = new Date();
  if (image.isDeleted || image.expiresAt <= now) {
    return NextResponse.json(
      { error: "Image access expired. Progress images are strictly retained for 24 hours only." },
      { status: 410 } // 410 Gone
    );
  }

  // Authorization check: Admin or the intern who owns the task
  if (auth.user.role === "intern") {
    const task = await Task.findById(image.taskId);
    if (!task || !task.assignedInternId || task.assignedInternId.toString() !== auth.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  // Generate private signed URL valid only until the image's exact expiry time
  try {
    const client = getCloudinaryClient();
    const expiryTimestamp = Math.floor(image.expiresAt.getTime() / 1000);

    const signedUrl = client.url(image.cloudinaryPublicId, {
      sign_url: true,
      secure: true,
      expires_at: expiryTimestamp,
    });

    return NextResponse.redirect(signedUrl);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to load image";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
