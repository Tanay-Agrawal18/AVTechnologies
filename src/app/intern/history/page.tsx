"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ISubmission } from "@/types";
import { formatDateTime, getStatusBadgeClass } from "@/lib/utils";
import { History, CheckCircle, Clock, FileText } from "lucide-react";

export default function InternHistoryPage() {
  const [submissions, setSubmissions] = useState<ISubmission[]>([]);
  const [stats, setStats] = useState<{
    totalSubmissions: number;
    approvedTasks: number;
    pendingReviews: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/intern/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSubmissions(data.submissions || []);
          setStats(data.stats);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <DashboardHeader
        title="Personal Work History"
        description="Comprehensive log of all deliverable submissions, feedback received, and approved milestones"
      />

      <main className="p-8 space-y-8">
        {/* ── KPI Strip ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Total */}
          <div
            className="iwms-card p-6 flex flex-col gap-2"
            style={{ borderRadius: "14px", borderLeft: "3px solid var(--iwms-sky)" }}
          >
            <div className="flex items-center gap-2">
              <FileText
                className="w-4 h-4"
                style={{ color: "var(--iwms-sky)" }}
              />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "rgba(11,31,58,.50)" }}
              >
                Total Submissions Filed
              </span>
            </div>
            <p
              className="text-3xl font-extrabold leading-none"
              style={{ color: "var(--iwms-black)" }}
            >
              {stats?.totalSubmissions ?? 0}
            </p>
          </div>

          {/* Approved */}
          <div
            className="iwms-card p-6 flex flex-col gap-2"
            style={{ borderRadius: "14px", borderLeft: "3px solid #10b981" }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "rgba(11,31,58,.50)" }}
              >
                Approved Milestones
              </span>
            </div>
            <p className="text-3xl font-extrabold leading-none text-emerald-500">
              {stats?.approvedTasks ?? 0}
            </p>
          </div>

          {/* Pending */}
          <div
            className="iwms-card p-6 flex flex-col gap-2"
            style={{ borderRadius: "14px", borderLeft: "3px solid #f59e0b" }}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "rgba(11,31,58,.50)" }}
              >
                Pending Supervisor Review
              </span>
            </div>
            <p className="text-3xl font-extrabold leading-none text-amber-500">
              {stats?.pendingReviews ?? 0}
            </p>
          </div>
        </div>

        {/* ── Submissions Table ───────────────────────────────── */}
        <div
          className="iwms-card overflow-hidden"
          style={{ borderRadius: "14px" }}
        >
          <div
            className="px-6 py-4"
            style={{ borderBottom: "1px solid var(--iwms-border)" }}
          >
            <h3
              className="font-bold text-base"
              style={{ color: "var(--iwms-black)" }}
            >
              Submission Timeline
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: "rgba(11,31,58,.03)",
                    borderBottom: "1px solid var(--iwms-border)",
                    color: "rgba(11,31,58,.50)",
                  }}
                >
                  <th className="py-3 px-5">Task</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Supervisor Feedback</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center"
                      style={{ color: "rgba(11,31,58,.40)" }}
                    >
                      Loading your work history…
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <History
                        className="w-8 h-8 mx-auto mb-2"
                        style={{ color: "rgba(56,189,248,.35)" }}
                      />
                      <p style={{ color: "rgba(11,31,58,.45)" }}>
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
                          className="py-3 px-5 font-semibold"
                          style={{ color: "var(--iwms-black)" }}
                        >
                          {task?.title || "Task"}
                        </td>
                        <td
                          className="py-3 px-4 font-mono font-medium"
                          style={{ color: "var(--iwms-navy)" }}
                        >
                          v{sub.version}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClass(
                              sub.reviewStatus
                            )}`}
                          >
                            {sub.reviewStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td
                          className="py-3 px-4 font-mono"
                          style={{ color: "rgba(11,31,58,.50)" }}
                        >
                          {formatDateTime(sub.createdAt)}
                        </td>
                        <td
                          className="py-3 px-4 max-w-xs truncate"
                          style={{ color: "var(--iwms-navy)" }}
                        >
                          {sub.adminFeedback || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {task?._id && (
                            <Link
                              href={`/intern/tasks/${task._id}`}
                              className="font-semibold hover:underline"
                              style={{ color: "var(--iwms-sky)" }}
                            >
                              View Task →
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
