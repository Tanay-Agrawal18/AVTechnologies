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
  ExternalLink,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  MessageSquare,
  FileText,
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
        <main className="p-8 text-slate-500">Loading task instructions...</main>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <DashboardHeader title="Task Not Found" />
        <main className="p-8">
          <p className="text-slate-600 mb-4">Task could not be found or you do not have permission to view it.</p>
          <Link href="/intern/tasks" className="text-indigo-600 font-semibold hover:underline">
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
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Tasks
          </Link>

          {task.status === "assigned" && (
            <button
              onClick={handleStartTask}
              disabled={isUpdatingStatus}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"
            >
              <Play className="w-4 h-4" /> Start Working on Task
            </button>
          )}
        </div>

        {/* Task Brief */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
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

            <div className="text-xs text-slate-500 flex items-center gap-4">
              <span>Assigned: {formatDate(task.assignmentDate)}</span>
              <span>
                Due Deadline: <strong className="text-slate-700">{formatDate(task.dueDate)}</strong>
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Deliverable Guidelines & Requirements
            </h4>
            <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
              {task.description}
            </p>
          </div>
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
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {submissions.length > 0 ? "Submit Work Revision" : "Submit Deliverables"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provide your detailed completion notes, repository/demo URLs, and upload any output documents.
                  </p>
                </div>

                <form onSubmit={handleSubmitWork} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Deliverable Notes & Summary *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={workDescription}
                      onChange={(e) => setWorkDescription(e.target.value)}
                      placeholder="Outline what was built, testing steps performed, and any notes for review..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Repository or Demo URLs
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="https://github.com/my-pr or https://figma.com/..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Add Link
                      </button>
                    </div>

                    {externalLinks.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {externalLinks.map((link, idx) => (
                          <li
                            key={idx}
                            className="text-xs flex items-center justify-between bg-slate-50 px-2.5 py-1 rounded border border-slate-200"
                          >
                            <span className="truncate max-w-sm font-mono text-slate-700">{link}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(idx)}
                              className="text-rose-600 hover:text-rose-800 font-bold ml-2"
                            >
                              &times;
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Upload Private Files (PDF, ZIP, DOCX, Images)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Upload className="w-3.5 h-3.5" /> Select File
                        <input
                          type="file"
                          className="sr-only"
                          onChange={handleFileUpload}
                          disabled={isUploadingFile}
                        />
                      </label>
                      {isUploadingFile && (
                        <span className="text-xs text-indigo-600 font-medium">Uploading securely...</span>
                      )}
                    </div>

                    {attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {attachments.map((att, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-xs border border-slate-200"
                          >
                            <Paperclip className="w-3 h-3 text-slate-400" />
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
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {isSubmitting ? "Submitting Work..." : "Submit Deliverables for Review"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">
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
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> My Submission Versions ({submissions.length})
              </h4>

              {submissions.map((sub) => (
                <div key={sub._id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
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

                  <p className="text-xs text-slate-800 whitespace-pre-line bg-slate-50 p-3 rounded">
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
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" /> Task History Log
              </h4>

              <div className="space-y-3 font-mono text-xs">
                {events.map((evt) => (
                  <div key={evt._id} className="border-l-2 border-slate-200 pl-3 py-1">
                    <p className="font-sans font-semibold text-slate-800 capitalize">
                      {evt.eventType.replace("_", " ")}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {formatDateTime(evt.timestamp)} by {evt.actorName}
                    </p>
                    {evt.note && <p className="font-sans text-slate-600 mt-1">{evt.note}</p>}
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
