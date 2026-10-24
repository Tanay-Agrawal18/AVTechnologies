"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import Papa from "papaparse";
import {
  FileSpreadsheet,
  Upload,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Archive,
  Layers,
  Settings,
  XCircle,
  FileText,
  UserCheck,
  Search,
  Plus,
  Trash2,
} from "lucide-react";

interface CandidateRow {
  id: string;
  name: string;
  email: string;
  internId: string;
  role: string;
  workMode: string;
  startDate: string;
  endDate: string;
  responsibilities: string[];
  status: "valid" | "invalid";
  errors: string[];
}

interface TemplateItem {
  _id: string;
  name: string;
  type: string;
  version: number;
  isActive: boolean;
  companyName: string;
  signatoryName: string;
  signatoryTitle: string;
  pdfTemplatePath?: string;
  pageDimensions?: { width: number; height: number };
  createdAt: string;
}

interface IssuedDocItem {
  _id: string;
  title: string;
  documentType: string;
  documentHash: string;
  status: "issued" | "revoked" | "replaced";
  recipientSnapshot: {
    name: string;
    email: string;
    internId: string;
    department?: string;
  };
  issueDate: string;
  issuedByAdminName: string;
  signatoryName: string;
  templateVersion: number;
  pdfBase64?: string;
}

