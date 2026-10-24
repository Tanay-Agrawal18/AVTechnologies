import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { DocumentTemplate, IDocumentTemplateDocument } from "@/models/DocumentTemplate";
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

export interface VyoraiOfferLetterData {
  candidateName: string;
  internId: string;
  issueDate: string;
  role: string;
  workMode?: string;
  startDate: string;
  endDate: string;
  responsibilities?: string[];
  termsAndConditions?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  compensation?: string;
  ndaReference?: string;
  acceptanceEmail?: string;
}

export class DocumentService {
  /**
   * Seed the official Vyorai Offer Letter Template and certificates if missing
   */
  static async seedDefaultTemplatesIfNeeded(adminId: string) {
    await connectDB();

    // Check if Vyorai official template exists
    const vyoraiTemplate = await DocumentTemplate.findOne({
      type: "offer_letter",
      name: "Official Vyorai Offer Letter",
    });

    if (!vyoraiTemplate) {
      await DocumentTemplate.create({
        name: "Official Vyorai Offer Letter",
        type: "offer_letter",
        title: "Internship Offer Letter",
        companyName: "VYORAI",
        signatoryName: "Hritik Jaiswal",
        signatoryTitle: "Founder & CEO — VYORAI",
        pdfTemplatePath: "public/vyorai_base_template.pdf",
        pageDimensions: { width: 1296, height: 1836 },
        dynamicFields: [
          "candidate_name",
          "intern_id",
          "date",
          "role",
          "work_mode",
          "start_date",
          "end_date",
          "responsibilities",
          "stipend",
          "company_name",
          "company_address",
          "company_email",
          "company_phone",
          "company_website",
          "signatory_name",
          "signatory_title",
        ],
        content: `To,
{{candidate_name}},
Subject: Offer Letter for {{role}} ({{work_mode}})

Dear {{candidate_first_name}},
We are pleased to offer you the position of {{role}} at {{company_name}} for the period from {{start_date}} to {{end_date}}.

During your internship, you will be part of our development team. Your key responsibilities will include:
{{responsibilities_bullets}}

You are expected to maintain strict confidentiality and adhere to company policies and professional standards.
An NDA is attached with this offer letter. By accepting this offer, you confirm your agreement to its terms.
This internship does not guarantee permanent employment with {{company_name}}.
Kindly sign and return a copy of this letter to {{acceptance_email}} as confirmation of your acceptance.
We look forward to your contribution and wish you a great learning experience with {{company_name}}`,
        version: 1,
        isActive: true,
        createdByAdminId: adminId,
      });
    }

    const certCount = await DocumentTemplate.countDocuments({ type: "completion_certificate" });
    if (certCount === 0) {
      await DocumentTemplate.create({
        name: "Certificate of Internship Completion",
        type: "completion_certificate",
        title: "Certificate of Internship Completion",
        companyName: "VYORAI",
        signatoryName: "Hritik Jaiswal",
        signatoryTitle: "Founder & CEO — VYORAI",
        content: `This is to certify that

{{intern_name}}
(Intern ID: {{intern_id}})

has successfully completed the full tenure of the Internship Program in the {{department}} department at {{company_name}} from {{start_date}} through {{end_date}}.

During their internship tenure, {{intern_name}} demonstrated outstanding technical aptitude, professional diligence, proactive problem-solving, and exemplary collaboration across cross-functional teams.

We congratulate {{intern_name}} on this achievement and extend our highest recommendations for their future academic and professional endeavors.`,
        version: 1,
        isActive: true,
        createdByAdminId: adminId,
      });
    }
  }

  static renderContent(content: string, vars: Record<string, string>): string {
    let output = content;
    for (const [key, val] of Object.entries(vars)) {
      output = output.replaceAll(`{{${key}}}`, val || "—");
    }
    return output;
  }

