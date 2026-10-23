import * as XLSX from "xlsx";
import Papa from "papaparse";
import { CreateInternSchema } from "@/validators";
import { UserService } from "./userService";
import { User } from "@/models/User";
import { connectDB } from "@/lib/db";

export interface ParsedInternRow {
  rowNumber: number;
  name: string;
  email: string;
  internId: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  isValid: boolean;
  errors: string[];
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ParsedInternRow[];
}

export interface ImportExecutionResult {
  total: number;
  successCount: number;
  failureCount: number;
  createdInterns: Array<{
    name: string;
    email: string;
    internId: string;
    activationLink: string;
  }>;
  errors: Array<{
    rowNumber: number;
    email: string;
    internId: string;
    error: string;
  }>;
}

export class ImportService {
  static generateTemplateBuffer(format: "csv" | "xlsx"): Buffer {
    const sampleData = [
      {
        "Full Name": "Alice Johnson",
        "Email Address": "alice.j@example.com",
        "Intern ID": "AV-2026-001",
        "Department": "Engineering",
        "Start Date": "2026-06-01",
        "End Date": "2026-08-31",
      },
      {
        "Full Name": "Bob Smith",
        "Email Address": "bob.s@example.com",
        "Intern ID": "AV-2026-002",
        "Department": "Product Design",
        "Start Date": "2026-06-01",
        "End Date": "2026-08-31",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Interns Template");

    if (format === "csv") {
      const csvString = XLSX.utils.sheet_to_csv(worksheet);
      return Buffer.from(csvString, "utf-8");
    } else {
      const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return Buffer.from(xlsxBuffer);
    }
  }

  static async parseAndValidateFile(
    fileBuffer: Buffer,
    fileName: string
  ): Promise<ImportPreviewResult> {
    await connectDB();
    const isCsv = fileName.toLowerCase().endsWith(".csv");
    let rawRecords: Record<string, unknown>[] = [];

    if (isCsv) {
      const csvText = fileBuffer.toString("utf-8");
      const parsed = Papa.parse<Record<string, unknown>>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });
      rawRecords = parsed.data;
    } else {
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("File contains no sheets");
      }
      const worksheet = workbook.Sheets[firstSheetName];
      rawRecords = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
    }

    const seenEmails = new Set<string>();
    const seenInternIds = new Set<string>();
    const parsedRows: ParsedInternRow[] = [];

    // Fetch existing emails and intern IDs from database for collision detection
    const existingUsers = await User.find(
      {},
      { email: 1, internId: 1 }
    ).lean();

    const dbEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
    const dbInternIds = new Set(existingUsers.map((u) => u.internId).filter(Boolean));

    for (let i = 0; i < rawRecords.length; i++) {
      const row = rawRecords[i];
      const rowNumber = i + 2; // header is row 1
      const rowErrors: string[] = [];

      const name = String(row["Full Name"] || row["name"] || "").trim();
      const email = String(row["Email Address"] || row["email"] || "").trim().toLowerCase();
      const internId = String(row["Intern ID"] || row["internId"] || "").trim();
      const department = String(row["Department"] || row["department"] || "").trim();
      const startDate = String(row["Start Date"] || row["startDate"] || "").trim();
      const endDate = String(row["End Date"] || row["endDate"] || "").trim();

      const validation = CreateInternSchema.safeParse({
        name,
        email,
        internId,
        department,
        startDate,
        endDate,
      });

      if (!validation.success) {
        for (const issue of validation.error.issues) {
          rowErrors.push(issue.message);
        }
      }

      // Check in-file duplicates
      if (email) {
        if (seenEmails.has(email)) {
          rowErrors.push(`Duplicate email in file: ${email}`);
        } else {
          seenEmails.add(email);
        }
      }

      if (internId) {
        if (seenInternIds.has(internId)) {
          rowErrors.push(`Duplicate Intern ID in file: ${internId}`);
        } else {
          seenInternIds.add(internId);
        }
      }

      // Check DB collisions
      if (email && dbEmails.has(email)) {
        rowErrors.push(`Email already exists in system: ${email}`);
      }

      if (internId && dbInternIds.has(internId)) {
        rowErrors.push(`Intern ID already exists in system: ${internId}`);
      }

      parsedRows.push({
        rowNumber,
        name,
        email,
        internId,
        department,
        startDate,
        endDate,
        isValid: rowErrors.length === 0,
        errors: rowErrors,
      });
    }

    const validRows = parsedRows.filter((r) => r.isValid).length;
    const invalidRows = parsedRows.length - validRows;

    return {
      totalRows: parsedRows.length,
      validRows,
      invalidRows,
      rows: parsedRows,
    };
  }

  static async executeImport(
    validRows: ParsedInternRow[],
    baseUrl: string
  ): Promise<ImportExecutionResult> {
    const createdInterns: ImportExecutionResult["createdInterns"] = [];
    const errors: ImportExecutionResult["errors"] = [];

    for (const row of validRows) {
      if (!row.isValid) {
        errors.push({
          rowNumber: row.rowNumber,
          email: row.email,
          internId: row.internId,
          error: row.errors.join("; "),
        });
        continue;
      }

      try {
        const { activationToken } = await UserService.createIntern({
          name: row.name,
          email: row.email,
          internId: row.internId,
          department: row.department,
          startDate: row.startDate,
          endDate: row.endDate,
        });

        const activationLink = `${baseUrl}/setup-password?token=${activationToken}`;

        createdInterns.push({
          name: row.name,
          email: row.email,
          internId: row.internId,
          activationLink,
        });
      } catch (err: unknown) {
        errors.push({
          rowNumber: row.rowNumber,
          email: row.email,
          internId: row.internId,
          error: err instanceof Error ? err.message : "Failed to import row",
        });
      }
    }

    return {
      total: validRows.length,
      successCount: createdInterns.length,
      failureCount: errors.length,
      createdInterns,
      errors,
    };
  }
}
