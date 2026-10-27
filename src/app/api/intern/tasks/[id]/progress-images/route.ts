import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { DailyProgressImage } from "@/models/DailyProgressImage";
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["intern", "admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await connectDB();

  const task = await Task.findById(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Intern can only access their own task
  if (auth.user.role === "intern" && (!task.assignedInternId || task.assignedInternId.toString() !== auth.user.id)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const now = new Date();

  // Return unexpired and non-deleted images
  const images = await DailyProgressImage.find({
    taskId: id,
    isDeleted: false,
    expiresAt: { $gt: now },
  })
    .sort({ uploadedAt: -1 })
    .lean();

  const formattedImages = images.map((img) => {
    const remainingMs = Math.max(0, new Date(img.expiresAt).getTime() - now.getTime());
    return {
      _id: img._id,
      originalFileName: img.originalFileName,
      caption: img.caption,
      uploadedAt: img.uploadedAt,
      expiresAt: img.expiresAt,
      remainingMinutes: Math.floor(remainingMs / (1000 * 60)),
      status: img.status || "active",
      viewUrl: `/api/progress-images/${img._id}/view`,
    };
  });

  return NextResponse.json({ images: formattedImages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["intern"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await connectDB();

  const task = await Task.findById(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (!task.assignedInternId || task.assignedInternId.toString() !== auth.user.id) {
    return NextResponse.json(
      { error: "Access denied: You can only upload progress images for your own assigned tasks" },
      { status: 403 }
    );
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary image service is not configured. Please set Cloudinary credentials in server environment." },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 10MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary server-side
    const uploadResult = await uploadToCloudinary(buffer, "iwms_daily_progress");

    // Set expiry to exactly 24 hours after upload time
    const uploadedAt = new Date();
    const expiresAt = new Date(uploadedAt.getTime() + 24 * 60 * 60 * 1000);

    let progressImage;
    try {
      progressImage = await DailyProgressImage.create({
        taskId: task._id,
        internId: auth.user.id,
        cloudinaryPublicId: uploadResult.public_id,
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        caption: caption.trim() ? caption.trim().slice(0, 300) : undefined,
        uploadedAt,
        expiresAt,
        status: "active",
        isDeleted: false,
      });
    } catch (dbErr) {
      // Compensatory cleanup: if database save fails, remove orphaned asset from Cloudinary
      try {
        await deleteFromCloudinary(uploadResult.public_id);
      } catch (cleanupErr) {
        console.error("Failed compensatory deletion of Cloudinary asset:", cleanupErr);
      }
      throw dbErr;
    }

    return NextResponse.json(
      {
        success: true,
        image: {
          _id: progressImage._id,
          originalFileName: progressImage.originalFileName,
          caption: progressImage.caption,
          uploadedAt: progressImage.uploadedAt,
          expiresAt: progressImage.expiresAt,
          remainingMinutes: 24 * 60,
          status: progressImage.status,
          viewUrl: `/api/progress-images/${progressImage._id}/view`,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to upload progress image";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
