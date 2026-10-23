import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { IssuedDocument } from "@/models/IssuedDocument";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin", "intern"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await connectDB();

  const doc = await IssuedDocument.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Authorization check: Admin or the recipient intern
  if (auth.user.role === "intern" && doc.recipientInternId.toString() !== auth.user.id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!doc.pdfBase64) {
    return NextResponse.json({ error: "PDF content not available" }, { status: 404 });
  }

  const pdfBuffer = Buffer.from(doc.pdfBase64, "base64");
  const fileName = `${doc.documentType}_${doc.recipientSnapshot.internId || "intern"}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": pdfBuffer.length.toString(),
      "X-Document-Hash": doc.documentHash,
    },
  });
}
