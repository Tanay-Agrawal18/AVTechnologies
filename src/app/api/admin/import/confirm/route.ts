import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { ImportService, ParsedInternRow } from "@/services/importService";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const rows: ParsedInternRow[] = body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided for confirmation" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const result = await ImportService.executeImport(rows, baseUrl);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Bulk import execution failed";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
