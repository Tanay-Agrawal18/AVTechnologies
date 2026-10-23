import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { DocumentTemplate } from "@/models/DocumentTemplate";
import { IssuedDocument } from "@/models/IssuedDocument";
import { User } from "@/models/User";
import { DocumentService } from "@/services/documentService";
import { z } from "zod";

const IssueDocumentSchema = z.object({
  action: z.enum(["preview", "issue"]).default("issue"),
  templateId: z.string().min(1, "Template is required"),
  internId: z.string().min(1, "Recipient intern is required"),
  customVariables: z.record(z.string(), z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  await connectDB();
  await DocumentService.seedDefaultTemplatesIfNeeded(auth.user.id);

  const templates = await DocumentTemplate.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  const issuedDocuments = await IssuedDocument.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .select("-pdfBase64") // Exclude heavy base64 from listing for fast responses
    .lean();

  return NextResponse.json({ templates, issuedDocuments });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = IssueDocumentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    await connectDB();

    const template = await DocumentTemplate.findById(parsed.data.templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const intern = await User.findOne({ _id: parsed.data.internId, role: "intern" });
    if (!intern) {
      return NextResponse.json({ error: "Recipient intern not found" }, { status: 404 });
    }

    const issueDateStr = new Date().toISOString().split("T")[0];
    const variables: Record<string, string> = {
      intern_name: intern.name,
      intern_id: intern.internId || "AV-INTERN",
      email: intern.email,
      department: intern.department || "General",
      designation: intern.designation || "Intern",
      start_date: intern.startDate || "N/A",
      end_date: intern.endDate || "Ongoing",
      issue_date: issueDateStr,
      company_name: template.companyName,
      signatory_name: template.signatoryName,
      signatory_title: template.signatoryTitle,
      ...(parsed.data.customVariables || {}),
    };

    const renderedContent = DocumentService.renderContent(template.content, variables);

    // If preview mode, return rendered text without committing to DB
    if (parsed.data.action === "preview") {
      return NextResponse.json({
        preview: true,
        title: template.title,
        recipient: {
          name: intern.name,
          email: intern.email,
          internId: intern.internId,
        },
        renderedContent,
        variables,
      });
    }

    // Full issue mode with immutable record and PDF generation
    const issuedDoc = await DocumentService.issueDocument({
      templateId: parsed.data.templateId,
      internId: parsed.data.internId,
      actor: auth.user,
      customVariables: parsed.data.customVariables,
    });

    return NextResponse.json(
      {
        success: true,
        issuedDocument: {
          _id: issuedDoc._id,
          title: issuedDoc.title,
          documentType: issuedDoc.documentType,
          documentHash: issuedDoc.documentHash,
          recipientSnapshot: issuedDoc.recipientSnapshot,
          issueDate: issuedDoc.issueDate,
          downloadUrl: `/api/documents/${issuedDoc._id}/download`,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to issue document";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
