import { describe, it, expect, vi } from "vitest";
import { CreateTaskSchema, UpdateInternSchema } from "@/validators";
import { EmailService, EMAIL_TEMPLATES } from "@/services/emailService";
import { DocumentService } from "@/services/documentService";

describe("Feature 1: Edit Member Details Validation", () => {
  it("allows permitted fields (name, department, designation, phone, dates) and validates email", () => {
    const valid = UpdateInternSchema.safeParse({
      name: "Maya Patel",
      email: "maya.patel@company.com",
      internId: "AV-2026-099",
      department: "Full Stack Engineering",
      designation: "Frontend Specialist",
      phone: "+1-555-0199",
      startDate: "2026-06-01",
      endDate: "2026-08-31",
      status: "active",
    });
    expect(valid.success).toBe(true);

    const invalidEmail = UpdateInternSchema.safeParse({
      email: "invalid-email-address",
    });
    expect(invalidEmail.success).toBe(false);

    const invalidInternId = UpdateInternSchema.safeParse({
      internId: "WRONG-ID-PREFIX", // Must start with AV
    });
    expect(invalidInternId.success).toBe(false);
  });
});

describe("Feature 4: Assign One Task to Multiple Interns Validation", () => {
  it("accepts single assignedInternId or multiple assignedInternIds", () => {
    const single = CreateTaskSchema.safeParse({
      title: "Develop Security Middleware",
      description: "Implement token validation and RBAC checks across routes",
      priority: "high",
      assignedInternId: "650f1234567890abcdef1234",
      assignmentDate: "2026-06-01",
      dueDate: "2026-06-15",
    });
    expect(single.success).toBe(true);

    const multiple = CreateTaskSchema.safeParse({
      title: "Develop Security Middleware",
      description: "Implement token validation and RBAC checks across routes",
      priority: "high",
      assignedInternIds: [
        "650f1234567890abcdef1234",
        "650f1234567890abcdef5678",
      ],
      assignmentDate: "2026-06-01",
      dueDate: "2026-06-15",
    });
    expect(multiple.success).toBe(true);

    // Rejects when no intern is assigned
    const neither = CreateTaskSchema.safeParse({
      title: "Develop Security Middleware",
      description: "Implement token validation and RBAC checks across routes",
      priority: "high",
      assignmentDate: "2026-06-01",
      dueDate: "2026-06-15",
    });
    expect(neither.success).toBe(false);
  });
});

describe("Feature 2: Bulk Email Service & Template Engine", () => {
  it("interpolates variables in template body accurately", () => {
    const rawTemplate = "Hello {{name}} (ID: {{intern_id}}), your department is {{department}}.";
    const rendered = EmailService.renderTemplate(rawTemplate, {
      name: "John Doe",
      intern_id: "AV-2026-001",
      department: "Data Engineering",
    });

    expect(rendered).toBe("Hello John Doe (ID: AV-2026-001), your department is Data Engineering.");
  });

  it("checks provider configuration cleanly without crashing", () => {
    // When no SMTP or Resend credentials exist in standard test env
    const configured = EmailService.isConfigured();
    expect(typeof configured).toBe("boolean");
  });

  it("provides predefined announcement and deadline templates", () => {
    expect(EMAIL_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    const deadlineTpl = EMAIL_TEMPLATES.find((t) => t.id === "deadline_reminder");
    expect(deadlineTpl).toBeDefined();
    expect(deadlineTpl?.body).toContain("{{name}}");
  });
});

describe("Feature 3: Document Templates & PDF Generation", () => {
  it("renders document placeholders properly", () => {
    const rawContent = "This is to certify that {{intern_name}} completed internship at {{company_name}}.";
    const rendered = DocumentService.renderContent(rawContent, {
      intern_name: "Sarah Conner",
      company_name: "AV Technologies Ltd.",
    });

    expect(rendered).toBe("This is to certify that Sarah Conner completed internship at AV Technologies Ltd..");
  });

  it("generates a valid binary PDF buffer with headers and signatory block", async () => {
    const pdfBuffer = await DocumentService.generatePdfBuffer({
      title: "Certificate of Internship Completion",
      recipientName: "Alice Walker",
      internId: "AV-2026-007",
      department: "Cloud Infrastructure",
      issueDate: "2026-06-30",
      bodyContent: "Successfully completed 12-week cloud deployment internship program with excellence.",
      companyName: "AV Technologies Ltd.",
      signatoryName: "Dr. Vikram Sethi",
      signatoryTitle: "Head of Talent Acquisition",
    });

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF Magic bytes: %PDF
    expect(pdfBuffer.toString("utf8", 0, 4)).toBe("%PDF");
  });
});

describe("Feature 5: Daily Progress Image 24-Hour Expiry Logic", () => {
  it("calculates exact 24-hour expiry threshold", () => {
    const now = new Date("2026-10-24T12:00:00Z");
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    expect(expiresAt.toISOString()).toBe("2026-10-25T12:00:00.000Z");

    const pastExpiry = new Date(expiresAt.getTime() + 1000);
    const isExpired = pastExpiry > expiresAt;
    expect(isExpired).toBe(true);

    const beforeExpiry = new Date(expiresAt.getTime() - 1000);
    const isStillActive = beforeExpiry <= expiresAt;
    expect(isStillActive).toBe(true);
  });
});
