import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { getStorageAdapter } from "@/lib/storage";
import { validateFileSafety, MAX_UPLOAD_SIZE } from "@/lib/fileValidation";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin", "intern"]);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum permitted size of 10MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safetyCheck = validateFileSafety(buffer, file.name, file.type);
    if (!safetyCheck.isValid) {
      return NextResponse.json(
        { error: safetyCheck.error || "File validation failed" },
        { status: 400 }
      );
    }

    const storage = getStorageAdapter();
    const result = await storage.saveFile(buffer, safetyCheck.normalizedName, safetyCheck.mimeType);

    return NextResponse.json({
      success: true,
      fileKey: result.fileKey,
      fileName: safetyCheck.normalizedName,
      fileSize: result.fileSize,
      mimeType: safetyCheck.mimeType,
    });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload file safely" },
      { status: 500 }
    );
  }
}
