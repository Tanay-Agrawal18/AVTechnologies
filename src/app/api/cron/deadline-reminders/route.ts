import { NextRequest, NextResponse } from "next/server";
import { DeadlineReminderService } from "@/services/deadlineReminderService";

export async function POST(req: NextRequest) {
  // Fail closed if CRON_SECRET is not configured on the server
  const cronSecret = process.env.CRON_SECRET || process.env.CLEANUP_JOB_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server CRON_SECRET is not configured. Endpoint is disabled." },
      { status: 500 }
    );
  }

  // Enforce Bearer token authorization
  const authHeader = req.headers.get("authorization");
  const expectedHeader = `Bearer ${cronSecret}`;
  if (!authHeader || authHeader !== expectedHeader) {
    return NextResponse.json(
      { error: "Unauthorized cron invocation" },
      { status: 401 }
    );
  }

  try {
    let hoursAhead = 24;
    try {
      const body = await req.json();
      if (typeof body.hoursAhead === "number" && body.hoursAhead > 0) {
        hoursAhead = body.hoursAhead;
      }
    } catch {
      // Body is optional; fallback to default 24h
    }

    const summary = await DeadlineReminderService.processDeadlineReminders(hoursAhead);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Deadline reminder execution failed";
    console.error("[POST /api/cron/deadline-reminders] Error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
