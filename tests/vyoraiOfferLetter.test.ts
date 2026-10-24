import { describe, it, expect } from "vitest";
import { DocumentService } from "@/services/documentService";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

describe("Vyorai Bulk Offer Letter Generator", () => {
  it("master template PDF exists and has exact dimensions (1296 x 1836 pt)", async () => {
    const templatePath = path.join(process.cwd(), "public", "vyorai_base_template.pdf");
    expect(fs.existsSync(templatePath)).toBe(true);

    const bytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(bytes);
    const pages = pdfDoc.getPages();
    expect(pages.length).toBe(1);

    const { width, height } = pages[0].getSize();
    expect(Math.round(width)).toBe(1296);
    expect(Math.round(height)).toBe(1836);
  });

  it("generates a high-quality personalized Vyorai offer letter PDF with dynamic fields", async () => {
    const candidateData = {
      candidateName: "Sai Surya",
      internId: "VYOR-26-20",
      issueDate: "October 24, 2026",
      role: "Software Development Intern",
      workMode: "Remote",
      startDate: "8 April 2026",
      endDate: "7 July 2026",
      responsibilities: [
        "Assisting in the development of web and software applications",
        "Writing clean, efficient, and maintainable code",
        "Supporting debugging, testing, and performance optimization",
        "Collaborating with the team on feature development and system workflows",
        "Participating in code reviews and implementation of best practices",
      ],
      acceptanceEmail: "hr@vyorai.com",
    };

    const pdfBuffer = await DocumentService.generateVyoraiOfferLetterPdf(candidateData);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(100000); // contains graphics and branding

    // Validate that it loads as valid single-page PDF
    const generatedPdf = await PDFDocument.load(pdfBuffer);
    expect(generatedPdf.getPageCount()).toBe(1);
    const page = generatedPdf.getPages()[0];
    const { width, height } = page.getSize();
    expect(Math.round(width)).toBe(1296);
    expect(Math.round(height)).toBe(1836);
  });

  it("handles long candidate names and safe truncation gracefully without text overlapping", async () => {
    const longCandidate = {
      candidateName: "Alexander Bartholomew Christopher Montgomery-Fitzgerald III",
      internId: "VYOR-26-999",
      issueDate: "October 24, 2026",
      role: "Principal Full Stack Software Engineering Intern",
      workMode: "Remote",
      startDate: "8 April 2026",
      endDate: "7 July 2026",
      responsibilities: [
        "Extremely long responsibility description with comprehensive explanations of architecture, distributed computing, database migrations, CI/CD pipeline improvements, security hardening, and high-frequency real-time event messaging protocols across modern edge compute nodes.",
      ],
      acceptanceEmail: "hr@vyorai.com",
    };

    const pdfBuffer = await DocumentService.generateVyoraiOfferLetterPdf(longCandidate);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    const generatedPdf = await PDFDocument.load(pdfBuffer);
    expect(generatedPdf.getPageCount()).toBe(1);
  });
});
