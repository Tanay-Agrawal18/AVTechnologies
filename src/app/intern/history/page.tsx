"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ISubmission } from "@/types";
import { formatDateTime, getStatusBadgeClass } from "@/lib/utils";
import { History, CheckCircle, Clock, FileText } from "lucide-react";
import { Skeleton, TableSkeleton } from "@/components/Skeleton";

export default function InternHistoryPage() {
  const [submissions, setSubmissions] = useState<ISubmission[]>([]);
  const [stats, setStats] = useState<{
    totalSubmissions: number;
    approvedTasks: number;
    pendingReviews: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = () => {
    fetch("/api/intern/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSubmissions(data.submissions || []);
          setStats(data.stats);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchHistory();

    const handleRevalidate = () => {
      fetchHistory();
    };
    window.addEventListener("iwms:revalidate", handleRevalidate);
    return () => {
      window.removeEventListener("iwms:revalidate", handleRevalidate);
    };
  }, []);

  return (
    <>
      <DashboardHeader
        title="Personal Work History"
        description="Comprehensive log of all deliverable submissions, feedback received, and approved milestones"
      />

      <main className="p-3 sm:p-5 lg:p-8 space-y-3 sm:space-y-5 lg:space-y-8">
        {/* ── KPI Strip ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
          {/* Total */}
          <div
            className="iwms-card p-3 sm:p-5 flex items-center sm:flex-col sm:items-start justify-between sm:justify-start gap-2"
            style={{ borderRadius: "14px" }}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-50 sm:p-0 sm:bg-transparent">
                <FileText
                  className="w-4 h-4 shrink-0"
                  style={{ color: "var(--iwms-sky)" }}
                />
              </div>
              <span
                className="text-[10px] sm:text-xs font-bold uppercase tracking-wider"
                style={{ color: "rgba(11,31,58,.50)" }}
              >
                Total Submissions
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 sm:h-9 w-14" />
            ) : (
              <p
                className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-none"
                style={{ color: "var(--iwms-black)" }}
              >
                {stats?.totalSubmissions ?? 0}
              </p>
            )}
          </div>

          {/* Approved */}
          <div
            className="iwms-card p-3 sm:p-5 flex items-center sm:flex-col sm:items-start justify-between sm:justify-start gap-2"
            style={{ borderRadius: "14px" }}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 sm:p-0 sm:bg-transparent">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <span
                className="text-[10px] sm:text-xs font-bold uppercase tracking-wider"
                style={{ color: "rgba(11,31,58,.50)" }}
              >
                Approved Milestones
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 sm:h-9 w-14" />
            ) : (
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-none text-emerald-500">
                {stats?.approvedTasks ?? 0}
              </p>
            )}
          </div>

          {/* Pending */}
          <div
            className="iwms-card p-3 sm:p-5 flex items-center sm:flex-col sm:items-start justify-between sm:justify-start gap-2"
            style={{ borderRadius: "14px" }}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 sm:p-0 sm:bg-transparent">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <span
                className="text-[10px] sm:text-xs font-bold uppercase tracking-wider"
                style={{ color: "rgba(11,31,58,.50)" }}
              >
                Pending Review
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 sm:h-9 w-14" />
            ) : (
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-none text-amber-500">
                {stats?.pendingReviews ?? 0}
              </p>
            )}
          </div>
        </div>

        {/* ── Submissions Table ───────────────────────────────── */}
        <div
          className="iwms-card overflow-hidden"
          style={{ borderRadius: "14px" }}
        >
          <div
            className="px-3.5 py-3 sm:px-6 sm:py-4"
            style={{ borderBottom: "1px solid var(--iwms-border)" }}
          >
            <h3
              className="font-bold text-xs sm:text-sm md:text-base"
              style={{ color: "var(--iwms-black)" }}
            >
              Submission Timeline
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] sm:text-xs min-w-[540px]">
              <thead>
                <tr
                  className="text-[10px] sm:text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: "rgba(11,31,58,.03)",
                    borderBottom: "1px solid var(--iwms-border)",
                    color: "rgba(11,31,58,.50)",
                  }}
                >
                  <th className="py-2.5 px-3 sm:px-4">Task</th>
                  <th className="py-2.5 px-2.5 sm:px-3">Version</th>
                  <th className="py-2.5 px-2.5 sm:px-3">Status</th>
                  <th className="py-2.5 px-2.5 sm:px-3">Date</th>
                  <th className="py-2.5 px-2.5 sm:px-3">Feedback</th>
                  <th className="py-2.5 px-3 sm:px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton rows={4} columns={6} />
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center">
                      <History
                        className="w-6 h-6 mx-auto mb-1.5"
                        style={{ color: "rgba(56,189,248,.35)" }}
                      />
                      <p className="text-xs" style={{ color: "rgba(11,31,58,.45)" }}>
                        No work submissions found in your history yet.
                      </p>
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => {
                    const task = sub.taskId as unknown as {
                      _id: string;
                      title: string;
                    };
                    return (
                      <tr
                        key={sub._id}
                        className="transition-colors hover:bg-sky-50/40"
                        style={{ borderBottom: "1px solid var(--iwms-border)" }}
                      >
                        <td
                          className="py-2.5 px-3 sm:px-4 font-semibold max-w-[140px] truncate"
                          style={{ color: "var(--iwms-black)" }}
                          title={task?.title}
                        >
                          {task?.title || "Task"}
                        </td>
                        <td
                          className="py-2.5 px-2.5 sm:px-3 font-mono font-medium text-[10px] sm:text-xs"
                          style={{ color: "var(--iwms-navy)" }}
                        >
                          v{sub.version}
                        </td>
                        <td className="py-2.5 px-2.5 sm:px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium border capitalize whitespace-nowrap ${getStatusBadgeClass(
                              sub.reviewStatus
                            )}`}
                          >
                            {sub.reviewStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td
                          className="py-2.5 px-2.5 sm:px-3 font-mono text-[10px] sm:text-xs whitespace-nowrap"
                          style={{ color: "rgba(11,31,58,.50)" }}
                        >
                          {formatDateTime(sub.createdAt)}
                        </td>
                        <td
                          className="py-2.5 px-2.5 sm:px-3 max-w-[150px] truncate text-[10px] sm:text-xs"
                          style={{ color: "var(--iwms-navy)" }}
                          title={sub.adminFeedback}
                        >
                          {sub.adminFeedback || "—"}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">
                          {task?._id && (
                            <Link
                              href={`/intern/tasks/${task._id}`}
                              className="font-semibold hover:underline text-[10px] sm:text-xs"
                              style={{ color: "var(--iwms-sky)" }}
                            >
                              View →
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
