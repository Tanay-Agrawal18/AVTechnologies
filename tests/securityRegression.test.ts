import { describe, it, expect, beforeEach, vi } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { validateJwtEnv, getValidatedJwtSecret } from "@/lib/jwtConfig";
import { requireAuth } from "@/lib/apiAuth";
import { ImportService } from "@/services/importService";
import { User } from "@/models/User";
import { connectDB } from "@/lib/db";
import * as XLSX from "xlsx";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/models/User", () => ({
  User: {
    findById: vi.fn(),
    find: vi.fn(),
  },
}));

describe("Comprehensive Security Regression Suite", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  describe("1. JWT Security & Forgery Protection", () => {
    it("fails validation when JWT_SECRET is missing in production", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.JWT_SECRET;

      const res = validateJwtEnv();
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("Missing required JWT_SECRET");
    });

    it("fails validation when JWT_SECRET is under 32 characters in production", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.JWT_SECRET = "short_secret_under_32_chars";

      const res = validateJwtEnv();
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("at least 32 characters long");
    });

    it("fails validation when JWT_SECRET uses an insecure placeholder word in production", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.JWT_SECRET = "default_super_secret_minimum_32_characters_key_2026";

      const res = validateJwtEnv();
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain("insecure placeholder secret");
    });

    it("throws at runtime when starting in production with invalid secret", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.JWT_SECRET;
      delete process.env.NEXT_PHASE;
      delete process.env.npm_lifecycle_event;

      expect(() => getValidatedJwtSecret()).toThrowError(/JWT Configuration error/);
    });

    it("rejects forged token signed with an unauthorized external key", async () => {
      const genuineSecret = new TextEncoder().encode("valid_production_secret_key_at_least_32_chars_long");
      const attackerSecret = new TextEncoder().encode("attacker_rogue_secret_key_at_least_32_chars_long");

      const forgedToken = await new SignJWT({
        id: "attacker_id",
        role: "admin",
        status: "active",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(attackerSecret);

      await expect(jwtVerify(forgedToken, genuineSecret)).rejects.toThrow();
    });
  });

  describe("2. Database Outage & Fail-Closed Authorization (requireAuth)", () => {
    it("fails closed with 503 AUTH_CHECK_FAILED in production during database connectivity outage", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      const { getSession } = await import("@/lib/auth");
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user_123",
        name: "Test User",
        email: "test@example.com",
        role: "admin",
        status: "active",
      });

      // Simulate MongoDB connection failure
      vi.mocked(connectDB).mockRejectedValueOnce(new Error("MongoServerSelectionError: connection timeout"));

      const authResult = await requireAuth(["admin"]);
      expect(authResult.ok).toBe(false);
      if (!authResult.ok) {
        expect(authResult.response.status).toBe(503);
        const data = await authResult.response.json();
        expect(data.code).toBe("AUTH_CHECK_FAILED");
      }
    });

    it("detects database status changes (inactive user with valid JWT) and rejects with 403", async () => {
      const { getSession } = await import("@/lib/auth");
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user_123",
        name: "Deactivated User",
        email: "deactivated@example.com",
        role: "intern",
        status: "active", // Token claims active
      });

      // DB lookup indicates user was deactivated by admin
      vi.mocked(User.findById).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce({
            _id: "user_123",
            role: "intern",
            status: "inactive", // DB is inactive!
          }),
        }),
      } as unknown as ReturnType<typeof User.findById>);

      const authResult = await requireAuth(["intern"]);
      expect(authResult.ok).toBe(false);
      if (!authResult.ok) {
        expect(authResult.response.status).toBe(403);
        const data = await authResult.response.json();
        expect(data.code).toBe("FORBIDDEN");
      }
    });

    it("detects database role demotion (admin changed to intern) and rejects admin access", async () => {
      const { getSession } = await import("@/lib/auth");
      vi.mocked(getSession).mockResolvedValueOnce({
        id: "user_123",
        name: "Demoted User",
        email: "demoted@example.com",
        role: "admin", // Token claims admin
        status: "active",
      });

      // DB indicates user is now an intern
      vi.mocked(User.findById).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce({
            _id: "user_123",
            role: "intern",
            status: "active",
          }),
        }),
      } as unknown as ReturnType<typeof User.findById>);

      const authResult = await requireAuth(["admin"]);
      expect(authResult.ok).toBe(false);
      if (!authResult.ok) {
        expect(authResult.response.status).toBe(403);
      }
    });
  });

  describe("3. Spreadsheet Import Ingestion & Boundary Protection", () => {
    it("rejects spreadsheet imports exceeding MAX_IMPORT_BYTES (5MB)", async () => {
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 100);
      await expect(
        ImportService.parseAndValidateFile(oversizedBuffer, "large.csv")
      ).rejects.toThrow(/exceeds maximum permitted import limit of 5MB/);
    });

    it("rejects spreadsheet imports exceeding MAX_IMPORT_ROWS (500 rows)", async () => {
      // Build a CSV with 505 rows
      const rows = ["Full Name,Email Address,Intern ID"];
      for (let i = 1; i <= 505; i++) {
        rows.push(`Intern ${i},intern${i}@example.com,VYOR-26-${String(i).padStart(3, "0")}`);
      }
      const csvBuffer = Buffer.from(rows.join("\n"), "utf-8");

      await expect(
        ImportService.parseAndValidateFile(csvBuffer, "bulk_505.csv")
      ).rejects.toThrow(/exceeds maximum limit of 500 rows/);
    });

    it("rejects spreadsheet imports exceeding MAX_IMPORT_COLUMNS (20 columns)", async () => {
      // Build a 1-row CSV with 25 columns
      const headers = Array.from({ length: 25 }, (_, i) => `Col_${i + 1}`).join(",");
      const values = Array.from({ length: 25 }, (_, i) => `Val_${i + 1}`).join(",");
      const wideCsv = Buffer.from(`${headers}\n${values}`, "utf-8");

      await expect(
        ImportService.parseAndValidateFile(wideCsv, "wide_table.csv")
      ).rejects.toThrow(/exceeds maximum limit of 20 columns/);
    });

    it("rejects empty spreadsheet imports with no data rows", async () => {
      const emptyCsv = Buffer.from("Full Name,Email Address,Intern ID\n", "utf-8");
      await expect(
        ImportService.parseAndValidateFile(emptyCsv, "empty.csv")
      ).rejects.toThrow(/contains no data rows/);
    });

    it("parses valid template XLSX without evaluating malicious formula macros", async () => {
      vi.mocked(User.find).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue([]),
      } as unknown as ReturnType<typeof User.find>);

      const sampleData = [
        {
          "Full Name": "Alice Tester",
          "Email Address": "alice@example.com",
          "Intern ID": "VYOR-26-01",
          "Department": "Engineering",
        },
      ];
      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const result = await ImportService.parseAndValidateFile(Buffer.from(buffer), "valid.xlsx");
      expect(result.totalRows).toBe(1);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(0);
      expect(result.rows[0].email).toBe("alice@example.com");
    });

    it("rejects malformed CSV syntax with unclosed quote or corrupted delimiter structure", async () => {
      // Unclosed quote causing parse failure
      const malformedCsv = Buffer.from('Full Name,Email Address,Intern ID\n"Alice "Smith",alice@example.com,VYOR-26-01\n', "utf-8");
      await expect(
        ImportService.parseAndValidateFile(malformedCsv, "malformed.csv")
      ).rejects.toThrow(/CSV parsing failed/);
    });

    it("rejects corrupted XLSX workbook structure safely", async () => {
      const corruptedXlsx = Buffer.from("PK\x03\x04corrupted_binary_zip_payload_not_a_valid_workbook");
      await expect(
        ImportService.parseAndValidateFile(corruptedXlsx, "corrupted.xlsx")
      ).rejects.toThrow(/Failed to parse Excel workbook/);
    });

    it("correctly handles case-insensitive and normalized column headers", async () => {
      vi.mocked(User.find).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue([]),
      } as unknown as ReturnType<typeof User.find>);

      const csvData = "name,email,internId,department\nJohn Doe,john.doe@example.com,VYOR-26-02,Sales";
      const result = await ImportService.parseAndValidateFile(Buffer.from(csvData, "utf-8"), "headers.csv");

      expect(result.totalRows).toBe(1);
      expect(result.validRows).toBe(1);
      expect(result.rows[0].name).toBe("John Doe");
      expect(result.rows[0].email).toBe("john.doe@example.com");
      expect(result.rows[0].department).toBe("Sales");
    });
  });
});
