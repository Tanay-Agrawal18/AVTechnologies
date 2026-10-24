import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { DocumentTemplate } from "@/models/DocumentTemplate";
import { IssuedDocument, IIssuedDocumentDocument } from "@/models/IssuedDocument";
import { User } from "@/models/User";
import { SessionUser } from "@/types";

export interface GeneratePdfOptions {
  title: string;
  recipientName: string;
  internId: string;
  department: string;
  designation?: string;
  startDate?: string;
  endDate?: string;
  issueDate: string;
  bodyContent: string;
  companyName: string;
  signatoryName: string;
  signatoryTitle: string;
}

export class DocumentService {
  static async seedDefaultTemplatesIfNeeded(adminId: string) {
    await connectDB();
    const count = await DocumentTemplate.countDocuments();
    if (count > 0) return;

    await DocumentTemplate.create([
      {
        name: "Official Internship Offer Letter",
        type: "offer_letter",
        title: "Internship Offer Letter",
        companyName: "AV Technologies Ltd.",
        signatoryName: "Dr. Vikram Sethi",
        signatoryTitle: "Head of Talent Acquisition & Engineering",
        content: `Dear {{intern_name}},

On behalf of {{company_name}}, we are pleased to offer you an appointment as an Engineering Intern in our {{department}} department, commencing on {{start_date}} and concluding on {{end_date}}.

During this engagement, you will collaborate closely with our core engineering teams, developing scalable modules, participating in agile sprint reviews, and contributing to production systems.

We trust that this experience will provide substantial career advancement, practical technical mastery, and professional growth. Please confirm your acceptance by logging into the portal and completing your account setup.

Welcome aboard!`,
        version: 1,
        isActive: true,
        createdByAdminId: adminId,
      },
      {
        name: "Certificate of Internship Completion",
        type: "completion_certificate",
        title: "Certificate of Internship Completion",
        companyName: "AV Technologies Ltd.",
        signatoryName: "Dr. Vikram Sethi",
        signatoryTitle: "Head of Talent Acquisition & Engineering",
        content: `This is to certify that

{{intern_name}}
(Intern ID: {{intern_id}})

has successfully completed the full tenure of the Internship Program in the {{department}} department at {{company_name}} from {{start_date}} through {{end_date}}.

During their internship tenure, {{intern_name}} demonstrated outstanding technical aptitude, professional diligence, proactive problem-solving, and exemplary collaboration across cross-functional teams.

We congratulate {{intern_name}} on this achievement and extend our highest recommendations for their future academic and professional endeavors.`,
        version: 1,
        isActive: true,
        createdByAdminId: adminId,
      },
    ]);
  }

  static renderContent(content: string, vars: Record<string, string>): string {
    let output = content;
    for (const [key, val] of Object.entries(vars)) {
      output = output.replaceAll(`{{${key}}}`, val || "—");
    }
    return output;
  }

  static async generatePdfBuffer(options: GeneratePdfOptions): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    const { width, height } = page.getSize();

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Header Branding & Decorative Line
    page.drawRectangle({
      x: 40,
      y: height - 60,
      width: width - 80,
      height: 4,
      color: rgb(0.12, 0.44, 0.88), // Royal Blue
    });

    page.drawText(options.companyName.toUpperCase(), {
      x: 40,
      y: height - 50,
      size: 14,
      font: helveticaBold,
      color: rgb(0.09, 0.15, 0.28),
    });

    page.drawText("INTERNSHIP & WORK MANAGEMENT SYSTEM (IWMS)", {
      x: 40,
      y: height - 75,
      size: 8,
      font: helvetica,
      color: rgb(0.45, 0.5, 0.6),
    });

    // Document Title
    page.drawText(options.title.toUpperCase(), {
      x: 40,
      y: height - 120,
      size: 18,
      font: helveticaBold,
      color: rgb(0.09, 0.15, 0.28),
    });

    // Metadata Bar
    const metaY = height - 150;
    page.drawText(`Date of Issue: ${options.issueDate}`, {
      x: 40,
      y: metaY,
      size: 9,
      font: helveticaBold,
      color: rgb(0.2, 0.25, 0.35),
    });

    page.drawText(`Intern ID: ${options.internId}`, {
      x: width - 200,
      y: metaY,
      size: 9,
      font: helveticaBold,
      color: rgb(0.2, 0.25, 0.35),
    });