  /**
   * Generates the authentic single-page Vyorai Offer Letter with dynamic content
   * overlaying the official Vyorai branding and layout assets.
   */
  static async generateVyoraiOfferLetterPdf(data: VyoraiOfferLetterData): Promise<Buffer> {
    const templateRelPath = path.join(process.cwd(), "public", "vyorai_base_template.pdf");
    if (!fs.existsSync(templateRelPath)) {
      throw new Error(`Master Vyorai template not found at ${templateRelPath}`);
    }

    const templateBytes = fs.readFileSync(templateRelPath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Coordinate conversion from top-left baseline y (25.7pt font with ~21pt ascender)
    const toY = (topY: number) => height - topY - 21.0;
    const black = rgb(0, 0, 0);

    // 1. Intern ID (top-right block)
    const internIdStr = data.internId || "VYOR-26-01";
    page.drawText("Intern Id: ", {
      x: 946.1,
      y: toY(459.5),
      size: 25.7,
      font: timesRoman,
      color: black,
    });
    page.drawText(internIdStr, {
      x: 1042.4,
      y: toY(459.5),
      size: 25.7,
      font: timesBold,
      color: black,
    });

    // 2. Issue Date
    page.drawText("Date: ", {
      x: 109.3,
      y: toY(525.9),
      size: 25.7,
      font: timesRoman,
      color: black,
    });
    page.drawText(data.issueDate || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), {
      x: 165.0,
      y: toY(525.9),
      size: 25.7,
      font: timesBold,
      color: black,
    });

    // 3. To block
    page.drawText("To,", {
      x: 116.0,
      y: toY(586.1),
      size: 25.7,
      font: timesRoman,
      color: black,
    });

    // 4. Candidate Name
    const candidateName = data.candidateName || "Candidate";
    page.drawText(candidateName, {
      x: 116.0,
      y: toY(620.6),
      size: 25.7,
      font: timesBold,
      color: black,
    });
    const candWidth = timesBold.widthOfTextAtSize(candidateName, 25.7);
    page.drawText(",", {
      x: 116.0 + candWidth,
      y: toY(620.6),
      size: 25.7,
      font: timesRoman,
      color: black,
    });

    // 5. Subject Line
    const role = data.role || "Software Development Intern";
    const mode = data.workMode ? ` (${data.workMode})` : " (Remote)";
    const subjPrefix = "Subject: Offer Letter for ";
    page.drawText(subjPrefix, {
      x: 116.0,
      y: toY(655.1),
      size: 25.7,
      font: timesRoman,
      color: black,
    });
    const subjPreW = timesRoman.widthOfTextAtSize(subjPrefix, 25.7);
    page.drawText(role, {
      x: 116.0 + subjPreW,
      y: toY(655.1),
      size: 25.7,
      font: timesBold,
      color: black,
    });
    const roleW = timesBold.widthOfTextAtSize(role, 25.7);
    page.drawText(mode, {
      x: 116.0 + subjPreW + roleW,
      y: toY(655.1),
      size: 25.7,
      font: timesRoman,
      color: black,
    });

    // 6. Salutation (Dear <First Name>,)
    const firstName = candidateName.split(" ")[0] || candidateName;
    page.drawText("Dear ", {
      x: 116.0,
      y: toY(724.1),
      size: 25.7,
      font: timesRoman,
      color: black,
    });
    page.drawText(firstName, {
      x: 172.3,
      y: toY(724.1),
      size: 25.7,
      font: timesBold,
      color: black,
    });
    const firstW = timesBold.widthOfTextAtSize(firstName, 25.7);
    page.drawText(",", {
      x: 172.3 + firstW,
      y: toY(724.1),
      size: 25.7,
      font: timesRoman,
      color: black,
    });

    // 7. Intro Paragraph
    page.drawText(
      `We are pleased to offer you the position of ${role} at VyorAI for the period from`,
      {
        x: 116.0,
        y: toY(758.6),
        size: 25.7,
        font: timesRoman,
        color: black,
      }
    );

    // 8. Period line (<start date> to <end date>.)
    const startDate = data.startDate || "8 April 2026";
    const endDate = data.endDate || "7 July 2026";
    page.drawText(startDate, {
      x: 116.0,
      y: toY(793.1),
      size: 25.7,
      font: timesBold,
      color: black,
    });
    const sW = timesBold.widthOfTextAtSize(startDate, 25.7);
    page.drawText(" to ", {
      x: 116.0 + sW,
      y: toY(793.1),
      size: 25.7,
      font: timesRoman,
      color: black,
    });
    const toW = timesRoman.widthOfTextAtSize(" to ", 25.7);
    page.drawText(endDate, {
      x: 116.0 + sW + toW,
      y: toY(793.1),
      size: 25.7,
      font: timesBold,
      color: black,
    });
    const eW = timesBold.widthOfTextAtSize(endDate, 25.7);
    page.drawText(".", {
      x: 116.0 + sW + toW + eW,
      y: toY(793.1),
      size: 25.7,
      font: timesRoman,
      color: black,
    });

    // 9. Department and Responsibilities lead-in
    page.drawText(
      "During your internship, you will be part of our development team. Your key responsibilities will",
      {
        x: 116.0,
        y: toY(827.6),
        size: 25.7,
        font: timesRoman,
        color: black,
      }
    );
    page.drawText("include:", {
      x: 116.0,
      y: toY(862.1),
      size: 25.7,
      font: timesRoman,
      color: black,
    });

    // 10. Responsibilities Bullet List
    const defaultResponsibilities = [
      "Assisting in the development of web and software applications",
      "Writing clean, efficient, and maintainable code",
      "Supporting debugging, testing, and performance optimization",
      "Collaborating with the team on feature development and system workflows",
      "Participating in code reviews and implementation of best practices",
    ];

    const responsibilities = (data.responsibilities && data.responsibilities.length > 0)
      ? data.responsibilities.slice(0, 5) // Template calibrated for up to 5 clean bullet items
      : defaultResponsibilities;

    const bulletYs = [897.4, 931.9, 966.4, 1000.9, 1035.4];
    responsibilities.forEach((bulletText, idx) => {
      if (idx < bulletYs.length) {
        // Square bullet
        page.drawSquare({
          x: 139.2,
          y: height - (bulletYs[idx] + 16.0),
          size: 7.5,
          color: black,
        });

        // Safe truncation or fit
        let textToDraw = bulletText;
        const maxTextW = 1010;
        if (timesRoman.widthOfTextAtSize(textToDraw, 25.7) > maxTextW) {
          while (timesRoman.widthOfTextAtSize(textToDraw + "...", 25.7) > maxTextW && textToDraw.length > 10) {
            textToDraw = textToDraw.slice(0, -1);
          }
          textToDraw += "...";
        }

        page.drawText(textToDraw, {
          x: 159.7,
          y: toY(bulletYs[idx]),
          size: 25.7,
          font: timesRoman,
          color: black,
        });
      }
    });

    // 11. Confidentiality, NDA, and Closing text
    page.drawText(
      "You are expected to maintain strict confidentiality and adhere to company policies and professional",
      {
        x: 116.0,
        y: toY(1069.1),
        size: 25.7,
        font: timesRoman,
        color: black,
      }
    );
    page.drawText("standards.", {
      x: 116.0,
      y: toY(1103.6),
      size: 25.7,
      font: timesRoman,
      color: black,
    });

    page.drawText(
      "An NDA is attached with this offer letter. By accepting this offer, you confirm your agreement to its",
      {
        x: 116.0,
        y: toY(1138.1),
        size: 25.7,
        font: timesRoman,
        color: black,
      }
    );
    page.drawText("terms.", {
      x: 116.0,
      y: toY(1172.6),
      size: 25.7,
      font: timesRoman,
      color: black,
    });

    page.drawText(
      "This internship does not guarantee permanent employment with VyorAI.",
      {
        x: 116.0,
        y: toY(1207.1),
        size: 25.7,
        font: timesRoman,
        color: black,
      }
    );

    const acceptEmail = data.acceptanceEmail || "hr@vyorai.com";
    page.drawText(
      `Kindly sign and return a copy of this letter to ${acceptEmail} as confirmation of your acceptance.`,
      {
        x: 116.0,
        y: toY(1241.6),
        size: 25.7,
        font: timesRoman,
        color: black,
      }
    );

    page.drawText(
      "We look forward to your contribution and wish you a great learning experience with VyorAI",
      {
        x: 116.0,
        y: toY(1276.1),
        size: 25.7,
        font: timesRoman,
        color: black,
      }
    );

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Fallback / Generic PDF buffer generator for completion certificates or generic templates
   */
  static async generatePdfBuffer(options: GeneratePdfOptions): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    const { width, height } = page.getSize();

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    page.drawRectangle({
      x: 40,
      y: height - 60,
      width: width - 80,
      height: 4,
      color: rgb(0.12, 0.44, 0.88),
    });

    page.drawText(options.companyName.toUpperCase(), {
      x: 40,
      y: height - 50,
      size: 14,
      font: helveticaBold,
      color: rgb(0.09, 0.15, 0.28),
    });

    page.drawText("VYORAI INTERN WORKSPACE SYSTEM", {
      x: 40,
      y: height - 75,
      size: 8,
      font: helvetica,
      color: rgb(0.45, 0.5, 0.6),
    });

    page.drawText(options.title.toUpperCase(), {
      x: 40,
      y: height - 120,
      size: 18,
      font: helveticaBold,
      color: rgb(0.09, 0.15, 0.28),
    });

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
      cursorY -= 8;
    }

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

