"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ISubmission } from "@/types";
import { formatDateTime, getStatusBadgeClass } from "@/lib/utils";
import { History, CheckCircle, Clock, FileText, ArrowRight } from "lucide-react";

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
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Total Submissions Filed
            </span>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">
              {stats?.totalSubmissions ?? 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-emerald-600 uppercase">
              Approved Milestones
            </span>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">
              {stats?.approvedTasks ?? 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-amber-600 uppercase">
              Pending Supervisor Review
            </span>
            <p className="text-3xl font-extrabold text-amber-600 mt-2">
              {stats?.pendingReviews ?? 0}
            </p>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">Submission Timeline</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Supervisor Feedback</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Loading your work history...
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      No work submissions found in your history yet.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => {
                    const task = sub.taskId as unknown as { _id: string; title: string };
                    return (
                      <tr key={sub._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {task?.title || "Task"}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">v{sub.version}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClass(
                              sub.reviewStatus
                            )}`}
                          >
                            {sub.reviewStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {formatDateTime(sub.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                          {sub.adminFeedback || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {task?._id && (
                            <Link
                              href={`/intern/tasks/${task._id}`}
                              className="text-indigo-600 hover:underline font-semibold"
                            >
                              View Task &rarr;
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
