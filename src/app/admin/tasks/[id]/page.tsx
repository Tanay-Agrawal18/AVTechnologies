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
  Archive,
  RotateCcw,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Paperclip,
  UserX,
  ArrowRightLeft,
} from "lucide-react";
import { IUser } from "@/types";

export default function AdminTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [task, setTask] = useState<ITask | null>(null);
  const [submissions, setSubmissions] = useState<ISubmission[]>([]);
  const [events, setEvents] = useState<ITaskEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active interns for transfer
  const [interns, setInterns] = useState<IUser[]>([]);

  // Review Feedback Form State
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approve" | "request_changes">("approve");
  const [feedback, setFeedback] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Unassign Modal State
  const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
  const [unassignReason, setUnassignReason] = useState("");
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [unassignError, setUnassignError] = useState<string | null>(null);

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetInternId, setTransferTargetInternId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const fetchTaskDetail = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/tasks/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data.task);
        setSubmissions(data.submissions || []);
        setEvents(data.events || []);

        // Default review selection to latest pending or last submission
        if (data.submissions && data.submissions.length > 0) {
          setSelectedSubmissionId(data.submissions[0]._id);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveInterns = async () => {
    try {
      const res = await fetch("/api/admin/interns?status=active");
      if (res.ok) {
        const data = await res.json();
        setInterns(data.interns || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTaskDetail();
    fetchActiveInterns();

    const handleRealtime = (e: Event) => {
      const custom = e as CustomEvent<{ type: string }>;
      if (!custom.detail || custom.detail.type?.startsWith("task_")) {
        fetchTaskDetail();
      }
    };
    window.addEventListener("iwms:realtime", handleRealtime);
    window.addEventListener("iwms:revalidate", handleRealtime);

    return () => {
      window.removeEventListener("iwms:realtime", handleRealtime);
      window.removeEventListener("iwms:revalidate", handleRealtime);
    };
  }, [id]);

  const handleUnassignIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUnassigning(true);
    setUnassignError(null);

    try {
      const res = await fetch(`/api/admin/tasks/${id}/unassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: unassignReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to unassign task");
      }

      setIsUnassignModalOpen(false);
      setUnassignReason("");
      fetchTaskDetail();
    } catch (err: unknown) {
      setUnassignError(err instanceof Error ? err.message : "Failed to unassign task");
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleTransferTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetInternId) {
      setTransferError("Please select a target intern");
      return;
    }
    if (!transferReason.trim()) {
      setTransferError("Please provide a reason for the transfer");
      return;
    }

    setIsTransferring(true);
    setTransferError(null);

    try {
      const res = await fetch(`/api/admin/tasks/${id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newInternId: transferTargetInternId,
          reason: transferReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to transfer task");
      }

      setIsTransferModalOpen(false);
      setTransferTargetInternId("");
      setTransferReason("");
      fetchTaskDetail();
    } catch (err: unknown) {
      setTransferError(err instanceof Error ? err.message : "Failed to transfer task");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!task) return;
    const nextArchived = !task.isArchived;
    const confirmMsg = nextArchived
      ? "Archive this task? (It will be preserved in audit records but hidden from active views)"
      : "Unarchive this task?";

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: nextArchived }),
      });
      if (res.ok) fetchTaskDetail();
    } catch {
      alert("Failed to update archive status");
    }
  };

  const handleReviewSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionId) return;

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      const res = await fetch(
        `/api/admin/tasks/${id}/submissions/${selectedSubmissionId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, feedback }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Review submission failed");
      }

      setFeedback("");
      fetchTaskDetail();
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : "Review submission failed");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <DashboardHeader title="Task Review & Audit" />
        <main className="p-8 text-slate-500">Loading task record and audit history...</main>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <DashboardHeader title="Task Not Found" />
        <main className="p-8">
          <p className="text-slate-600 mb-4">The requested task could not be located.</p>
          <Link href="/admin/tasks" className="text-blue-600 font-semibold hover:underline">
            &larr; Back to Task List
          </Link>
        </main>
      </>
    );
  }

  const intern = task.assignedInternId as unknown as {
    name?: string;
    email?: string;
    internId?: string;
  };

  return (
    <>
      <DashboardHeader
        title={`Task: ${task.title}`}
        description="Inspect deliverables, submit supervisory review feedback, and trace immutable audit log"
      />

      <main className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href="/admin/tasks"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" /> Back to Tasks
          </Link>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {task.status !== "unassigned" && task.status !== "transferred" && (
              <>
                <button
                  onClick={() => {
                    setUnassignError(null);
                    setIsUnassignModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium border border-rose-300 text-rose-700 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Unassign
                </button>

                <button
                  onClick={() => {
                    setTransferError(null);
                    setIsTransferModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium border border-purple-300 text-purple-700 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Transfer
                </button>
              </>
            )}

            <button
              onClick={handleToggleArchive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium border border-slate-300 rounded-lg bg-white hover:bg-slate-50"
            >
              {task.isArchived ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" /> Restore
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" /> Archive
                </>
              )}
            </button>
          </div>
        </div>

        {/* Task Overview Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-6">
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
              {task.isArchived && (
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                  Archived Record
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-4">
              <span>Assigned: {formatDate(task.assignmentDate)}</span>
              <span>Due: {formatDate(task.dueDate)}</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Description & Scope
            </h4>
            <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
              {task.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase">Assigned Intern:</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {intern?.name || task.assignedInternSnapshot?.name || "N/A"}
                <span className="font-normal text-slate-500 ml-1">
                  ({intern?.internId || task.assignedInternSnapshot?.internId || ""})
                </span>
              </p>
              <p className="text-slate-500">{intern?.email || task.assignedInternSnapshot?.email}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase">Timeline Check:</span>
              <p className="text-slate-700 mt-0.5">
                Deadline: {formatDateTime(task.dueDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Submissions & Reviews Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submissions Version History */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Deliverables & Version History
            </h3>

            {submissions.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No submissions uploaded yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  When the intern submits their work or revisions, each version will be captured here.
                </p>
              </div>
            ) : (
              submissions.map((sub) => (
                <div
                  key={sub._id}
                  className={`bg-white rounded-xl border p-6 space-y-4 shadow-xs ${
                    selectedSubmissionId === sub._id
                      ? "border-blue-500 ring-1 ring-blue-500"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded">
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
                    <span className="text-xs text-slate-500">
                      Submitted: {formatDateTime(sub.createdAt)}
                    </span>
                  </div>

                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase mb-1">
                      Intern Work Notes
                    </h5>
                    <p className="text-sm text-slate-800 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {sub.workDescription}
                    </p>
                  </div>

                  {/* External Links */}
                  {sub.externalLinks && sub.externalLinks.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-400 uppercase mb-1">
                        Repository / Demo Links
                      </h5>
                      <ul className="space-y-1">
                        {sub.externalLinks.map((link, i) => (
                          <li key={i}>
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              {link} <ExternalLink className="w-3 h-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Private Attachments */}
                  {sub.attachments && sub.attachments.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-400 uppercase mb-1">
                        Uploaded Deliverable Files
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {sub.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={`/api/files/${att.fileKey}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                          >
                            <Paperclip className="w-3 h-3 text-slate-500" />
                            {att.fileName} ({(att.fileSize / 1024).toFixed(0)} KB)
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Feedback Display if Reviewed */}
                  {sub.adminFeedback && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-800 uppercase">
                          Supervisor Feedback ({sub.reviewStatus})
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 whitespace-pre-line">
                        {sub.adminFeedback}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Review Action Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs sticky top-6">
              <h4 className="font-bold text-slate-900 text-base mb-2">Review Deliverable</h4>
              <p className="text-xs text-slate-500 mb-4">
                Approve or request revisions with constructive feedback for the intern.
              </p>

              {reviewError && (
                <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              {submissions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Review actions will activate once the intern uploads a submission.
                </p>
              ) : (
                <form onSubmit={handleReviewSubmission} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Submission Version
                    </label>
                    <select
                      value={selectedSubmissionId || ""}
                      onChange={(e) => setSelectedSubmissionId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      {submissions.map((s) => (
                        <option key={s._id} value={s._id}>
                          Version {s.version} ({s.reviewStatus})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Decision
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDecision("approve")}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 ${
                          decision === "approve"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve Work
                      </button>

                      <button
                        type="button"
                        onClick={() => setDecision("request_changes")}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 ${
                          decision === "request_changes"
                            ? "bg-rose-600 text-white border-rose-600"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Request Changes
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Review Feedback *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Specific observations, praise, or required corrections..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingReview ? "Submitting Review..." : "Record Review & Transition Status"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Append-Only Audit Event Trail */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-indigo-600" /> Immutable Task Audit Log
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Details / Transition</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {events.map((evt) => (
                  <tr key={evt._id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDateTime(evt.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {evt.eventType}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                      {evt.actorName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="capitalize text-slate-600">{evt.actorRole}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {evt.previousValue !== undefined ? (
                        <span>
                          {typeof evt.previousValue === "object"
                            ? JSON.stringify(evt.previousValue)
                            : String(evt.previousValue)}{" "}
                          &rarr;{" "}
                          {typeof evt.newValue === "object"
                            ? JSON.stringify(evt.newValue)
                            : String(evt.newValue)}
                        </span>
                      ) : (
                        <span>
                          {typeof evt.newValue === "object"
                            ? JSON.stringify(evt.newValue)
                            : String(evt.newValue || "—")}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-500 max-w-xs truncate">
                      {evt.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unassign Confirmation Modal */}
        {isUnassignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Unassign Intern</h3>
                  <p className="text-xs text-slate-500">
                    Remove active assignment for{" "}
                    <strong>{intern?.name || task.assignedInternSnapshot?.name || "Intern"}</strong>.
                  </p>
                </div>
              </div>

              {submissions.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                    <AlertCircle className="w-4 h-4" /> Existing Submission Found
                  </div>
                  <p className="text-amber-700">
                    This intern has already submitted <strong>{submissions.length}</strong> version(s) of deliverables (current review status: <strong>{submissions[0].reviewStatus}</strong>). Unassigning will preserve all submitted files, version logs, and reviews in the historical audit trail without deleting them.
                  </p>
                  <p className="text-amber-900 font-mono bg-white/70 p-2 rounded border border-amber-200 truncate">
                    Latest note: {submissions[0].workDescription}
                  </p>
                </div>
              )}

              {unassignError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{unassignError}</span>
                </div>
              )}

              <form onSubmit={handleUnassignIntern} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unassignment Reason (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={unassignReason}
                    onChange={(e) => setUnassignReason(e.target.value)}
                    placeholder="Provide a rationale for audit records (e.g. intern reassigned to other priority, medical leave)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUnassignModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUnassigning}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isUnassigning ? "Unassigning..." : "Confirm Unassignment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Assignment Modal */}
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Transfer Task Assignment</h3>
                  <p className="text-xs text-slate-500">
                    Reassign task from{" "}
                    <strong>{intern?.name || task.assignedInternSnapshot?.name || "current assignee"}</strong> to another intern.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <p>
                  • The original task will be marked as <strong>transferred</strong> and preserved in historical audit records.
                </p>
                <p>
                  • A clean task assignment will be created for the new intern. Previous submissions and approval states are <strong>never copied</strong> into the new assignment.
                </p>
              </div>

              {transferError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              <form onSubmit={handleTransferTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select New Intern *
                  </label>
                  <select
                    value={transferTargetInternId}
                    onChange={(e) => setTransferTargetInternId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="">-- Choose active intern --</option>
                    {interns
                      .filter(
                        (i) =>
                          !task.assignedInternId ||
                          (typeof task.assignedInternId === "object"
                            ? (task.assignedInternId as unknown as { _id: string })._id !== i._id
                            : task.assignedInternId !== i._id)
                      )
                      .map((i) => (
                        <option key={i._id} value={i._id}>
                          {i.name} ({i.internId || i.email}) — {i.department || "General"}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transfer Reason *
                  </label>
                  <textarea
                    rows={3}
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    required
                    placeholder="Explain why this assignment is being transferred (e.g. workload rebalancing, domain expertise handover)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isTransferring}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isTransferring ? "Transferring..." : "Confirm Transfer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