    page.drawText("Electronically certified document issued via Vyorai. Verification reference on file.", {
      x: 40,
      y: 40,
      size: 7.5,
      font: helvetica,
      color: rgb(0.55, 0.6, 0.7),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Issues a document record and generates the exact PDF buffer.
   */
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
    const issueDateStr = issueDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const variables: Record<string, string> = {
      candidate_name: intern.name,
      candidate_first_name: intern.name.split(" ")[0] || intern.name,
      intern_name: intern.name,
      intern_id: intern.internId || "VYOR-26-01",
      email: intern.email,
      department: intern.department || "General",
      role: intern.designation || "Software Development Intern",
      designation: intern.designation || "Software Development Intern",
      work_mode: "Remote",
      start_date: intern.startDate || "8 April 2026",
      end_date: intern.endDate || "7 July 2026",
      issue_date: issueDateStr,
      company_name: template.companyName,
      company_address: "Vijay Nagar, Indore, Madhya Pradesh, 452010",
      company_email: "official@vyorai.com",
      company_phone: "+91 7067589972",
      company_website: "www.vyorai.com",
      acceptance_email: "hr@vyorai.com",
      signatory_name: template.signatoryName,
      signatory_title: template.signatoryTitle,
      ...(params.customVariables || {}),
    };

    const renderedContent = this.renderContent(template.content, variables);

    let pdfBuffer: Buffer;
    if (template.type === "offer_letter") {
      pdfBuffer = await this.generateVyoraiOfferLetterPdf({
        candidateName: variables.candidate_name,
        internId: variables.intern_id,
        issueDate: variables.issue_date,
        role: variables.role,
        workMode: variables.work_mode,
        startDate: variables.start_date,
        endDate: variables.end_date,
        acceptanceEmail: variables.acceptance_email,
      });
    } else {
      pdfBuffer = await this.generatePdfBuffer({
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
    }

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
        internId: intern.internId || "VYOR-26-01",
        department: intern.department,
      },
      variables,
      renderedContent,
      pdfBase64: pdfBuffer.toString("base64"),
      documentHash,
      status: "issued",
      issueDate,
      issuedByAdminId: params.actor.id,
      issuedByAdminName: params.actor.name,
      signatoryName: template.signatoryName,
      signatoryTitle: template.signatoryTitle,
    });

    return issuedDoc;
  }
}
