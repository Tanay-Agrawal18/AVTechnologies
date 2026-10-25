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

  static readonly MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB
  static readonly MAX_IMPORT_ROWS = 500; // max 500 records per batch
  static readonly MAX_IMPORT_COLUMNS = 20;

  static async parseAndValidateFile(
    fileBuffer: Buffer,
    fileName: string
  ): Promise<ImportPreviewResult> {
    if (fileBuffer.length > this.MAX_IMPORT_BYTES) {
      throw new Error(`File size exceeds maximum permitted import limit of 5MB.`);
    }

    await connectDB();
    const isCsv = fileName.toLowerCase().endsWith(".csv");
    let rawRecords: Record<string, unknown>[] = [];

    if (isCsv) {
      const csvText = fileBuffer.toString("utf-8");
      const parsed = Papa.parse<Record<string, unknown>>(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (h) => h.trim(),
      });

      // Reject malformed CSV if Papa.parse detects critical structure/quote errors
      const criticalErrors = (parsed.errors || []).filter(
        (e) => e.type !== "FieldMismatch" || e.code === "TooManyFields" || e.code === "TooFewFields"
      );
      if (criticalErrors.length > 0) {
        const errorDetail = criticalErrors[0].message || "Malformed CSV syntax";
        throw new Error(`CSV parsing failed: ${errorDetail}`);
      }

      rawRecords = parsed.data;
    } else {
      // XLSX safe options: ignore formulas to prevent formula evaluation during parse, dense mode for memory safety
      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(fileBuffer, {
          type: "buffer",
          cellFormula: false,
          cellHTML: false,
          dense: true,
        });
      } catch {
        throw new Error("Failed to parse Excel workbook: file structure may be corrupted or unsupported.");
      }

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("File contains no sheets");
      }
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        throw new Error("Worksheet could not be read");
      }

      // Check worksheet range dimension bounds if present
      const ref = worksheet["!ref"];
      if (ref) {
        const range = XLSX.utils.decode_range(ref);
        const rowSpan = range.e.r - range.s.r + 1;
        const colSpan = range.e.c - range.s.c + 1;
        if (rowSpan > this.MAX_IMPORT_ROWS + 10) {
          throw new Error(`Worksheet dimensions (${rowSpan} rows) exceed the maximum permitted row limit of ${this.MAX_IMPORT_ROWS}.`);
        }
        if (colSpan > this.MAX_IMPORT_COLUMNS) {
          throw new Error(`Worksheet dimensions (${colSpan} columns) exceed the maximum permitted column limit of ${this.MAX_IMPORT_COLUMNS}.`);
        }
      }

      rawRecords = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
    }

    if (rawRecords.length === 0) {
      throw new Error("The uploaded spreadsheet contains no data rows.");
    }

    if (rawRecords.length > this.MAX_IMPORT_ROWS) {
      throw new Error(
        `File exceeds maximum limit of ${this.MAX_IMPORT_ROWS} rows. Found ${rawRecords.length} rows. Please split the batch into smaller files.`
      );
    }

    // Enforce column count limit against wide-table / decompression attacks
    const firstRowColumns = Object.keys(rawRecords[0] || {});
    if (firstRowColumns.length > this.MAX_IMPORT_COLUMNS) {
      throw new Error(
        `File exceeds maximum limit of ${this.MAX_IMPORT_COLUMNS} columns. Found ${firstRowColumns.length} columns.`
      );
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

      // Case-insensitive / normalized lookup for supported column headers
      const normalizedRow: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        normalizedRow[key.toLowerCase().trim().replace(/[\s_-]+/g, "")] = val;
      }

      const getVal = (...keys: string[]): string => {
        for (const k of keys) {
          const normKey = k.toLowerCase().replace(/[\s_-]+/g, "");
          if (normKey in normalizedRow && normalizedRow[normKey] !== undefined && normalizedRow[normKey] !== null) {
            return String(normalizedRow[normKey]).trim();
          }
        }
        return "";
      };

      const name = getVal("Full Name", "FullName", "Name");
      const email = getVal("Email Address", "EmailAddress", "Email").toLowerCase();
      const internId = getVal("Intern ID", "InternId", "ID");
      const department = getVal("Department", "Dept");
      const startDate = getVal("Start Date", "StartDate");
      const endDate = getVal("End Date", "EndDate");

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
        const { intern, activationToken } = await UserService.createIntern({
          name: row.name,
          email: row.email,
          internId: row.internId || undefined,
          department: row.department,
          startDate: row.startDate,
          endDate: row.endDate,
        });

        const activationLink = `${baseUrl}/setup-password?token=${activationToken}`;

        createdInterns.push({
          name: row.name,
          email: row.email,
          internId: intern.internId || row.internId,
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
