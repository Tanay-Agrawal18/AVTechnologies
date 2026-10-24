"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ImportPreviewResult, ImportExecutionResult } from "@/services/importService";
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  AlertCircle,
  KeyRound,
} from "lucide-react";

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setImportResult(null);
      setError(null);
    }
  };

  const handleValidateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Validation failed");
      }

      setPreview(data.preview);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to validate file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview) return;

    const validRows = preview.rows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert("There are no valid rows to import.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      setImportResult(data.result);
      setPreview(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import execution failed");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadErrorReport = () => {
    if (!importResult && !preview) return;

    const errorsToExport = preview
      ? preview.rows.filter((r) => !r.isValid).map((r) => ({
          Row: r.rowNumber,
          Name: r.name,
          Email: r.email,
          InternId: r.internId,
          Errors: r.errors.join("; "),
        }))
      : (importResult?.errors || []).map((e) => ({
          Row: e.rowNumber,
          Email: e.email,
          InternId: e.internId,
          Errors: e.error,
        }));

    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Row,Name,Email,InternId,Errors"]
        .concat(
          errorsToExport.map(
            (e) =>
              `"${e.Row}","${("Name" in e ? e.Name : "") || ""}","${e.Email || ""}","${e.InternId || ""}","${e.Errors}"`
          )
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <DashboardHeader
        title="Bulk Intern Onboarding"
        description="Upload CSV or Excel spreadsheets to parse, validate, and onboard cohorts securely"
      />

      <main className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Instructions & Template Downloads */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Standardized Import Formats</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Ensure headers match the template. Plaintext passwords are strictly rejected; each intern will be provisioned with an individual, one-time expiring activation link.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full md:w-auto">
            <a
              href="/api/admin/import?format=csv"
              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-center"
            >
              <Download className="w-4 h-4 text-slate-500 shrink-0" /> Download CSV
            </a>
            <a
              href="/api/admin/import?format=xlsx"
              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-center"
            >
              <Download className="w-4 h-4 text-slate-500 shrink-0" /> Download XLSX
            </a>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <form onSubmit={handleValidateFile} className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <label htmlFor="file-upload" className="cursor-pointer font-semibold text-blue-600 hover:text-blue-700">
                <span>Select file to upload</span>
                <input
                  id="file-upload"
                  name="file"
                  type="file"
                  accept=".csv,.xlsx"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
              <p className="text-xs text-slate-500 mt-1">Supported formats: .CSV, .XLSX (up to 10MB)</p>
              {file && (
                <p className="text-sm font-semibold text-slate-800 mt-3 bg-slate-50 py-1 px-3 rounded inline-block">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!file || isUploading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4" />
                {isUploading ? "Validating Spreadsheet..." : "Validate & Preview Rows"}
              </button>
            </div>
          </form>
        </div>

        {/* Preview State */}
        {preview && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Spreadsheet Validation Summary</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review row-level validity and duplicate checks before final database insertion.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {preview.invalidRows > 0 && (
                  <button
                    onClick={downloadErrorReport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Error Report
                  </button>
                )}

                <button
                  onClick={handleConfirmImport}
                  disabled={preview.validRows === 0 || isUploading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Import ({preview.validRows} valid rows)
                </button>
              </div>
            </div>

            {/* Validation Pills */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <span className="text-xs text-slate-500 uppercase font-semibold">Total Rows</span>
                <p className="text-xl font-bold text-slate-800">{preview.totalRows}</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                <span className="text-xs text-emerald-600 uppercase font-semibold">Valid To Import</span>
                <p className="text-xl font-bold text-emerald-700">{preview.validRows}</p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
                <span className="text-xs text-rose-600 uppercase font-semibold">Issues / Errors</span>
                <p className="text-xl font-bold text-rose-700">{preview.invalidRows}</p>
              </div>
            </div>

            {/* Row Inspection Table */}
            <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Intern ID</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Issues / Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {preview.rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.isValid ? "bg-white" : "bg-rose-50/50"}
                    >
                      <td className="py-2 px-3">{row.rowNumber}</td>
                      <td className="py-2 px-3 font-sans font-medium text-slate-800">{row.name}</td>
                      <td className="py-2 px-3 font-sans text-slate-600">{row.email}</td>
                      <td className="py-2 px-3">{row.internId}</td>
                      <td className="py-2 px-3 font-sans text-slate-600">{row.department || "—"}</td>
                      <td className="py-2 px-3">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-sans font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-sans font-semibold">
                            <XCircle className="w-3.5 h-3.5" /> Error
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-sans text-rose-600">
                        {row.errors.join("; ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Execution Result State */}
        {importResult && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Import Processing Completed</h3>
                <p className="text-xs text-slate-500">
                  Successfully provisioned {importResult.successCount} of {importResult.total} accounts.
                </p>
              </div>

              {importResult.failureCount > 0 && (
                <button
                  onClick={downloadErrorReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100"
                >
                  <Download className="w-3.5 h-3.5" /> Download Failed Rows Report
                </button>
              )}
            </div>

            {/* Success Account Setup Links */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800 text-sm">
                Generated Activation Links ({importResult.createdInterns.length})
              </h4>
              <div className="max-h-72 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3">
                {importResult.createdInterns.map((intern, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 rounded border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{intern.name}</span>{" "}
                      <span className="text-slate-500">({intern.email})</span>
                      <span className="ml-2 font-mono text-slate-600">[{intern.internId}]</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={intern.activationLink}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono w-64 select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(intern.activationLink);
                          alert(`Activation link copied for ${intern.name}!`);
                        }}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 inline-flex items-center gap-1"
                      >
                        <KeyRound className="w-3 h-3" /> Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
