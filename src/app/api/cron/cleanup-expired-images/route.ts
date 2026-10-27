import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DailyProgressImage } from "@/models/DailyProgressImage";
import { deleteFromCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";

async function executeCleanup(req: NextRequest) {
  // Enforce CRON_SECRET authorization
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.CLEANUP_JOB_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server CRON_SECRET is not configured. Endpoint is disabled." },
      { status: 500 }
    );
  }

  const expectedHeader = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader !== expectedHeader) {
    return NextResponse.json({ error: "Unauthorized cron invocation" }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary credentials not configured" },
      { status: 503 }
    );
  }

  await connectDB();

  const now = new Date();
  // Find expired images that have not yet been marked deleted
  const expiredImages = await DailyProgressImage.find({
    expiresAt: { $lte: now },
    isDeleted: false,
    cleanupRetryCount: { $lt: 5 }, // Retry up to 5 times before requiring manual check
  }).limit(100);

  const results = {
    totalFound: expiredImages.length,
    deletedCount: 0,
    failedCount: 0,
    details: [] as Array<{
      imageId: string;
      publicId: string;
      status: "deleted" | "not_found" | "failed";
      error?: string;
    }>,
  };

  for (const image of expiredImages) {
    try {
      const res = await deleteFromCloudinary(image.cloudinaryPublicId);

      // Cloudinary returns result: "ok" or "not found"
      if (res.result === "ok" || res.result === "not found") {
        image.isDeleted = true;
        image.status = "deleted";
        image.deletedAt = new Date();
        await image.save();

        results.deletedCount++;
        results.details.push({
          imageId: image._id.toString(),
          publicId: image.cloudinaryPublicId,
          status: res.result === "ok" ? "deleted" : "not_found",
        });
      } else {
        image.cleanupRetryCount += 1;
        image.status = "delete_failed";
        image.lastCleanupError = `Unexpected Cloudinary response: ${JSON.stringify(res)}`;
        await image.save();

        results.failedCount++;
        results.details.push({
          imageId: image._id.toString(),
          publicId: image.cloudinaryPublicId,
          status: "failed",
          error: image.lastCleanupError,
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Deletion failed";
      image.cleanupRetryCount += 1;
      image.status = "delete_failed";
      image.lastCleanupError = errorMsg;
      await image.save();

      results.failedCount++;
      results.details.push({
        imageId: image._id.toString(),
        publicId: image.cloudinaryPublicId,
        status: "failed",
        error: errorMsg,
      });
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}

export async function POST(req: NextRequest) {
  return executeCleanup(req);
}

export async function GET(req: NextRequest) {
  return executeCleanup(req);
}
