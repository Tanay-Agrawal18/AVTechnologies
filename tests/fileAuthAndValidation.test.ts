import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { validateFileSafety, MAX_UPLOAD_SIZE } from "@/lib/fileValidation";
import { GET as getFileRoute } from "@/app/api/files/[fileKey]/route";
import { POST as uploadFileRoute } from "@/app/api/files/upload/route";
import { NextRequest } from "next/server";
import { Submission } from "@/models/Submission";
import { requireAuth } from "@/lib/apiAuth";
import { getStorageAdapter, resetStorageAdapter } from "@/lib/storage";

vi.mock("@/lib/apiAuth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/models/Submission", () => ({
  Submission: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/lib/storage", () => {
  const mockAdapter = {
    saveFile: vi.fn().mockResolvedValue({ fileKey: "mock-opaque-key-123.pdf", fileSize: 1024 }),
    getFileStream: vi.fn(),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getStorageAdapter: vi.fn(() => mockAdapter),
    resetStorageAdapter: vi.fn(),
  };
});

describe("File Upload and Download Security Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateFileSafety", () => {
    it("validates legitimate PDF with magic bytes %PDF", () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 sample content");
      const res = validateFileSafety(pdfBuffer, "project_report.pdf", "application/pdf");
      expect(res.isValid).toBe(true);
      expect(res.mimeType).toBe("application/pdf");
      expect(res.normalizedName).toBe("project_report.pdf");
    });

    it("rejects file with PDF extension but corrupted/executable magic bytes", () => {
      const maliciousBuffer = Buffer.from("MZThisIsAnExecutableFileContent");
      const res = validateFileSafety(maliciousBuffer, "malicious.pdf", "application/pdf");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("File signature mismatch");
    });

    it("rejects disallowed extensions like .exe, .sh, .html, .js", () => {
      const shBuffer = Buffer.from("#!/bin/bash\necho test");
      const res = validateFileSafety(shBuffer, "script.sh", "text/plain");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("not permitted");
    });

    it("strips path traversal characters in originalFilename", () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 traversal test");
      const res = validateFileSafety(pdfBuffer, "../../etc/passwd.pdf", "application/pdf");
      expect(res.isValid).toBe(true);
      expect(res.normalizedName).not.toContain("..");
      expect(res.normalizedName).not.toContain("/");
    });

    it("rejects binary content disguised with .txt extension", () => {
      const binaryText = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
      const res = validateFileSafety(binaryText, "disguised.txt", "text/plain");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Binary content detected");
    });
  });

  describe("File Download Authorization (/api/files/[fileKey])", () => {
    const mockStorage = getStorageAdapter();

    it("rejects unauthenticated requests", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as unknown as import("next/server").NextResponse,
      });

      const req = new NextRequest("http://localhost:3000/api/files/test-key-1");
      const res = await getFileRoute(req, { params: Promise.resolve({ fileKey: "test-key-1" }) });

      expect(res.status).toBe(401);
    });

    it("rejects malformed fileKey containing path traversal", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: "intern_1", role: "intern", name: "Intern One", email: "intern1@example.com", status: "active" },
      });

      const req = new NextRequest("http://localhost:3000/api/files/..%2F..%2Fetc");
      const res = await getFileRoute(req, { params: Promise.resolve({ fileKey: "../../etc/passwd" }) });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid file key format");
    });

    it("rejects orphaned fileKey not registered to any submission", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: "intern_1", role: "intern", name: "Intern One", email: "intern1@example.com", status: "active" },
      });
      vi.mocked(Submission.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue(null),
      } as unknown as ReturnType<typeof Submission.findOne>);

      const req = new NextRequest("http://localhost:3000/api/files/orphaned-key-999");
      const res = await getFileRoute(req, { params: Promise.resolve({ fileKey: "orphaned-key-999" }) });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Attachment record not found or unlinked");
    });

    it("denies access when intern tries to download another intern's attachment", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: "intern_A", role: "intern", name: "Intern A", email: "internA@example.com", status: "active" },
      });

      vi.mocked(Submission.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue({
          _id: "sub_1",
          internId: "intern_B", // Different intern!
          attachments: [{ fileKey: "key-123", fileName: "work.pdf", mimeType: "application/pdf" }],
        }),
      } as unknown as ReturnType<typeof Submission.findOne>);

      const req = new NextRequest("http://localhost:3000/api/files/key-123");
      const res = await getFileRoute(req, { params: Promise.resolve({ fileKey: "key-123" }) });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Access denied");
    });

    it("allows intern to download their own attachment with security headers", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: "intern_A", role: "intern", name: "Intern A", email: "internA@example.com", status: "active" },
      });

      vi.mocked(Submission.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue({
          _id: "sub_1",
          internId: "intern_A", // Matching intern
          attachments: [{ fileKey: "key-123", fileName: "my_work.pdf", mimeType: "application/pdf" }],
        }),
      } as unknown as ReturnType<typeof Submission.findOne>);

      vi.mocked(mockStorage.getFileStream).mockResolvedValueOnce(Buffer.from("%PDF-1.4 file content"));

      const req = new NextRequest("http://localhost:3000/api/files/key-123");
      const res = await getFileRoute(req, { params: Promise.resolve({ fileKey: "key-123" }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toContain('attachment; filename="my_work.pdf"');
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    });

    it("allows administrator to download any intern's attachment", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: "admin_super", role: "admin", name: "Super Admin", email: "admin@example.com", status: "active" },
      });

      vi.mocked(Submission.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue({
          _id: "sub_1",
          internId: "intern_B",
          attachments: [{ fileKey: "key-123", fileName: "intern_b_work.pdf", mimeType: "application/pdf" }],
        }),
      } as unknown as ReturnType<typeof Submission.findOne>);

      vi.mocked(mockStorage.getFileStream).mockResolvedValueOnce(Buffer.from("%PDF-1.4 file content"));

      const req = new NextRequest("http://localhost:3000/api/files/key-123");
      const res = await getFileRoute(req, { params: Promise.resolve({ fileKey: "key-123" }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toContain('attachment; filename="intern_b_work.pdf"');
    });
  });
});
