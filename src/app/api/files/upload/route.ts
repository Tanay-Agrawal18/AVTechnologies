import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { getStorageAdapter } from "@/lib/storage";

// Allowed MIME types and max upload size (10 MB)
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin", "intern"]);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum permitted size of 10MB" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type) && !file.name.match(/\.(pdf|zip|docx|xlsx|png|jpg|jpeg|txt)$/i)) {
      return NextResponse.json(
        { error: "File type not allowed. Permitted: PDF, ZIP, DOCX, XLSX, PNG, JPG, TXT." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storage = getStorageAdapter();
    const result = await storage.saveFile(buffer, file.name, file.type);

    return NextResponse.json({
      success: true,
      fileKey: result.fileKey,
      fileName: file.name,
      fileSize: result.fileSize,
      mimeType: file.type || "application/octet-stream",
    });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload file safely" },
      { status: 500 }
    );
  }
}
