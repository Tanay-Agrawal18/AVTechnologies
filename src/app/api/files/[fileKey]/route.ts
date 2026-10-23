import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { getStorageAdapter } from "@/lib/storage";
import { connectDB } from "@/lib/db";
import { Submission } from "@/models/Submission";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileKey: string }> }
) {
  const auth = await requireAuth(["admin", "intern"]);
  if (!auth.ok) return auth.response;

  const { fileKey } = await params;
  await connectDB();

  // Verify authorization: check if this file belongs to a submission
  const submission = await Submission.findOne({
    "attachments.fileKey": fileKey,
  }).lean();

  if (submission) {
    if (auth.user.role === "intern" && submission.internId.toString() !== auth.user.id) {
      return NextResponse.json(
        { error: "Access denied: You do not have permission to view this file" },
        { status: 403 }
      );
    }
  }

  try {
    const storage = getStorageAdapter();
    const fileBuffer = await storage.getFileStream(fileKey);

    if (!fileBuffer) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const matchingAttachment = submission?.attachments.find((a) => a.fileKey === fileKey);
    const mimeType = matchingAttachment?.mimeType || "application/octet-stream";
    const fileName = matchingAttachment?.fileName || fileKey;

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("File retrieval error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve requested file" },
      { status: 500 }
    );
  }
}
