import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { DocumentTemplate } from "@/models/DocumentTemplate";
import { IssuedDocument } from "@/models/IssuedDocument";
import { DocumentService, VyoraiOfferLetterData } from "@/services/documentService";
import { AuditLog } from "@/models/AuditLog";
import JSZip from "jszip";
import { z } from "zod";

const CandidateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Candidate name is required"),
  email: z.string().email("Valid email is required"),
  internId: z.string().min(1, "Intern ID is required"),
  role: z.string().min(1, "Role is required"),
  workMode: z.string().default("Remote"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  responsibilities: z.array(z.string()).optional(),
  compensation: z.string().optional(),
  acceptanceEmail: z.string().optional(),
});

const BulkGenerateSchema = z.object({
  templateId: z.string().optional(),
  issueDate: z.string().optional(),
  candidates: z.array(CandidateSchema).min(1, "At least one candidate is required"),
  action: z.enum(["preview", "generate", "download_zip"]).default("generate"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = BulkGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { candidates, action, issueDate } = parsed.data;
    await connectDB();
    await DocumentService.seedDefaultTemplatesIfNeeded(auth.user.id);

    const formattedIssueDate =
      issueDate ||
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

    // 1. Single candidate preview mode
    if (action === "preview") {
      const candidate = candidates[0];
      const pdfBuffer = await DocumentService.generateVyoraiOfferLetterPdf({
        candidateName: candidate.name,
        internId: candidate.internId,
        issueDate: formattedIssueDate,
        role: candidate.role,
        workMode: candidate.workMode,
        startDate: candidate.startDate,
        endDate: candidate.endDate,
        responsibilities: candidate.responsibilities,
        acceptanceEmail: candidate.acceptanceEmail || "hr@vyorai.com",
      });

      return NextResponse.json({
        success: true,
        candidateName: candidate.name,
        internId: candidate.internId,
        pdfBase64: pdfBuffer.toString("base64"),
      });
    }

    // Find active offer letter template
    let template = parsed.data.templateId
      ? await DocumentTemplate.findById(parsed.data.templateId)
      : await DocumentTemplate.findOne({ type: "offer_letter", isActive: true });

    if (!template) {
      template = await DocumentTemplate.findOne({ type: "offer_letter" });
    }

    const results: Array<{
      candidateName: string;
      internId: string;
      email: string;
      status: "success" | "failed";
      documentId?: string;
      error?: string;
      pdfBase64?: string;
      filename: string;
    }> = [];

    const zip = new JSZip();

    for (const cand of candidates) {
      const sanitizedName = cand.name.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Vyorai_Offer_Letter_${sanitizedName}_${cand.internId}.pdf`;

      try {
        const letterData: VyoraiOfferLetterData = {
          candidateName: cand.name,
          internId: cand.internId,
          issueDate: formattedIssueDate,
          role: cand.role,
          workMode: cand.workMode,
          startDate: cand.startDate,
          endDate: cand.endDate,
          responsibilities: cand.responsibilities,
          acceptanceEmail: cand.acceptanceEmail || "hr@vyorai.com",
        };

        const pdfBuffer = await DocumentService.generateVyoraiOfferLetterPdf(letterData);
        const base64 = pdfBuffer.toString("base64");

        // Save issued document record
        const docRecord = await IssuedDocument.create({
          templateId: template?._id,
          templateVersion: template?.version || 1,
          documentType: "offer_letter",
          title: `Offer Letter - ${cand.name}`,
          recipientInternId: cand.id || auth.user.id, // Fallback if candidate is newly imported
          recipientSnapshot: {
            name: cand.name,
            email: cand.email,
            internId: cand.internId,
            department: cand.role,
          },
          variables: {
            candidate_name: cand.name,
            intern_id: cand.internId,
            email: cand.email,
            role: cand.role,
            work_mode: cand.workMode,
            start_date: cand.startDate,
            end_date: cand.endDate,
            issue_date: formattedIssueDate,
          },
          renderedContent: `VyorAI Official Offer Letter for ${cand.name} (${cand.internId}) - ${cand.role}`,
          pdfBase64: base64,
          documentHash: crypto
            .createHash("sha256")
            .update(pdfBuffer)
            .digest("hex"),
          status: "issued",
          issueDate: new Date(),
          issuedByAdminId: auth.user.id,
          issuedByAdminName: auth.user.name,
          signatoryName: template?.signatoryName || "Hritik Jaiswal",
          signatoryTitle: template?.signatoryTitle || "Founder & CEO — VYORAI",
        });

        zip.file(filename, pdfBuffer);

        results.push({
          candidateName: cand.name,
          internId: cand.internId,
          email: cand.email,
          status: "success",
          documentId: (docRecord._id as unknown as string).toString(),
          pdfBase64: base64,
          filename,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to generate offer letter";
        results.push({
          candidateName: cand.name,
          internId: cand.internId,
          email: cand.email,
          status: "failed",
          error: message,
          filename,
        });
      }
    }

    // Audit log entry
    await AuditLog.create({
      action: "bulk_offer_letters_generated",
      targetModel: "IssuedDocument",
      targetId: auth.user.id,
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRole: "admin",
      metadata: {
        totalRequested: candidates.length,
        successfulCount: results.filter((r) => r.status === "success").length,
        failedCount: results.filter((r) => r.status === "failed").length,
      },
    });

    if (action === "download_zip") {
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      return new NextResponse(zipBuffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="Vyorai_Offer_Letters_${Date.now()}.zip"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      total: candidates.length,
      successCount: results.filter((r) => r.status === "success").length,
      failureCount: results.filter((r) => r.status === "failed").length,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