export default function VyoraiOfferLettersPage() {
  const [activeTab, setActiveTab] = useState<"bulk" | "preview" | "history" | "templates">("bulk");

  // Candidates & Import State
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Stats & History
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [issuedDocs, setIssuedDocs] = useState<IssuedDocItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Processing state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{
    total: number;
    completed: number;
    success: number;
    failed: number;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Template upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateSignatory, setNewTemplateSignatory] = useState("Hritik Jaiswal");
  const [newTemplateTitle, setNewTemplateTitle] = useState("Founder & CEO — VYORAI");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Templates and History
  const loadData = async () => {
    setIsLoadingHistory(true);
    try {
      const [docsRes, templRes] = await Promise.all([
        fetch("/api/admin/documents"),
        fetch("/api/admin/documents/templates"),
      ]);

      if (docsRes.ok) {
        const data = await docsRes.json();
        setIssuedDocs(data.issuedDocuments || []);
      }
      if (templRes.ok) {
        const tData = await templRes.json();
        setTemplates(tData.templates || []);
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to load document records and templates." });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // CSV Template download
  const handleDownloadCsvTemplate = () => {
    const csvContent =
      "Candidate Name,Email,Intern ID,Role,Work Mode,Start Date,End Date,Responsibilities\n" +
      '"Sai Surya","sai.surya@example.com","VYOR-26-20","Software Development Intern","Remote","8 April 2026","7 July 2026","Assisting in the development of web and software applications;Writing clean, efficient, and maintainable code;Supporting debugging, testing, and performance optimization"\n' +
      '"Aarav Sharma","aarav.sharma@example.com","VYOR-26-21","Frontend Engineering Intern","Remote","1 May 2026","31 July 2026","Building reactive UI components;Collaborating with product designers;Writing integration tests"\n';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Vyorai_Offer_Letters_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSV Parsing & Validation
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRows: CandidateRow[] = results.data.map((row, index) => {
          // Normalize column names
          const name = row["Candidate Name"] || row["Full Name"] || row["Name"] || row["candidate_name"] || "";
          const email = row["Email"] || row["Email Address"] || row["candidate_email"] || "";
          const internId =
            row["Intern ID"] || row["Intern Id"] || row["intern_id"] || `VYOR-26-${String(index + 1).padStart(2, "0")}`;
          const role = row["Role"] || row["Job Title"] || row["Designation"] || "Software Development Intern";
          const workMode = row["Work Mode"] || row["Mode"] || "Remote";
          const startDate = row["Start Date"] || row["start_date"] || "8 April 2026";
          const endDate = row["End Date"] || row["end_date"] || "7 July 2026";
          const rawResp = row["Responsibilities"] || "";
          const responsibilities = rawResp
            ? rawResp.split(";").map((s) => s.trim()).filter(Boolean)
            : [];

          const errors: string[] = [];
          if (!name.trim()) errors.push("Candidate name is required");
          if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
            errors.push("Valid email address is required");
          if (!internId.trim()) errors.push("Intern ID is required");

          return {
            id: `cand-${Date.now()}-${index}`,
            name: name.trim(),
            email: email.trim(),
            internId: internId.trim(),
            role: role.trim(),
            workMode: workMode.trim(),
            startDate: startDate.trim(),
            endDate: endDate.trim(),
            responsibilities,
            status: errors.length === 0 ? "valid" : "invalid",
            errors,
          };
        });

        // Check for duplicates
        const seenIds = new Set<string>();
        const seenEmails = new Set<string>();
        parsedRows.forEach((r) => {
          if (seenIds.has(r.internId)) {
            r.status = "invalid";
            r.errors.push(`Duplicate Intern ID (${r.internId}) in batch`);
          }
          if (seenEmails.has(r.email)) {
            r.status = "invalid";
            r.errors.push(`Duplicate email (${r.email}) in batch`);
          }
          seenIds.add(r.internId);
          seenEmails.add(r.email);
        });

        setCandidates(parsedRows);
        // Automatically select all valid candidates
        const validIds = new Set(parsedRows.filter((r) => r.status === "valid").map((r) => r.id));
        setSelectedCandidateIds(validIds);
        setStatusMessage({
          type: "info",
          text: `Parsed ${parsedRows.length} candidates (${validIds.size} valid, ${parsedRows.length - validIds.size} invalid).`,
        });

        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      error: (err) => {
        setStatusMessage({ type: "error", text: `Failed to parse CSV: ${err.message}` });
      },
    });
  };

  // Add individual manual candidate
  const handleAddCandidate = () => {
    const nextIdx = candidates.length + 1;
    const newCand: CandidateRow = {
      id: `cand-${Date.now()}`,
      name: "New Candidate",
      email: `candidate${nextIdx}@example.com`,
      internId: `VYOR-26-${String(nextIdx).padStart(2, "0")}`,
      role: "Software Development Intern",
      workMode: "Remote",
      startDate: "8 April 2026",
      endDate: "7 July 2026",
      responsibilities: [
        "Assisting in the development of web and software applications",
        "Writing clean, efficient, and maintainable code",
      ],
      status: "valid",
      errors: [],
    };
    setCandidates((prev) => [newCand, ...prev]);
    setSelectedCandidateIds((prev) => new Set([...Array.from(prev), newCand.id]));
  };

  // Update candidate field
  const handleUpdateCandidate = (id: string, field: keyof CandidateRow, value: unknown) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        // Revalidate
        const errors: string[] = [];
        if (!updated.name.trim()) errors.push("Candidate name is required");
        if (!updated.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updated.email.trim()))
          errors.push("Valid email address is required");
        if (!updated.internId.trim()) errors.push("Intern ID is required");

        updated.status = errors.length === 0 ? "valid" : "invalid";
        updated.errors = errors;
        return updated;
      })
    );
  };

  // Delete candidate
  const handleDeleteCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Selection toggle
  const toggleSelectAll = () => {
    const valid = candidates.filter((c) => c.status === "valid");
    if (selectedCandidateIds.size === valid.length) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(valid.map((c) => c.id)));
    }
  };

  const toggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Selected candidates list
  const selectedCandidates = useMemo(() => {
    return candidates.filter((c) => selectedCandidateIds.has(c.id));
  }, [candidates, selectedCandidateIds]);

  // Preview Candidate Letter
  const activeCandidate = candidates[currentPreviewIndex];

  const fetchLivePreview = async (candidate: CandidateRow) => {
    setIsPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/documents/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          candidates: [candidate],
        }),
      });

      if (!res.ok) throw new Error("Failed to generate preview PDF");
      const data = await res.json();
      if (data.pdfBase64) {
        setPreviewPdfUrl(`data:application/pdf;base64,${data.pdfBase64}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error generating preview";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "preview" && activeCandidate) {
      fetchLivePreview(activeCandidate);
    }
  }, [activeTab, currentPreviewIndex]);

  // Bulk Generation & ZIP Download
  const handleBulkGenerate = async (downloadZip: boolean = false) => {
    if (selectedCandidates.length === 0) {
      setStatusMessage({ type: "error", text: "Please select at least one valid candidate." });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress({
      total: selectedCandidates.length,
      completed: 0,
      success: 0,
      failed: 0,
    });
    setStatusMessage({ type: "info", text: "Generating official Vyorai offer letters..." });

    try {
      if (downloadZip) {
        // Direct stream ZIP download
        const res = await fetch("/api/admin/documents/bulk-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "download_zip",
            candidates: selectedCandidates,
          }),
        });

        if (!res.ok) throw new Error("Failed to generate ZIP archive");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Vyorai_Offer_Letters_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStatusMessage({
          type: "success",
          text: `Successfully generated and downloaded ZIP of ${selectedCandidates.length} offer letters!`,
        });
      } else {
        const res = await fetch("/api/admin/documents/bulk-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "generate",
            candidates: selectedCandidates,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Bulk generation failed");

        setStatusMessage({
          type: "success",
          text: `Generated ${data.successCount} of ${data.total} offer letters successfully.`,
        });
      }

      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  // Revoke an issued document
  const handleRevokeDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to revoke this issued offer letter? This action will be audited."))
      return;

    try {
      const res = await fetch("/api/admin/documents/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: docId,
          action: "revoke",
          reason: "Revoked by Administrator request",
        }),
      });

      if (!res.ok) throw new Error("Failed to revoke document");
      setStatusMessage({ type: "success", text: "Offer letter successfully revoked." });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error revoking document";
      setStatusMessage({ type: "error", text: msg });
    }
  };

  // Activate a template version
  const handleActivateTemplate = async (templateId: string) => {
    try {
      const res = await fetch("/api/admin/documents/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: templateId,
          isActive: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to activate template");
      setStatusMessage({ type: "success", text: "Template activated as current master." });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error activating template";
      setStatusMessage({ type: "error", text: msg });
    }
  };

  // Upload new template version
  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFile || !newTemplateName) {
      setStatusMessage({ type: "error", text: "Please provide a template name and select a PDF." });
      return;
    }

    setIsUploadingTemplate(true);
    try {
      const fd = new FormData();
      fd.append("file", templateFile);
      fd.append("name", newTemplateName);
      fd.append("type", "offer_letter");
      fd.append("signatoryName", newTemplateSignatory);
      fd.append("signatoryTitle", newTemplateTitle);

      const res = await fetch("/api/admin/documents/templates", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload template");
      }

      setStatusMessage({ type: "success", text: "New template version uploaded successfully." });
      setIsUploadModalOpen(false);
      setNewTemplateName("");
      setTemplateFile(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error uploading template";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsUploadingTemplate(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return issuedDocs.filter((d) => {
      const matchesSearch =
        d.recipientSnapshot?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.recipientSnapshot?.internId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.title?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [issuedDocs, searchTerm]);

  // Dashboard Stats
  const stats = useMemo(() => {
    const totalIssued = issuedDocs.filter((d) => d.status === "issued").length;
    const totalRevoked = issuedDocs.filter((d) => d.status === "revoked").length;
    return {
      total: issuedDocs.length,
      issued: totalIssued,
      revoked: totalRevoked,
      templatesCount: templates.length,
    };
  }, [issuedDocs, templates]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen">
      <DashboardHeader
        title="Vyorai Bulk Offer Letter Generator"
        description="Generate, calibrate, preview, and issue canonical Vyorai offer letters in bulk or individually."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsvTemplate}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV Template
            </button>
            <button
              onClick={() => handleBulkGenerate(true)}
              disabled={isGenerating || selectedCandidates.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-xs transition"
            >
              <Archive className="w-3.5 h-3.5" />
              Generate & Download ZIP ({selectedCandidates.length})
            </button>
          </div>
        }
      />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Status notification */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : statusMessage.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <div className="flex items-center gap-3 text-sm font-medium">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : statusMessage.type === "error" ? (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              ) : (
                <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-semibold uppercase hover:opacity-75"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Generated</span>
              <FileCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">Immutable offer records</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Letters</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.issued}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Officially verified</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revoked</span>
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.revoked}</p>
            <p className="text-xs text-slate-500 mt-1">Replaced or cancelled</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Master Templates</span>
              <Layers className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{stats.templatesCount}</p>
            <p className="text-xs text-amber-600 font-medium mt-1">Vyorai Master v1 Active</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("bulk")}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === "bulk"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Import & Calibrate ({candidates.length})
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            disabled={candidates.length === 0}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === "preview"
                ? "border-indigo-600 text-indigo-600"
                : candidates.length === 0
                ? "border-transparent text-slate-300 cursor-not-allowed"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className="w-4 h-4" />
            Live Master PDF Preview
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === "history"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Archive className="w-4 h-4" />
            Issued Documents History ({issuedDocs.length})
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === "templates"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Settings className="w-4 h-4" />
            Template Management
          </button>
        </div>

        {/* TAB 1: BULK IMPORT & CALIBRATION */}
        {activeTab === "bulk" && (
          <div className="space-y-6">
            {/* Upload Zone */}
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-indigo-400 transition">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Upload Candidates CSV</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload your spreadsheet with candidates to generate personalized Vyorai offer letters.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                    id="csv-file-input"
                  />
                  <label
                    htmlFor="csv-file-input"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
                  >
                    Select CSV File
                  </label>
                  <button
                    onClick={handleAddCandidate}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Single Row
                  </button>
                </div>
              </div>
            </div>

            {/* Candidates Table */}
            {candidates.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={
                        selectedCandidateIds.size > 0 &&
                        selectedCandidateIds.size === candidates.filter((c) => c.status === "valid").length
                      }
                      onChange={toggleSelectAll}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Selected {selectedCandidateIds.size} of {candidates.length} candidates
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkGenerate(false)}
                      disabled={isGenerating || selectedCandidates.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Issue Selected ({selectedCandidates.length})
                    </button>
                    <button
                      onClick={() => handleBulkGenerate(true)}
                      disabled={isGenerating || selectedCandidates.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download ZIP
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                        <th className="p-3 w-10 text-center"></th>
                        <th className="p-3">Candidate Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Intern ID</th>
                        <th className="p-3">Role / Designation</th>
                        <th className="p-3">Tenure (Start - End)</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {candidates.map((cand, idx) => (
                        <tr key={cand.id} className="hover:bg-slate-50/60 transition">
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              disabled={cand.status === "invalid"}
                              checked={selectedCandidateIds.has(cand.id)}
                              onChange={() => toggleSelectCandidate(cand.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 disabled:opacity-30"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={cand.name}
                              onChange={(e) => handleUpdateCandidate(cand.id, "name", e.target.value)}
                              className="w-full font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-hidden px-1 py-0.5 rounded"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="email"
                              value={cand.email}
                              onChange={(e) => handleUpdateCandidate(cand.id, "email", e.target.value)}
                              className="w-full text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-hidden px-1 py-0.5 rounded"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={cand.internId}
                              onChange={(e) => handleUpdateCandidate(cand.id, "internId", e.target.value)}
                              className="w-full font-mono text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-hidden px-1 py-0.5 rounded"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={cand.role}
                              onChange={(e) => handleUpdateCandidate(cand.id, "role", e.target.value)}
                              className="w-full text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-hidden px-1 py-0.5 rounded"
                            />
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="text-slate-600">
                              {cand.startDate} — {cand.endDate}
                            </span>
                          </td>
                          <td className="p-3">
                            {cand.status === "valid" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span
                                title={cand.errors.join("; ")}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 cursor-help"
                              >
                                <AlertCircle className="w-3 h-3" /> Error
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap space-x-2">
                            <button
                              onClick={() => {
                                setCurrentPreviewIndex(idx);
                                setActiveTab("preview");
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => handleDeleteCandidate(cand.id)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE MASTER PDF PREVIEW & FIELD CALIBRATION */}
        {activeTab === "preview" && activeCandidate && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Candidate Editor Panel */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Dynamic Letter Calibration</h3>
                  <p className="text-xs text-slate-500">
                    Candidate {currentPreviewIndex + 1} of {candidates.length}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPreviewIndex === 0}
                    onClick={() => setCurrentPreviewIndex((p) => Math.max(0, p - 1))}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    disabled={currentPreviewIndex === candidates.length - 1}
                    onClick={() => setCurrentPreviewIndex((p) => Math.min(candidates.length - 1, p + 1))}
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Candidate Full Name</label>
                  <input
                    type="text"
                    value={activeCandidate.name}
                    onChange={(e) => handleUpdateCandidate(activeCandidate.id, "name", e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Intern ID</label>
                  <input
                    type="text"
                    value={activeCandidate.internId}
                    onChange={(e) => handleUpdateCandidate(activeCandidate.id, "internId", e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Position / Role</label>
                  <input
                    type="text"
                    value={activeCandidate.role}
                    onChange={(e) => handleUpdateCandidate(activeCandidate.id, "role", e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Start Date</label>
                    <input
                      type="text"
                      value={activeCandidate.startDate}
                      onChange={(e) => handleUpdateCandidate(activeCandidate.id, "startDate", e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">End Date</label>
                    <input
                      type="text"
                      value={activeCandidate.endDate}
                      onChange={(e) => handleUpdateCandidate(activeCandidate.id, "endDate", e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Key Responsibilities (One per line)</label>
                  <textarea
                    rows={4}
                    value={activeCandidate.responsibilities.join("\n")}
                    onChange={(e) =>
                      handleUpdateCandidate(
                        activeCandidate.id,
                        "responsibilities",
                        e.target.value.split("\n").filter(Boolean)
                      )
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-mono text-[11px] focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => fetchLivePreview(activeCandidate)}
                    disabled={isPreviewLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPreviewLoading ? "animate-spin" : ""}`} />
                    Refresh Preview
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCandidateIds(new Set([activeCandidate.id]));
                      handleBulkGenerate(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Issue This Letter
                  </button>
                </div>
              </div>
            </div>

            {/* Right: PDF Viewer Frame */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[750px]">
              <div className="p-3 bg-slate-900 text-slate-200 text-xs font-semibold flex items-center justify-between">
                <span>Vyorai Official Master Template Rendering</span>
                <span className="text-[11px] font-mono text-slate-400">1296 x 1836 pt · Pixel Accurate</span>
              </div>
              <div className="flex-1 bg-slate-200 relative flex items-center justify-center p-2">
                {isPreviewLoading && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
                    <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Rendering Vyorai PDF...
                    </div>
                  </div>
                )}
                {previewPdfUrl ? (
                  <iframe
                    src={previewPdfUrl}
                    className="w-full h-full rounded shadow-sm border border-slate-300"
                    title="Letter Preview"
                  />
                ) : (
                  <div className="text-center text-slate-500">
                    <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-xs">Click Refresh Preview to render this candidate&apos;s letter.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ISSUED DOCUMENTS HISTORY & ACTIONS */}
        {activeTab === "history" && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search candidate name, intern ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh List
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="p-3">Candidate / Recipient</th>
                    <th className="p-3">Intern ID</th>
                    <th className="p-3">Issue Date</th>
                    <th className="p-3">Template Version</th>
                    <th className="p-3">Document Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No issued offer letters found matching the search.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((doc) => (
                      <tr key={doc._id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{doc.recipientSnapshot?.name}</p>
                          <p className="text-[11px] text-slate-500">{doc.recipientSnapshot?.email}</p>
                        </td>
                        <td className="p-3 font-mono text-slate-700">{doc.recipientSnapshot?.internId || "—"}</td>
                        <td className="p-3 text-slate-600">
                          {new Date(doc.issueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-3 text-slate-600">Master v{doc.templateVersion || 1}</td>
                        <td className="p-3">
                          {doc.status === "issued" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <XCircle className="w-3 h-3" /> Revoked
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap space-x-2">
                          <a
                            href={`/api/documents/${doc._id}/download`}
                            download
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </a>
                          {doc.status === "issued" && (
                            <button
                              onClick={() => handleRevokeDocument(doc._id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TEMPLATE MANAGEMENT */}
        {activeTab === "templates" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Master Offer Letter Templates</h3>
                <p className="text-xs text-slate-500">
                  Versioned PDF masters. Previously issued letters remain pinned to their creation version.
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload New Master PDF Version
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((t) => (
                <div
                  key={t._id}
                  className={`bg-white rounded-xl border p-5 shadow-xs space-y-4 flex flex-col justify-between ${
                    t.isActive ? "border-indigo-500 ring-2 ring-indigo-500/10" : "border-slate-200/80"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          v{t.version}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1.5">{t.name}</h4>
                        <p className="text-xs text-slate-500">{t.companyName}</p>
                      </div>
                      {t.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Active Master
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Archived</span>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                      <p>
                        <span className="font-semibold">Signatory:</span> {t.signatoryName}
                      </p>
                      <p>
                        <span className="font-semibold">Title:</span> {t.signatoryTitle}
                      </p>
                      <p>
                        <span className="font-semibold">Page Size:</span>{" "}
                        {t.pageDimensions ? `${t.pageDimensions.width} x ${t.pageDimensions.height} pt` : "A4 Standard"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href="/vyorai_base_template.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Preview Asset
                    </a>

                    {!t.isActive && (
                      <button
                        onClick={() => handleActivateTemplate(t._id)}
                        className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 transition"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Upload Template Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Upload New PDF Template</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadTemplate} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Official Vyorai Offer Letter 2026 Q3"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Authorized Signatory Name</label>
                <input
                  type="text"
                  value={newTemplateSignatory}
                  onChange={(e) => setNewTemplateSignatory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Signatory Title</label>
                <input
                  type="text"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">PDF File (Must be valid PDF)</label>
                <input
                  type="file"
                  required
                  accept=".pdf"
                  onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingTemplate}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {isUploadingTemplate ? "Uploading..." : "Upload Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
