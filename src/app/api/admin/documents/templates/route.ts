import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { DocumentTemplate, DocumentType } from "@/models/DocumentTemplate";
import { IssuedDocument } from "@/models/IssuedDocument";
import { AuditLog } from "@/models/AuditLog";
import fs from "fs";
import path from "path";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  await connectDB();
  const templates = await DocumentTemplate.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ templates });
}

const UpdateTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  title: z.string().optional(),
  companyName: z.string().optional(),
  signatoryName: z.string().optional(),
  signatoryTitle: z.string().optional(),
  content: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = UpdateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    await connectDB();
    const template = await DocumentTemplate.findById(parsed.data.id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (parsed.data.isActive === true) {
      // Deactivate other templates of same type
      await DocumentTemplate.updateMany(
        { type: template.type, _id: { $ne: template._id } },
        { isActive: false }
      );
      template.isActive = true;
    } else if (parsed.data.isActive === false) {
      template.isActive = false;
    }

    if (parsed.data.name) template.name = parsed.data.name;
    if (parsed.data.title) template.title = parsed.data.title;
    if (parsed.data.companyName) template.companyName = parsed.data.companyName;
    if (parsed.data.signatoryName) template.signatoryName = parsed.data.signatoryName;
    if (parsed.data.signatoryTitle) template.signatoryTitle = parsed.data.signatoryTitle;
    if (parsed.data.content) template.content = parsed.data.content;

    await template.save();

    await AuditLog.create({
      action: "template_updated",
      targetModel: "DocumentTemplate",
      targetId: template._id,
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRole: "admin",
      metadata: { templateName: template.name, isActive: template.isActive },
    });

    return NextResponse.json({ success: true, template });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const rawType = (formData.get("type") as string) || "offer_letter";
    const type: DocumentType = ["offer_letter", "completion_certificate", "recommendation_letter"].includes(rawType)
      ? (rawType as DocumentType)
      : "offer_letter";
    const signatoryName = (formData.get("signatoryName") as string) || "Hritik Jaiswal";
    const signatoryTitle = (formData.get("signatoryTitle") as string) || "Founder & CEO — VYORAI";

    if (!file || !name) {
      return NextResponse.json({ error: "File and Template Name are required" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF templates are supported" }, { status: 400 });
    }

    await connectDB();
    const latestVersion = await DocumentTemplate.countDocuments({ type });
    const versionNum = latestVersion + 1;

    // Save uploaded PDF template to public/uploads or public templates
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "templates");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const savedFilename = `template_${type}_v${versionNum}_${Date.now()}.pdf`;
    const targetPath = path.join(uploadDir, savedFilename);
    fs.writeFileSync(targetPath, buffer);

    const newTemplate = (await DocumentTemplate.create({
      name,
      type,
      title: `${name} (v${versionNum})`,
      companyName: "VYORAI",
      signatoryName,
      signatoryTitle,
      pdfTemplatePath: `public/templates/${savedFilename}`,
      version: versionNum,
      isActive: false, // Uploaded templates are inactive until tested & activated
      createdByAdminId: auth.user.id,
      content: `VyorAI Template v${versionNum}`,
    })) as unknown as { _id: import("mongoose").Types.ObjectId };

    await AuditLog.create({
      action: "template_uploaded",
      targetModel: "DocumentTemplate",
      targetId: newTemplate._id,
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRole: "admin",
      metadata: { version: versionNum, filename: savedFilename },
    });

    return NextResponse.json({ success: true, template: newTemplate });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error uploading template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await connectDB();
    // Safety check: Prevent deletion if documents have been issued using this template
    const issuedCount = await IssuedDocument.countDocuments({ templateId: id });
    if (issuedCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete template: ${issuedCount} issued document(s) reference this template version. Deactivate it instead.`,
        },
        { status: 400 }
      );
    }

    await DocumentTemplate.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Template removed" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error deleting template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
