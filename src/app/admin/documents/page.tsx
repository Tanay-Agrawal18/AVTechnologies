"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IUser } from "@/types";
import {
  Award,
  FileText,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  ShieldCheck,
} from "lucide-react";

interface DocumentTemplateItem {
  _id: string;
  name: string;
  type: string;
  title: string;
  content: string;
  companyName: string;
  signatoryName: string;
  signatoryTitle: string;
  version: number;
}

interface IssuedDocItem {
  _id: string;
  title: string;
  documentType: string;
  documentHash: string;
  recipientSnapshot: {
    name: string;
    email: string;
    internId: string;
    department?: string;
  };
  issueDate: string;
  issuedByAdminName: string;
  signatoryName: string;
}

export default function AdminDocumentsPage() {
  const [templates, setTemplates] = useState<DocumentTemplateItem[]>([]);
  const [interns, setInterns] = useState<IUser[]>([]);
  const [issuedDocs, setIssuedDocs] = useState<IssuedDocItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Issue Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedInternId, setSelectedInternId] = useState("");
  const [customSignatory, setCustomSignatory] = useState("");
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueMessage, setIssueMessage] = useState<{
    type: "success" | "error";
    text: string;
    downloadUrl?: string;
  } | null>(null);

  // Preview Modal
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [docsRes, internsRes] = await Promise.all([
        fetch("/api/admin/documents"),
        fetch("/api/admin/interns?status=all"),
      ]);

      if (docsRes.ok) {
        const data = await docsRes.json();
        setTemplates(data.templates || []);
        setIssuedDocs(data.issuedDocuments || []);
        if (data.templates?.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(data.templates[0]._id);
        }
      }

      if (internsRes.ok) {
        const internData = await internsRes.json();
        setInterns(internData.interns || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedTemplate = templates.find((t) => t._id === selectedTemplateId);
  const selectedIntern = interns.find((i) => i._id === selectedInternId);

  const handlePreview = async () => {
    if (!selectedTemplateId || !selectedInternId) return;

    try {
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          templateId: selectedTemplateId,
          internId: selectedInternId,
          customVariables: customSignatory ? { signatory_name: customSignatory } : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.renderedContent) {
        setPreviewTitle(data.title);
        setPreviewContent(data.renderedContent);
      }
    } catch {
      alert("Failed to generate preview");
    }
  };

  const handleIssue = async () => {
    if (!selectedTemplateId || !selectedInternId) return;
    setIsIssuing(true);
    setIssueMessage(null);

    try {
      const res = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue",
          templateId: selectedTemplateId,
          internId: selectedInternId,
          customVariables: customSignatory ? { signatory_name: customSignatory } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to issue document");
      }

      setIssueMessage({
        type: "success",
        text: `Successfully generated and signed ${data.issuedDocument.title} for ${data.issuedDocument.recipientSnapshot.name}.`,
        downloadUrl: data.issuedDocument.downloadUrl,
      });

      fetchData();
    } catch (err: unknown) {
      setIssueMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error issuing document",
      });
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Official Documents & Certificates"
        description="Issue verified offer letters and completion certificates with immutable hashes and PDF rendering"
      />

      <main className="p-8 space-y-6">
        {issueMessage && (
          <div
            className={`p-4 rounded-xl text-sm flex items-center justify-between ${
              issueMessage.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {issueMessage.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
              <span>{issueMessage.text}</span>
            </div>

            {issueMessage.downloadUrl && (
              <a
                href={issueMessage.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF Now
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Issue Controls Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 pb-3 border-b border-slate-100">
              <Award className="w-5 h-5 text-blue-600" /> Issue New Document
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Template *
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {templates.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} (v{t.version})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Intern *
              </label>
              <select
                value={selectedInternId}
                onChange={(e) => setSelectedInternId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">Select an intern...</option>
                {interns.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.name} ({i.internId || i.email}) — {i.department || "General"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorized Signatory Override (Optional)
              </label>
              <input
                type="text"
                value={customSignatory}
                onChange={(e) => setCustomSignatory(e.target.value)}
                placeholder={selectedTemplate?.signatoryName || "Dr. Vikram Sethi"}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Leave blank to use the template default signatory.
              </span>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!selectedTemplateId || !selectedInternId}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                <Eye className="w-4 h-4" /> Live Preview
              </button>
              <button
                type="button"
                onClick={handleIssue}
                disabled={!selectedTemplateId || !selectedInternId || isIssuing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                {isIssuing ? "Generating..." : "Generate & Sign PDF"}
              </button>
            </div>
          </div>

          {/* Template Details & Placeholder Guide */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="w-5 h-5 text-indigo-600" /> Template Structure & Placeholders
            </h3>

            {selectedTemplate ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">
                      Organization
                    </span>
                    <p className="font-bold text-slate-800">{selectedTemplate.companyName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">
                      Default Signatory
                    </span>
                    <p className="font-bold text-slate-800">
                      {selectedTemplate.signatoryName} ({selectedTemplate.signatoryTitle})
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-700 mb-1">Body Text Template</h4>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {selectedTemplate.content}
                  </pre>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg">
                  <span className="font-bold block mb-1">Interpolated Values Supported:</span>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-blue-800">
                    <span>{"{{intern_name}}"}</span>
                    <span>{"{{intern_id}}"}</span>
                    <span>{"{{department}}"}</span>
                    <span>{"{{start_date}}"}</span>
                    <span>{"{{end_date}}"}</span>
                    <span>{"{{issue_date}}"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center italic">
                Select a template to inspect details.
              </p>
            )}
          </div>
        </div>

        {/* Issued Documents Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Issued Documents Archive</h3>
              <p className="text-xs text-slate-500">
                Official certificates and offer letters generated with cryptographic verification
              </p>
            </div>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
              {issuedDocs.length} issued
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Recipient Intern</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Signatory</th>
                  <th className="py-3 px-4">Integrity Hash</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {issuedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No documents have been issued yet.
                    </td>
                  </tr>
                ) : (
                  issuedDocs.map((doc) => (
                    <tr key={doc._id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {doc.title}
                        <span className="ml-2 text-[10px] text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                          {doc.documentType.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">
                          {doc.recipientSnapshot.name}
                        </span>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {doc.recipientSnapshot.internId}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(doc.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{doc.signatoryName}</td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400 max-w-[120px] truncate">
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          {doc.documentHash.slice(0, 16)}...
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <a
                          href={`/api/documents/${doc._id}/download`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <Download className="w-3.5 h-3.5" /> Download PDF
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {previewContent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">{previewTitle}</h3>
            <p className="text-xs text-slate-500">
              Live text rendering with intern placeholders resolved.
            </p>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs whitespace-pre-wrap leading-relaxed text-slate-800 max-h-80 overflow-y-auto font-sans">
              {previewContent}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewContent(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
