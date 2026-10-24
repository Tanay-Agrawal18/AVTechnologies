import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { IssuedDocument } from "@/models/IssuedDocument";
import { AuditLog } from "@/models/AuditLog";
import { z } from "zod";

const StatusActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["revoke", "replace"]),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = StatusActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    await connectDB();
    const doc = await IssuedDocument.findById(parsed.data.id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (parsed.data.action === "revoke") {
      doc.status = "revoked";
      doc.revokedAt = new Date();
      doc.revocationReason = parsed.data.reason || "Revoked by Administrator";
      await doc.save();

      await AuditLog.create({
        action: "document_revoked",
        targetModel: "IssuedDocument",
        targetId: doc._id,
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRole: "admin",
        metadata: { reason: doc.revocationReason },
      });

      return NextResponse.json({ success: true, message: "Document revoked successfully", doc });
    }

    return NextResponse.json({ error: "Action not implemented" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating document status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