    page.drawLine({
      start: { x: 40, y: metaY - 10 },
      end: { x: width - 40, y: metaY - 10 },
      thickness: 0.5,
      color: rgb(0.85, 0.87, 0.9),
    });

    // Main Body Text with Word Wrapping
    const maxLineWidth = width - 80;
    const bodyFontSize = 10.5;
    const lineHeight = 16;
    let cursorY = metaY - 35;

    const paragraphs = options.bodyContent.split("\n\n");
    for (const paragraph of paragraphs) {
      const lines = paragraph.split("\n");
      for (const rawLine of lines) {
        const words = rawLine.split(" ");
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = helvetica.widthOfTextAtSize(testLine, bodyFontSize);

          if (textWidth > maxLineWidth) {
            page.drawText(currentLine, {
              x: 40,
              y: cursorY,
              size: bodyFontSize,
              font: helvetica,
              color: rgb(0.15, 0.18, 0.25),
            });
            cursorY -= lineHeight;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          page.drawText(currentLine, {
            x: 40,
            y: cursorY,
            size: bodyFontSize,
            font: helvetica,
            color: rgb(0.15, 0.18, 0.25),
          });
          cursorY -= lineHeight;
        }
      }
      cursorY -= 8; // Extra spacing between paragraphs
    }

    // Signatory Block
    const signY = 140;
    page.drawLine({
      start: { x: 40, y: signY + 30 },
      end: { x: 220, y: signY + 30 },
      thickness: 1,
      color: rgb(0.2, 0.25, 0.35),
    });

    page.drawText(options.signatoryName, {
      x: 40,
      y: signY + 14,
      size: 11,
      font: helveticaBold,
      color: rgb(0.09, 0.15, 0.28),
    });

    page.drawText(options.signatoryTitle, {
      x: 40,
      y: signY,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.45, 0.55),
    });

    page.drawText(options.companyName, {
      x: 40,
      y: signY - 14,
      size: 9,
      font: helveticaOblique,
      color: rgb(0.4, 0.45, 0.55),
    });

    // Verification Footer
    page.drawText("Electronically certified document issued via IWMS. Verification reference on file.", {
      x: 40,
      y: 40,
      size: 7.5,
      font: helvetica,
      color: rgb(0.55, 0.6, 0.7),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  static async issueDocument(params: {
    templateId: string;
    internId: string;
    actor: SessionUser;
    customVariables?: Record<string, string>;
  }): Promise<IIssuedDocumentDocument> {
    await connectDB();

    const template = await DocumentTemplate.findById(params.templateId);
    if (!template) {
      throw new Error("Document template not found");
    }

    const intern = await User.findOne({ _id: params.internId, role: "intern" });
    if (!intern) {
      throw new Error("Recipient intern not found");
    }

    const issueDate = new Date();
    const issueDateStr = issueDate.toISOString().split("T")[0];

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
      ...(params.customVariables || {}),
    };

    const renderedContent = this.renderContent(template.content, variables);

    // Generate PDF
    const pdfBuffer = await this.generatePdfBuffer({
      title: template.title,
      recipientName: intern.name,
      internId: variables.intern_id,
      department: variables.department,
      designation: variables.designation,
      startDate: variables.start_date,
      endDate: variables.end_date,
      issueDate: issueDateStr,
      bodyContent: renderedContent,
      companyName: template.companyName,
      signatoryName: template.signatoryName,
      signatoryTitle: template.signatoryTitle,
    });

    const documentHash = crypto
      .createHash("sha256")
      .update(pdfBuffer)
      .digest("hex");

    const issuedDoc = await IssuedDocument.create({
      templateId: template._id,
      templateVersion: template.version,
      documentType: template.type,
      title: template.title,
      recipientInternId: intern._id,
      recipientSnapshot: {
        name: intern.name,
        email: intern.email,
        internId: intern.internId || "AV-INTERN",
        department: intern.department,
      },
      variables,
      renderedContent,
      pdfBase64: pdfBuffer.toString("base64"),
      documentHash,
      issueDate,
      issuedByAdminId: params.actor.id,
      issuedByAdminName: params.actor.name,
      signatoryName: template.signatoryName,
      signatoryTitle: template.signatoryTitle,
    });

    return issuedDoc;
  }
}
