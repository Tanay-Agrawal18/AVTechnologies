"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { formatDate, formatDateTime, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Filter,
  CheckSquare,
  Paperclip,
  Send,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Search,
} from "lucide-react";
import { IUser } from "@/types";

interface ReviewQueueItem {
  taskId: string;
  taskTitle: string;
  taskPriority: "low" | "medium" | "high" | "urgent";
  taskStatus: string;
  taskDueDate: string;
  taskAssignmentDate: string;
  intern: {
    _id: string;
    name: string;
    email: string;
    internId?: string;
    department?: string;
  };
  latestSubmission: {
    _id: string;
    version: number;
    workDescription: string;
    externalLinks: string[];
    attachmentsCount: number;
    reviewStatus: "pending" | "changes_requested" | "approved";
    adminFeedback?: string;
    submittedAt: string;
    reviewedAt?: string;
  };
  totalSubmissionsCount: number;
}

export default function AdminReviewQueuePage() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [interns, setInterns] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<"pending" | "changes_requested" | "approved" | "all">("pending");
  const [internFilter, setInternFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 15 });
  const [counts, setCounts] = useState({ pending: 0, changesRequested: 0, approved: 0, total: 0 });

  // Quick Review Modal State
  const [activeReviewItem, setActiveReviewItem] = useState<ReviewQueueItem | null>(null);
  const [decision, setDecision] = useState<"approve" | "request_changes">("approve");
  const [feedback, setFeedback] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const fetchQueue = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const query = new URLSearchParams();
      query.set("status", statusFilter);
      if (internFilter !== "all") query.set("internId", internFilter);
      if (departmentFilter !== "all") query.set("department", departmentFilter);
      query.set("page", page.toString());
      query.set("limit", "15");

      const res = await fetch(`/api/admin/tasks/review-queue?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.pagination) setPagination(data.pagination);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to load review queue:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchInterns = async () => {
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
    fetchInterns();
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, internFilter, departmentFilter, page]);

  const departments = Array.from(
    new Set(interns.map((i) => i.department).filter(Boolean) as string[])
  );

  const handleOpenReview = (item: ReviewQueueItem) => {
    setActiveReviewItem(item);
    setDecision("approve");
    setFeedback("");
    setReviewError(null);
    setReviewSuccess(null);
  };

  const handleCloseReview = () => {
    setActiveReviewItem(null);
    setReviewError(null);
    setReviewSuccess(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewItem) return;

    if (feedback.trim().length < 3) {
      setReviewError("Please provide supervisory feedback of at least 3 characters.");
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      const taskId = activeReviewItem.taskId;
      const submissionId = activeReviewItem.latestSubmission._id;

      const res = await fetch(
        `/api/admin/tasks/${taskId}/submissions/${submissionId}/review`,
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

      setReviewSuccess(`Submission successfully ${decision === "approve" ? "approved" : "marked for changes"}!`);
      // Update queue immediately without page reload
      setTimeout(() => {
        handleCloseReview();
        fetchQueue(false);
      }, 700);
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : "Review submission failed");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Centralized Review Queue"
        description="Inspect submitted intern deliverables, provide supervisory feedback, and verify work"
      />

      <main className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6">
        {/* KPI / Status Summary Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <button
            onClick={() => { setStatusFilter("pending"); setPage(1); }}
            className={`iwms-card p-3.5 sm:p-4 text-left transition-all rounded-xl border ${
              statusFilter === "pending"
                ? "ring-2 ring-amber-500 bg-amber-50/40 border-amber-300"
                : "hover:bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">
                Awaiting Review
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold mt-1 sm:mt-2 text-amber-600">
              {counts.pending}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Ready for evaluation</p>
          </button>

          <button
            onClick={() => { setStatusFilter("changes_requested"); setPage(1); }}
            className={`iwms-card p-3.5 sm:p-4 text-left transition-all rounded-xl border ${
              statusFilter === "changes_requested"
                ? "ring-2 ring-rose-500 bg-rose-50/40 border-rose-300"
                : "hover:bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-700">
                Changes Requested
              </span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold mt-1 sm:mt-2 text-rose-600">
              {counts.changesRequested}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting intern revision</p>
          </button>

          <button
            onClick={() => { setStatusFilter("approved"); setPage(1); }}
            className={`iwms-card p-3.5 sm:p-4 text-left transition-all rounded-xl border ${
              statusFilter === "approved"
                ? "ring-2 ring-emerald-500 bg-emerald-50/40 border-emerald-300"
                : "hover:bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">
                Approved
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold mt-1 sm:mt-2 text-emerald-600">
              {counts.approved}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Successfully completed</p>
          </button>

          <button
            onClick={() => { setStatusFilter("all"); setPage(1); }}
            className={`iwms-card p-3.5 sm:p-4 text-left transition-all rounded-xl border ${
              statusFilter === "all"
                ? "ring-2 ring-sky-500 bg-sky-50/40 border-sky-300"
                : "hover:bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-sky-700">
                All Submissions
              </span>
              <CheckSquare className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold mt-1 sm:mt-2" style={{ color: "var(--iwms-navy)" }}>
              {counts.total}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total submission records</p>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200">
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Filter className="w-3.5 h-3.5 text-sky-600" />
              <span>Filter By:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "pending" | "changes_requested" | "approved" | "all");
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="pending">Status: Awaiting Review</option>
              <option value="changes_requested">Status: Changes Requested</option>
              <option value="approved">Status: Approved</option>
              <option value="all">Status: All Records</option>
            </select>

            <select
              value={internFilter}
              onChange={(e) => { setInternFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[200px] truncate"
            >
              <option value="all">All Interns</option>
              {interns.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.name} ({i.internId || i.email})
                </option>
              ))}
            </select>

            {departments.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <button
              onClick={() => fetchQueue(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 disabled:opacity-50"
              title="Refresh queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-600" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Showing {items.length} of {pagination.total} item{pagination.total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Queue Items Table or Cards */}
        {isLoading ? (
          <div className="p-12 text-center text-xs sm:text-sm text-slate-500">
            Loading review queue records…
          </div>
        ) : items.length === 0 ? (
          <div className="iwms-card py-12 px-6 text-center rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500/60" />
            <h3 className="font-bold text-base sm:text-lg text-slate-800">
              No Submissions Awaiting Action
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {statusFilter === "pending"
                ? "The queue is clean! All submitted intern assignments have been reviewed."
                : "No submission records match the selected filter criteria."}
            </p>
            {statusFilter !== "all" && (
              <button
                onClick={() => { setStatusFilter("all"); setPage(1); }}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline"
              >
                View all submission records &rarr;
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.taskId}-${item.latestSubmission._id}`}
                className="iwms-card p-4 sm:p-5 rounded-xl border border-slate-200 transition-all hover:border-slate-300 hover:shadow-xs space-y-3"
              >
                {/* Header row: Intern info + Status & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-sky-200"
                      style={{ background: "#E0F2FE", color: "#0369A1" }}
                    >
                      {item.intern.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{item.intern.name}</span>
                        {item.intern.internId && (
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.intern.internId}
                          </span>
                        )}
                        {item.intern.department && (
                          <span className="hidden md:inline text-[10px] font-medium text-slate-500">
                            &bull; {item.intern.department}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{item.intern.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClass(
                        item.latestSubmission.reviewStatus
                      )}`}
                    >
                      {item.latestSubmission.reviewStatus.replace("_", " ")}
                    </span>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${getPriorityBadgeClass(
                        item.taskPriority
                      )}`}
                    >
                      {item.taskPriority}
                    </span>
                  </div>
                </div>

                {/* Body: Task Title + Deliverable Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="lg:col-span-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/tasks/${item.taskId}`}
                        className="font-bold text-sm sm:text-base text-slate-900 hover:text-sky-600 transition-colors inline-flex items-center gap-1.5"
                      >
                        {item.taskTitle}
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </div>

                    <p className="text-xs text-slate-700 whitespace-pre-line bg-slate-50 p-2.5 rounded-lg border border-slate-150 line-clamp-3">
                      <strong className="text-slate-900 font-semibold">Deliverable (v{item.latestSubmission.version}): </strong>
                      {item.latestSubmission.workDescription}
                    </p>

                    {item.latestSubmission.adminFeedback && (
                      <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                        <strong className="text-amber-800 font-semibold block text-[10px] uppercase">
                          Previous Feedback:
                        </strong>
                        <p className="text-amber-900 text-[11px] mt-0.5">{item.latestSubmission.adminFeedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Right metadata + Actions */}
                  <div className="flex flex-col justify-between space-y-2 lg:border-l lg:border-slate-100 lg:pl-4">
                    <div className="space-y-1 text-[11px] text-slate-500">
                      <div>
                        Submitted:{" "}
                        <strong className="text-slate-800">
                          {formatDateTime(item.latestSubmission.submittedAt)}
                        </strong>
                      </div>
                      <div>
                        Deadline:{" "}
                        <strong className="text-slate-800">
                          {formatDate(item.taskDueDate)}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2 pt-1 text-[10px]">
                        {item.latestSubmission.externalLinks.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                            <ExternalLink className="w-3 h-3" />
                            {item.latestSubmission.externalLinks.length} link{item.latestSubmission.externalLinks.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {item.latestSubmission.attachmentsCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            <Paperclip className="w-3 h-3" />
                            {item.latestSubmission.attachmentsCount} file{item.latestSubmission.attachmentsCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="text-slate-400">
                          Version {item.latestSubmission.version} of {item.totalSubmissionsCount}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReview(item)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-white shadow-xs transition-all hover:opacity-95"
                        style={{ background: "#0284C7" }}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {item.latestSubmission.reviewStatus === "pending"
                          ? "Review Deliverable"
                          : "Inspect & Update"}
                      </button>
                      <Link
                        href={`/admin/tasks/${item.taskId}`}
                        className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                        title="View full audit log"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
                >
                  &larr; Previous
                </button>
                <span className="text-xs text-slate-600 font-medium">
                  Page {page} of {pagination.totalPages}
                </span>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Review Modal */}
        {activeReviewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    Review Deliverables
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeReviewItem.intern.name} &bull; {activeReviewItem.taskTitle} (v{activeReviewItem.latestSubmission.version})
                  </p>
                </div>
                <button
                  onClick={handleCloseReview}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  &times;
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* Submission Details Preview */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Intern Description:
                  </span>
                  <p className="text-xs text-slate-800 whitespace-pre-line">
                    {activeReviewItem.latestSubmission.workDescription}
                  </p>

                  {activeReviewItem.latestSubmission.externalLinks.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Links:
                      </span>
                      <ul className="space-y-1">
                        {activeReviewItem.latestSubmission.externalLinks.map((link, idx) => (
                          <li key={idx}>
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1 font-mono truncate max-w-full"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {reviewSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{reviewSuccess}</span>
                  </div>
                )}

                {reviewError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {/* Review Action Form */}
                <form onSubmit={handleSubmitReview} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Review Decision *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          decision === "approve"
                            ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold ring-1 ring-emerald-500"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="decision"
                          value="approve"
                          checked={decision === "approve"}
                          onChange={() => setDecision("approve")}
                          className="sr-only"
                        />
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="text-xs">Approve Work</div>
                          <div className="text-[10px] text-slate-500 font-normal">Mark task as approved</div>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          decision === "request_changes"
                            ? "border-rose-500 bg-rose-50/50 text-rose-900 font-semibold ring-1 ring-rose-500"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="decision"
                          value="request_changes"
                          checked={decision === "request_changes"}
                          onChange={() => setDecision("request_changes")}
                          className="sr-only"
                        />
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <div className="text-xs">Request Changes</div>
                          <div className="text-[10px] text-slate-500 font-normal">Ask intern to revise</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supervisory Feedback &amp; Instructions *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder={
                        decision === "approve"
                          ? "Great job! Deliverables meet all project requirements..."
                          : "Please address the following items before approval: 1. Fix mobile overflow..."
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Feedback is permanently recorded into the task audit history and shown to the intern.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleCloseReview}
                      disabled={isSubmittingReview}
                      className="px-4 py-2 text-xs font-medium text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-all disabled:opacity-50 ${
                        decision === "approve"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-rose-600 hover:bg-rose-700"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSubmittingReview
                        ? "Submitting Review…"
                        : decision === "approve"
                        ? "Confirm Approval"
                        : "Send Revision Request"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
