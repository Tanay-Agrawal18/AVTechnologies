import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { ImportService } from "@/services/importService";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const buffer = ImportService.generateTemplateBuffer(format);

  const contentType =
    format === "csv"
      ? "text/csv; charset=utf-8"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const filename = `interns_import_template.${format}`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name;
    const isCsv = fileName.toLowerCase().endsWith(".csv");
    const isXlsx = fileName.toLowerCase().endsWith(".xlsx");

    if (!isCsv && !isXlsx) {
      return NextResponse.json(
        { error: "Invalid file type. Only .csv and .xlsx files are supported." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const preview = await ImportService.parseAndValidateFile(buffer, fileName);

    return NextResponse.json({
      success: true,
      fileName,
      preview,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to process import file";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
