import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { ReportService } from "@/services/reportService";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  const searchParams = req.nextUrl.searchParams;
  const isKpi = searchParams.get("kpi") === "true";
  const isExport = searchParams.get("export") === "csv";

  if (isKpi) {
    const kpis = await ReportService.getKPIStats();
    return NextResponse.json({ kpis });
  }

  const filter = {
    internId: searchParams.get("internId") || undefined,
    status: searchParams.get("status") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    includeArchived: searchParams.get("archived") === "true",
  };

  if (isExport) {
    const csvBuffer = await ReportService.generateTasksCSV(filter);
    const filename = `iwms_tasks_report_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(new Uint8Array(csvBuffer), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const tasks = await ReportService.getFilteredTasks(filter);
  return NextResponse.json({ tasks });
}
