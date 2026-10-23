import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";
import { connectDB } from "@/lib/db";
import { EmailLog } from "@/models/EmailLog";
import { User } from "@/models/User";
import { EmailService, EMAIL_TEMPLATES } from "@/services/emailService";
import { z } from "zod";

const SendBulkEmailSchema = z.object({
  recipientFilter: z.enum(["all", "active", "selected"]).default("selected"),
  selectedInternIds: z.array(z.string()).optional(),
  templateId: z.string().optional(),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters"),
  message: z.string().trim().min(5, "Message must be at least 5 characters"),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  await connectDB();

  const isConfigured = EmailService.isConfigured();
  const providerName = EmailService.getProviderName();

  const recentLogs = await EmailLog.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    isConfigured,
    providerName,
    templates: EMAIL_TEMPLATES,
    logs: recentLogs,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = SendBulkEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    if (!EmailService.isConfigured()) {
      return NextResponse.json(
        {
          error:
            "No email provider is currently configured. To send emails, configure SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD) or Resend (RESEND_API_KEY) in server environment variables.",
          isConfigured: false,
        },
        { status: 503 }
      );
    }

    await connectDB();

    // Query recipients based on filter
    const query: Record<string, unknown> = { role: "intern" };

    if (parsed.data.recipientFilter === "active") {
      query.status = "active";
    } else if (parsed.data.recipientFilter === "selected") {
      if (!parsed.data.selectedInternIds || parsed.data.selectedInternIds.length === 0) {
        return NextResponse.json(
          { error: "Please select at least one recipient intern" },
          { status: 400 }
        );
      }
      query._id = { $in: parsed.data.selectedInternIds };
    }

    const interns = await User.find(query).lean();
    if (interns.length === 0) {
      return NextResponse.json(
        { error: "No matching intern recipients found for the selected criteria" },
        { status: 400 }
      );
    }

    const recipients = interns.map((i) => ({
      id: i._id.toString(),
      name: i.name,
      email: i.email,
      department: i.department,
      internId: i.internId,
    }));

    const result = await EmailService.sendBulkEmail({
      recipients,
      subject: parsed.data.subject,
      message: parsed.data.message,
      adminId: auth.user.id,
      templateId: parsed.data.templateId,
    });

    return NextResponse.json({
      success: true,
      batchId: result.batchId,
      totalCount: result.totalCount,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      results: result.results,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to dispatch bulk email";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
