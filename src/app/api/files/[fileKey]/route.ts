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

  // Sanitize key against traversal or malicious characters
  if (!fileKey || typeof fileKey !== "string" || fileKey.includes("..") || fileKey.includes("/") || fileKey.includes("\\")) {
    return NextResponse.json({ error: "Invalid file key format" }, { status: 400 });
  }

  await connectDB();

  // Verify authorization: file MUST be registered to a valid submission
  const submission = await Submission.findOne({
    "attachments.fileKey": fileKey,
  }).lean();

  if (!submission) {
    // Orphaned or unlinked file: reject access by default
    return NextResponse.json(
      { error: "Access denied: Attachment record not found or unlinked" },
      { status: 404 }
    );
  }

  // Intern ownership check: only admin or the intern who owns the submission can access
  if (auth.user.role === "intern" && submission.internId.toString() !== auth.user.id) {
    return NextResponse.json(
      { error: "Access denied: You do not have permission to view this file" },
      { status: 403 }
    );
  }

  try {
    const storage = getStorageAdapter();
    const fileBuffer = await storage.getFileStream(fileKey);

    if (!fileBuffer) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const matchingAttachment = submission.attachments.find((a) => a.fileKey === fileKey);
    const mimeType = matchingAttachment?.mimeType || "application/octet-stream";
    const rawFileName = matchingAttachment?.fileName || "attachment";
    // Sanitize filename for Content-Disposition header
    const safeFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, "_");

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
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
