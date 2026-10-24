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

      <main className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/intern/tasks"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--iwms-navy)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Tasks
          </Link>

          {task.status === "assigned" && (
            <button
              onClick={handleStartTask}
              disabled={isUpdatingStatus}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all iwms-btn-primary"
              style={{ background: "var(--iwms-navy)", color: "var(--iwms-white)" }}
            >
              <Play className="w-4 h-4" /> Start Working on Task
            </button>
          )}
        </div>

        {/* Task Brief */}
        <div className="iwms-card iwms-task-card p-6 space-y-4" style={{ borderRadius: "14px" }}>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--iwms-border)" }}>
            <div className="flex items-center gap-3">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border capitalize ${getStatusBadgeClass(
                  task.status
                )}`}
              >
                {task.status.replace("_", " ")}
              </span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${getPriorityBadgeClass(
                  task.priority
                )}`}
              >
                {task.priority} Priority
              </span>
            </div>

            <div className="text-xs flex items-center gap-4" style={{ color: "rgba(11,31,58,.50)" }}>
              <span>Assigned: {formatDate(task.assignmentDate)}</span>
              <span>
                Due Deadline: <strong style={{ color: "var(--iwms-black)" }}>{formatDate(task.dueDate)}</strong>
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(11,31,58,.40)" }}>
              Deliverable Guidelines &amp; Requirements
            </h4>
            <p className="text-sm whitespace-pre-line leading-relaxed p-4 rounded-lg" style={{ color: "var(--iwms-black)", background: "rgba(11,31,58,.03)", border: "1px solid var(--iwms-border)" }}>
              {task.description}
            </p>
          </div>
        </div>

        {/* Daily Progress Images with Strict 24-Hour Expiry */}
        <div className="iwms-card p-6 space-y-4" style={{ borderRadius: "14px" }}>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3" style={{ borderBottom: "1px solid var(--iwms-border)" }}>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: "var(--iwms-black)" }}>
                <Camera className="w-5 h-5" style={{ color: "var(--iwms-sky)" }} /> Daily Progress Snapshots
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "rgba(11,31,58,.50)" }}>
                Upload in-progress screenshots or proof of daily work. Snapshots are retained with a strict 24-hour expiry lifecycle.
              </p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 24h Auto-Expiry
            </span>
          </div>

          {progressError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{progressError}</span>
            </div>
          )}

          {/* Upload input form */}
          <div className="flex flex-col sm:flex-row gap-3 items-center p-4 rounded-lg" style={{ background: "rgba(11,31,58,.03)", border: "1px solid var(--iwms-border)" }}>
            <input
              type="text"
              value={progressCaption}
              onChange={(e) => setProgressCaption(e.target.value)}
              placeholder="Brief note (e.g. Completed initial mockups, running test suite)..."
              className="flex-1 w-full px-3 py-2 text-xs rounded-lg bg-white focus:outline-none"
              style={{ border: "1px solid var(--iwms-border)" }}
            />
            <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm flex-shrink-0 iwms-btn-primary" style={{ background: "var(--iwms-sky)", color: "white" }}>
              <Upload className="w-3.5 h-3.5" />
              {isUploadingProgressImage ? "Uploading to Cloud…" : "Upload Snapshot"}
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
            <p className="text-xs text-slate-400 text-center py-4 italic">
              No active progress snapshots uploaded for this task today.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {progressImages.map((img) => (
                <div
                  key={img._id}
                  className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="truncate max-w-[140px] font-medium text-slate-700">
                        {img.originalFileName}
                      </span>
                      <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {img.remainingMinutes > 60
                          ? `${Math.floor(img.remainingMinutes / 60)}h remaining`
                          : `${img.remainingMinutes}m remaining`}
                      </span>
                    </div>
                    {img.caption && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-1.5 rounded">
                        &ldquo;{img.caption}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {new Date(img.uploadedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <a
                      href={img.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold hover:opacity-80 inline-flex items-center gap-1"
                      style={{ color: "var(--iwms-sky)" }}
                    >
                      <ImageIcon className="w-3 h-3" /> View Secure Image &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submission & Revisions Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {submitSuccess && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {submitError && (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {canSubmit ? (
              <div className="iwms-card p-6 space-y-5" style={{ borderRadius: "14px" }}>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: "var(--iwms-black)" }}>
                    {submissions.length > 0 ? "Submit Work Revision" : "Submit Deliverables"}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(11,31,58,.50)" }}>
                    Provide your detailed completion notes, repository/demo URLs, and upload any output documents.
                  </p>
                </div>

                <form onSubmit={handleSubmitWork} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--iwms-navy)" }}>
                      Deliverable Notes &amp; Summary *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={workDescription}
                      onChange={(e) => setWorkDescription(e.target.value)}
                      placeholder="Outline what was built, testing steps performed, and any notes for review..."
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                      style={{ border: "1px solid var(--iwms-border)", color: "var(--iwms-black)" }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--iwms-navy)" }}>
                      Repository or Demo URLs
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="https://github.com/my-pr or https://figma.com/..."
                        className="flex-1 px-3 py-2 rounded-lg text-xs focus:outline-none"
                        style={{ border: "1px solid var(--iwms-border)", color: "var(--iwms-black)" }}
                      />
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="px-3 py-2 rounded-lg text-xs font-semibold"
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
                            className="text-xs flex items-center justify-between px-2.5 py-1 rounded"
                            style={{ background: "rgba(11,31,58,.03)", border: "1px solid var(--iwms-border)" }}
                          >
                            <span className="truncate max-w-sm font-mono" style={{ color: "var(--iwms-navy)" }}>{link}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(idx)}
                              className="text-rose-500 hover:text-rose-700 font-bold ml-2"
                            >
                              &times;
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--iwms-navy)" }}>
                      Upload Private Files (PDF, ZIP, DOCX, Images)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-xs font-semibold transition-colors hover:bg-sky-50" style={{ border: "1px solid var(--iwms-border)", color: "var(--iwms-navy)" }}>
                        <Upload className="w-3.5 h-3.5" /> Select File
                        <input
                          type="file"
                          className="sr-only"
                          onChange={handleFileUpload}
                          disabled={isUploadingFile}
                        />
                      </label>
                      {isUploadingFile && (
                        <span className="text-xs font-medium" style={{ color: "var(--iwms-sky)" }}>Uploading securely…</span>
                      )}
                    </div>

                    {attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {attachments.map((att, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
                            style={{ background: "rgba(11,31,58,.06)", color: "var(--iwms-navy)", border: "1px solid var(--iwms-border)" }}
                          >
                            <Paperclip className="w-3 h-3" style={{ color: "var(--iwms-sky)" }} />
                            {att.fileName}
                            <button
                              type="button"
                              onClick={() =>
                                setAttachments(attachments.filter((_, i) => i !== idx))
                              }
                              className="text-rose-500 hover:text-rose-700 font-bold ml-1"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 iwms-btn-primary"
                      style={{ background: "var(--iwms-navy)", color: "var(--iwms-white)" }}
                    >
                      <Send className="w-4 h-4" />
                      {isSubmitting ? "Submitting Work…" : "Submit Deliverables for Review"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="iwms-card p-6 text-center" style={{ borderRadius: "14px" }}>
                <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(56,189,248,.40)" }} />
                <p className="font-semibold" style={{ color: "var(--iwms-navy)" }}>
                  {task.status === "assigned"
                    ? "Click 'Start Working on Task' above to begin."
                    : task.status === "submitted"
                    ? "Deliverables submitted and currently under review by supervisor."
                    : "Task has been approved and completed!"}
                </p>
              </div>
            )}

            {/* Previous Submissions List */}
            <div className="space-y-4">
              <h4 className="font-bold text-base flex items-center gap-2" style={{ color: "var(--iwms-black)" }}>
                <FileText className="w-4 h-4" style={{ color: "var(--iwms-sky)" }} /> My Submission Versions ({submissions.length})
              </h4>

              {submissions.map((sub) => (
                <div key={sub._id} className="iwms-card p-5 space-y-3" style={{ borderRadius: "12px" }}>
                  <div className="flex items-center justify-between pb-2" style={{ borderBottom: "1px solid var(--iwms-border)" }}>
                    <span className="font-bold text-xs px-2 py-0.5 rounded" style={{ background: "rgba(11,31,58,.07)", color: "var(--iwms-navy)" }}>
                      Version {sub.version}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize ${getStatusBadgeClass(
                        sub.reviewStatus
                      )}`}
                    >
                      {sub.reviewStatus.replace("_", " ")}
                    </span>
                  </div>

                  <p className="text-xs whitespace-pre-line p-3 rounded" style={{ color: "var(--iwms-black)", background: "rgba(11,31,58,.03)" }}>
                    {sub.workDescription}
                  </p>

                  {sub.adminFeedback && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-xs font-bold text-amber-800 uppercase block mb-1">
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
            <div className="iwms-card p-5 space-y-4" style={{ borderRadius: "14px" }}>
              <h4 className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--iwms-black)" }}>
                <History className="w-4 h-4" style={{ color: "rgba(11,31,58,.40)" }} /> Task History Log
              </h4>

              <div className="space-y-3 font-mono text-xs">
                {events.map((evt) => (
                  <div key={evt._id} className="pl-3 py-1" style={{ borderLeft: "2px solid var(--iwms-sky)", opacity: 0.8 }}>
                    <p className="font-sans font-semibold capitalize" style={{ color: "var(--iwms-black)" }}>
                      {evt.eventType.replace("_", " ")}
                    </p>
                    <p className="text-xs" style={{ color: "rgba(11,31,58,.45)" }}>
                      {formatDateTime(evt.timestamp)} by {evt.actorName}
                    </p>
                    {evt.note && <p className="font-sans mt-1" style={{ color: "rgba(11,31,58,.60)" }}>{evt.note}</p>}
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
