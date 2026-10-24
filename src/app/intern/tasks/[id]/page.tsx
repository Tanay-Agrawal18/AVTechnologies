"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ITask, ISubmission, ITaskEvent } from "@/types";
import {
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  getPriorityBadgeClass,
} from "@/lib/utils";
import {
  ArrowLeft,
  Play,
  Upload,
  Send,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  FileText,
  Image as ImageIcon,
  Camera,
} from "lucide-react";

export default function InternTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [task, setTask] = useState<ITask | null>(null);
  const [submissions, setSubmissions] = useState<ISubmission[]>([]);
  const [events, setEvents] = useState<ITaskEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Status transition state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Submission Form State
  const [workDescription, setWorkDescription] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [externalLinks, setExternalLinks] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<
    Array<{ fileKey: string; fileName: string; fileSize: number; mimeType: string }>
  >([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Daily Progress Images State
  const [progressImages, setProgressImages] = useState<
    Array<{
      _id: string;
      originalFileName: string;
      caption?: string;
      uploadedAt: string;
      expiresAt: string;
      remainingMinutes: number;
      viewUrl: string;
    }>
  >([]);
  const [isUploadingProgressImage, setIsUploadingProgressImage] = useState(false);
  const [progressCaption, setProgressCaption] = useState("");
  const [progressError, setProgressError] = useState<string | null>(null);

  const fetchProgressImages = async () => {
    try {
      const res = await fetch(`/api/intern/tasks/${id}/progress-images`);
      if (res.ok) {
        const data = await res.json();
        setProgressImages(data.images || []);
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchTaskDetail = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/intern/tasks/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data.task);
        setSubmissions(data.submissions || []);
        setEvents(data.events || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetail();
    fetchProgressImages();
  }, [id]);

  const handleStartTask = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/intern/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      if (res.ok) {
        fetchTaskDetail();
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    try {
      new URL(linkInput.trim());
      setExternalLinks([...externalLinks, linkInput.trim()]);
      setLinkInput("");
    } catch {
      alert("Please enter a valid URL (e.g. https://github.com/...)");
    }
  };

  const handleRemoveLink = (index: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    setIsUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "File upload failed");
      }

      setAttachments([
        ...attachments,
        {
          fileKey: data.fileKey,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
        },
      ]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Upload error");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleProgressImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setProgressError(null);
    setIsUploadingProgressImage(true);

    const formData = new FormData();
    formData.append("file", file);
    if (progressCaption.trim()) {
      formData.append("caption", progressCaption.trim());
    }

    try {
      const res = await fetch(`/api/intern/tasks/${id}/progress-images`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload progress image");
      }

      setProgressCaption("");
      fetchProgressImages();
    } catch (err: unknown) {
      setProgressError(err instanceof Error ? err.message : "Upload error");
    } finally {
      setIsUploadingProgressImage(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/intern/tasks/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDescription,
          externalLinks,
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setSubmitSuccess("Work submitted successfully for supervisor review!");
      setWorkDescription("");
      setExternalLinks([]);
      setAttachments([]);
      fetchTaskDetail();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit work");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <DashboardHeader title="Task Details" />
        <main className="p-8" style={{ color: "rgba(11,31,58,.50)" }}>Loading task instructions…</main>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <DashboardHeader title="Task Not Found" />
        <main className="p-8">
          <p className="mb-4" style={{ color: "rgba(11,31,58,.60)" }}>Task could not be found or you do not have permission to view it.</p>
          <Link href="/intern/tasks" className="font-semibold hover:underline" style={{ color: "var(--iwms-sky)" }}>
            &larr; Return to My Tasks
          </Link>
        </main>
      </>
    );
  }

  const canSubmit = task.status === "in_progress" || task.status === "changes_requested";

  return (
    <>
      <DashboardHeader
        title={`Task: ${task.title}`}
        description="Review requirements, initiate progression, and submit your deliverables"
      />

      <main className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/intern/tasks"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--iwms-navy)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Back to My Tasks
          </Link>

          {task.status === "assigned" && (
            <button
              onClick={handleStartTask}
              disabled={isUpdatingStatus}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all iwms-btn-primary"
              style={{ background: "var(--iwms-navy)", color: "var(--iwms-white)" }}
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Start Working
            </button>
          )}
        </div>

        {/* Task Brief */}
        <div className="iwms-card p-3.5 sm:p-6 space-y-3 sm:space-y-4" style={{ borderRadius: "14px" }}>
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 sm:pb-4" style={{ borderBottom: "1px solid var(--iwms-border)" }}>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border capitalize ${getStatusBadgeClass(
                  task.status
                )}`}
              >
                {task.status.replace("_", " ")}
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold uppercase ${getPriorityBadgeClass(
                  task.priority
                )}`}
              >
                {task.priority} Priority
              </span>
            </div>

            <div className="text-[10px] sm:text-xs flex flex-wrap items-center gap-2 sm:gap-4" style={{ color: "rgba(11,31,58,.50)" }}>
              <span>Assigned: {formatDate(task.assignmentDate)}</span>
              <span>
                Due: <strong style={{ color: "var(--iwms-black)" }}>{formatDate(task.dueDate)}</strong>
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(11,31,58,.40)" }}>
              Deliverable Guidelines &amp; Requirements
            </h4>
            <p className="text-xs sm:text-sm whitespace-pre-line leading-relaxed p-3 sm:p-4 rounded-lg" style={{ color: "var(--iwms-black)", background: "rgba(11,31,58,.03)", border: "1px solid var(--iwms-border)" }}>
              {task.description}
            </p>
          </div>
        </div>

        {/* Daily Progress Images with Strict 24-Hour Expiry */}
        <div className="iwms-card p-3.5 sm:p-6 space-y-3 sm:space-y-4" style={{ borderRadius: "14px" }}>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 sm:pb-3" style={{ borderBottom: "1px solid var(--iwms-border)" }}>
            <div>
              <h3 className="font-bold text-xs sm:text-base flex items-center gap-1.5" style={{ color: "var(--iwms-black)" }}>
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" style={{ color: "var(--iwms-sky)" }} /> Daily Progress Snapshots
              </h3>
              <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: "rgba(11,31,58,.50)" }}>
                Upload proof of daily work (retained for 24 hours).
              </p>
            </div>
            <span className="text-[10px] sm:text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" /> 24h Expiry
            </span>
          </div>

          {progressError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{progressError}</span>
            </div>
          )}

          {/* Upload input form */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center p-3 sm:p-4 rounded-lg" style={{ background: "rgba(11,31,58,.03)", border: "1px solid var(--iwms-border)" }}>
            <input
              type="text"
              value={progressCaption}
              onChange={(e) => setProgressCaption(e.target.value)}
              placeholder="Brief note (e.g. Completed initial mockups)..."
              className="flex-1 w-full px-3 py-2 text-[11px] sm:text-xs rounded-lg bg-white focus:outline-none"
              style={{ border: "1px solid var(--iwms-border)" }}
            />
            <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm shrink-0 iwms-btn-primary" style={{ background: "var(--iwms-sky)", color: "white" }}>
              <Upload className="w-3.5 h-3.5" />
              {isUploadingProgressImage ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handleProgressImageUpload}
                disabled={isUploadingProgressImage}
              />
            </label>
          </div>

          {/* Active progress images grid */}
          {progressImages.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3 italic">
              No active progress snapshots uploaded today.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 pt-1">
              {progressImages.map((img) => (
                <div
                  key={img._id}
                  className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 shadow-xs space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="truncate max-w-[130px] font-medium text-slate-700 text-[11px]">
                        {img.originalFileName}
                      </span>
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {img.remainingMinutes > 60
                          ? `${Math.floor(img.remainingMinutes / 60)}h left`
                          : `${img.remainingMinutes}m left`}
                      </span>
                    </div>
                    {img.caption && (
                      <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded">
                        &ldquo;{img.caption}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {new Date(img.uploadedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <a
                      href={img.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold hover:opacity-80 inline-flex items-center gap-1"
                      style={{ color: "var(--iwms-sky)" }}
                    >
                      <ImageIcon className="w-3 h-3" /> View &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submission & Revisions Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {submitSuccess && (
              <div className="p-3 sm:p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {submitError && (
              <div className="p-3 sm:p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Feedback alert when revisions are requested */}
            {task.status === "changes_requested" && submissions.length > 0 && submissions[0].adminFeedback && (
              <div
                className="iwms-card p-4 rounded-xl space-y-1.5"
                style={{
                  borderLeft: "4px solid #ef4444",
                  background: "rgba(239,68,68,.04)",
                }}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-bold text-red-900">
                    Supervisor Feedback for Revision
                  </h4>
                </div>
                <p className="text-xs text-red-800 leading-relaxed pl-6">
                  {submissions[0].adminFeedback}
                </p>
                <p className="text-[10px] text-red-700/80 pl-6">
                  Please address this feedback and submit your revised deliverables below.
                </p>
              </div>
            )}

            {canSubmit ? (
              <div className="iwms-card p-3.5 sm:p-6 space-y-3 sm:space-y-5" style={{ borderRadius: "14px" }}>
                <div>
                  <h3 className="font-bold text-sm sm:text-lg" style={{ color: "var(--iwms-black)" }}>
                    {submissions.length > 0 ? "Submit Work Revision" : "Submit Deliverables"}
                  </h3>
                  <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: "rgba(11,31,58,.50)" }}>
                    Provide completion notes, repository/demo URLs, and upload documents (Max 10MB per file).
                  </p>
                </div>

                <form onSubmit={handleSubmitWork} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold mb-1" style={{ color: "var(--iwms-navy)" }}>
                      Deliverable Notes &amp; Summary *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={workDescription}
                      onChange={(e) => setWorkDescription(e.target.value)}
                      placeholder="Outline what was built, testing steps performed, and any notes for review..."
                      className="w-full px-3 py-2 rounded-lg text-xs sm:text-sm focus:outline-none"
                      style={{ border: "1px solid var(--iwms-border)", color: "var(--iwms-black)" }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold mb-1" style={{ color: "var(--iwms-navy)" }}>
                      Repository or Demo URLs
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="https://github.com/my-pr or https://figma.com/..."
                        className="flex-1 px-3 py-1.5 sm:py-2 rounded-lg text-xs focus:outline-none min-w-0"
                        style={{ border: "1px solid var(--iwms-border)", color: "var(--iwms-black)" }}
                      />
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold shrink-0"
                        style={{ background: "rgba(11,31,58,.07)", color: "var(--iwms-navy)" }}
                      >
                        Add Link
                      </button>
                    </div>

                    {externalLinks.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {externalLinks.map((link, idx) => (
                          <li
                            key={idx}
                            className="text-[11px] sm:text-xs flex items-center justify-between px-2.5 py-1 rounded"
                            style={{ background: "rgba(11,31,58,.03)", border: "1px solid var(--iwms-border)" }}
                          >
                            <span className="truncate max-w-[200px] sm:max-w-sm font-mono" style={{ color: "var(--iwms-navy)" }}>{link}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(idx)}
                              className="text-rose-500 hover:text-rose-700 font-bold ml-2 text-sm"
                            >
                              &times;
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] sm:text-xs font-semibold" style={{ color: "var(--iwms-navy)" }}>
                        Upload Private Files (PDF, ZIP, DOCX, XLSX, Images, TXT)
                      </label>
                      <span className="text-[10px] text-slate-400">Max 10MB</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg bg-white text-xs font-semibold transition-colors hover:bg-sky-50" style={{ border: "1px solid var(--iwms-border)", color: "var(--iwms-navy)" }}>
                        <Upload className="w-3.5 h-3.5" /> Select File
                        <input
                          type="file"
                          accept=".pdf,.zip,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
                          className="sr-only"
                          onChange={handleFileUpload}
                          disabled={isUploadingFile}
                        />
                      </label>
                      {isUploadingFile && (
                        <span className="text-[11px] sm:text-xs font-medium" style={{ color: "var(--iwms-sky)" }}>Uploading…</span>
                      )}
                    </div>

                    {attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {attachments.map((att, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-xs"
                            style={{ background: "rgba(11,31,58,.06)", color: "var(--iwms-navy)", border: "1px solid var(--iwms-border)" }}
                          >
                            <Paperclip className="w-3 h-3 shrink-0" style={{ color: "var(--iwms-sky)" }} />
                            <span className="truncate max-w-[120px]">{att.fileName}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setAttachments(attachments.filter((_, i) => i !== idx))
                              }
                              className="text-rose-500 hover:text-rose-700 font-bold ml-0.5"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold shadow-sm disabled:opacity-50 iwms-btn-primary"
                      style={{ background: "var(--iwms-navy)", color: "var(--iwms-white)" }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSubmitting ? "Submitting Work…" : "Submit Deliverables"}
                    </button>
                  </div>
                </form>
              </div>
            ) : task.status === "assigned" ? (
              <div className="iwms-card p-4 sm:p-6 text-center space-y-3" style={{ borderRadius: "14px" }}>
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-sky-600" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm" style={{ color: "var(--iwms-navy)" }}>
                    Ready to Start Working?
                  </h4>
                  <p className="text-[11px] sm:text-xs mt-1 max-w-md mx-auto" style={{ color: "rgba(11,31,58,.55)" }}>
                    This task is assigned to you and awaiting your kickoff. Click &ldquo;Start Working&rdquo; to transition the task into progress and unlock the deliverables submission form.
                  </p>
                </div>
                <button
                  onClick={handleStartTask}
                  disabled={isUpdatingStatus}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
                  style={{ background: "#1D6CE5" }}
                >
                  <Play className="w-4 h-4" /> {isUpdatingStatus ? "Starting…" : "Start Working Now"}
                </button>
              </div>
            ) : (
              <div className="iwms-card p-4 sm:p-6 text-center" style={{ borderRadius: "14px" }}>
                {task.status === "approved" ? (
                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 text-emerald-500" />
                ) : (
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 sm:mb-2" style={{ color: "rgba(56,189,248,.40)" }} />
                )}
                <p className="font-semibold text-xs sm:text-sm" style={{ color: "var(--iwms-navy)" }}>
                  {task.status === "submitted"
                    ? "Deliverables submitted and currently under supervisor review."
                    : "Task has been approved and successfully completed!"}
                </p>
                <p className="text-[10px] sm:text-xs mt-1 text-slate-500">
                  {task.status === "submitted"
                    ? "Your supervisor has been notified. You will be able to review feedback or make revisions if requested."
                    : "Great job! Your deliverables were verified and marked as complete."}
                </p>
              </div>
            )}

            {/* Previous Submissions List */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="font-bold text-xs sm:text-base flex items-center gap-1.5" style={{ color: "var(--iwms-black)" }}>
                <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--iwms-sky)" }} /> Submission Versions ({submissions.length})
              </h4>

              {submissions.map((sub) => (
                <div key={sub._id} className="iwms-card p-3.5 sm:p-5 space-y-2.5 sm:space-y-3" style={{ borderRadius: "12px" }}>
                  <div className="flex items-center justify-between pb-2" style={{ borderBottom: "1px solid var(--iwms-border)" }}>
                    <span className="font-bold text-[10px] sm:text-xs px-2 py-0.5 rounded" style={{ background: "rgba(11,31,58,.07)", color: "var(--iwms-navy)" }}>
                      Version {sub.version}
                    </span>
                    <span
                      className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium border capitalize ${getStatusBadgeClass(
                        sub.reviewStatus
                      )}`}
                    >
                      {sub.reviewStatus.replace("_", " ")}
                    </span>
                  </div>

                  <p className="text-xs whitespace-pre-line p-2.5 sm:p-3 rounded" style={{ color: "var(--iwms-black)", background: "rgba(11,31,58,.03)" }}>
                    {sub.workDescription}
                  </p>

                  {sub.adminFeedback && (
                    <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase block mb-1">
                        Supervisor Feedback
                      </span>
                      <p className="text-xs text-amber-900">{sub.adminFeedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <div className="iwms-card p-3.5 sm:p-5 space-y-3 sm:space-y-4" style={{ borderRadius: "14px" }}>
              <h4 className="font-bold text-xs sm:text-sm flex items-center gap-1.5" style={{ color: "var(--iwms-black)" }}>
                <History className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(11,31,58,.40)" }} /> Activity Timeline
              </h4>

              <div className="space-y-2.5 font-mono text-[11px] sm:text-xs">
                {events.map((evt) => (
                  <div key={evt._id} className="pl-2.5 py-0.5" style={{ borderLeft: "2px solid var(--iwms-sky)", opacity: 0.85 }}>
                    <p className="font-sans font-semibold capitalize text-xs" style={{ color: "var(--iwms-black)" }}>
                      {evt.eventType.replace("_", " ")}
                    </p>
                    <p className="text-[10px] sm:text-[11px]" style={{ color: "rgba(11,31,58,.45)" }}>
                      {formatDateTime(evt.timestamp)} by {evt.actorName}
                    </p>
                    {evt.note && <p className="font-sans mt-0.5 text-[11px]" style={{ color: "rgba(11,31,58,.60)" }}>{evt.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
