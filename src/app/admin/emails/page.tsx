"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IUser } from "@/types";
import {
  Mail,
  Send,
  Users,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface EmailLogItem {
  _id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  provider: string;
  status: "queued" | "sent" | "delivered" | "failed";
  errorDetails?: string;
  createdAt: string;
}

export default function AdminBulkEmailPage() {
  const [interns, setInterns] = useState<IUser[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [recipientFilter, setRecipientFilter] = useState<"all" | "active" | "selected">("active");
  const [selectedInternIds, setSelectedInternIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const fetchEmailData = async () => {
    setIsLoading(true);
    try {
      const [emailRes, internRes] = await Promise.all([
        fetch("/api/admin/emails"),
        fetch("/api/admin/interns?status=all"),
      ]);

      if (emailRes.ok) {
        const emailData = await emailRes.json();
        setIsConfigured(emailData.isConfigured);
        setProviderName(emailData.providerName);
        setTemplates(emailData.templates || []);
        setLogs(emailData.logs || []);
      }

      if (internRes.ok) {
        const internData = await internRes.json();
        setInterns(internData.interns || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailData();
  }, []);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setMessage(tpl.body);
    }
  };

  const toggleSelectIntern = (id: string) => {
    setSelectedInternIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllInterns = () => {
    if (selectedInternIds.length === interns.length) {
      setSelectedInternIds([]);
    } else {
      setSelectedInternIds(interns.map((i) => i._id));
    }
  };

  // Compute recipient list based on filter
  const targetRecipients = interns.filter((i) => {
    if (recipientFilter === "active") return i.status === "active";
    if (recipientFilter === "selected") return selectedInternIds.includes(i._id);
    return true;
  });

  const handleSendEmails = async () => {
    setIsSending(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientFilter,
          selectedInternIds: recipientFilter === "selected" ? selectedInternIds : undefined,
          templateId: selectedTemplateId || undefined,
          subject,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch email batch");
      }

      setShowConfirmModal(false);
      setStatusMessage({
        type: "success",
        text: `Successfully dispatched emails to ${data.sentCount} recipient(s). (Batch ID: ${data.batchId})`,
      });
      fetchEmailData();
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error sending emails",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Bulk Email Communications"
        description="Compose, template, and dispatch announcements or progress reminders to interns with audit logging"
      />

      <main className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Provider Status Banner */}
        {!isConfigured ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-900">Email Provider Not Configured</h4>
              <p className="text-xs text-amber-700 mt-1">
                Outbound emails require an active provider. Configure SMTP (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono">SMTP_HOST</code>, <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">SMTP_PORT</code>, <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">SMTP_USER</code>, <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">SMTP_PASSWORD</code>) or Resend (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono">RESEND_API_KEY</code>) in your server environment variables.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Connected Outbound Provider: <strong className="uppercase">{providerName}</strong>
            </span>
            <span className="text-emerald-700 font-medium">Ready for dispatch</span>
          </div>
        )}

        {statusMessage && (
          <div
            className={`p-4 rounded-lg text-sm flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-700"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Compose and Preview Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Composer */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" /> Message Composer
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Template:</span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Custom Message</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recipient Audience Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Target Audience ({targetRecipients.length} recipients)
              </label>
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="filter"
                    value="active"
                    checked={recipientFilter === "active"}
                    onChange={() => setRecipientFilter("active")}
                  />
                  <span>Active Interns Only ({interns.filter((i) => i.status === "active").length})</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="filter"
                    value="all"
                    checked={recipientFilter === "all"}
                    onChange={() => setRecipientFilter("all")}
                  />
                  <span>All Intern Roster ({interns.length})</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="filter"
                    value="selected"
                    checked={recipientFilter === "selected"}
                    onChange={() => setRecipientFilter("selected")}
                  />
                  <span>Specific Selection ({selectedInternIds.length})</span>
                </label>
              </div>

              {recipientFilter === "selected" && (
                <div className="border border-slate-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1 bg-slate-50 text-xs mt-2">
                  <div className="flex justify-end pb-1 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={handleSelectAllInterns}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      {selectedInternIds.length === interns.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  {interns.map((i) => (
                    <label
                      key={i._id}
                      className="flex items-center gap-2 p-1 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInternIds.includes(i._id)}
                        onChange={() => toggleSelectIntern(i._id)}
                        className="rounded text-blue-600"
                      />
                      <span className="font-medium text-slate-900">{i.name}</span>
                      <span className="text-slate-500 font-mono text-[11px]">&lt;{i.email}&gt;</span>
                      <span className="text-slate-400 text-[10px]">({i.department || "General"})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Line *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Weekly All-Hands & Progress Review"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Placeholders supported: <code className="text-slate-600 font-mono">{"{{name}}"}</code>,{" "}
                <code className="text-slate-600 font-mono">{"{{intern_id}}"}</code>,{" "}
                <code className="text-slate-600 font-mono">{"{{department}}"}</code>
              </span>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Message Content *
              </label>
              <textarea
                required
                rows={7}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here. All interns receive individually personalized emails..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={!subject.trim() || !message.trim() || targetRecipients.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Review & Send to {targetRecipients.length} Recipient(s)
              </button>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
                <Eye className="w-4 h-4 text-slate-500" /> Live Recipient Preview
              </h4>

              {targetRecipients.length > 0 ? (
                <div className="text-xs space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <p className="text-slate-500">
                      <strong>Sample Recipient:</strong> {targetRecipients[0].name} (
                      {targetRecipients[0].email})
                    </p>
                    <p className="text-slate-500">
                      <strong>Department:</strong> {targetRecipients[0].department || "General"}
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                    <p className="font-bold text-slate-800 text-sm">
                      {subject.replaceAll("{{name}}", targetRecipients[0].name) || "Subject..."}
                    </p>
                    <div className="text-slate-700 whitespace-pre-line leading-relaxed text-xs border-t border-slate-100 pt-2">
                      {message
                        .replaceAll("{{name}}", targetRecipients[0].name)
                        .replaceAll("{{intern_id}}", targetRecipients[0].internId || "AV-SAMPLE")
                        .replaceAll("{{department}}", targetRecipients[0].department || "Engineering") ||
                        "Email body preview will appear here..."}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center italic">
                  No recipients selected.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Outbound Dispatch Logs</h3>
            <span className="text-xs text-slate-500">{logs.length} logged messages</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No emails sent yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">{log.recipientName}</span>
                        <div className="text-[11px] text-slate-400 font-mono">{log.recipientEmail}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate">{log.subject}</td>
                      <td className="py-3 px-4 uppercase font-mono text-[11px] text-slate-500">
                        {log.provider}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                            log.status === "sent" || log.status === "delivered"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Confirm Bulk Email Dispatch</h3>
            <p className="text-xs text-slate-600">
              You are about to send personalized emails to{" "}
              <strong>{targetRecipients.length} intern(s)</strong>.
            </p>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div>
                <strong>Subject:</strong> {subject}
              </div>
              <div>
                <strong>Provider:</strong> <span className="uppercase">{providerName}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendEmails}
                disabled={isSending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isSending ? "Dispatching..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
