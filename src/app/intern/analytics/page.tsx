"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { InternAnalyticsData } from "@/services/analyticsService";
import { formatDate, formatDateTime, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Percent,
  Calendar,
  MessageSquare,
  ArrowRight,
  ListTodo,
  RefreshCw,
  Award,
} from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

export default function InternAnalyticsPage() {
  const [analytics, setAnalytics] = useState<InternAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnalytics = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch("/api/intern/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error("Failed to load personal analytics:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(true);
  }, []);

  const statusCounts = analytics?.statusCounts;
  const activeTasksCount =
    (statusCounts?.assigned ?? 0) + (statusCounts?.inProgress ?? 0);

  return (
    <>
      <DashboardHeader
        title="Personal Performance & Analytics"
        description="Your individual deliverable throughput, completion metrics, and supervisor feedback history"
      />

      <main className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6">
        {/* ── Top Bar: Intern Summary & Refresh ─────────────────── */}
        <div className="iwms-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderRadius: "14px" }}>
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-sm sm:text-base" style={{ color: "var(--iwms-navy)" }}>
                {analytics?.intern.name || "Intern"}
              </h3>
              {analytics?.intern.internId && (
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700">
                  {analytics.intern.internId}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Department: {analytics?.intern.department || "General"} &bull; {analytics?.intern.email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAnalytics(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-slate-50"
              style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-navy)" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/intern/tasks"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-95"
              style={{ background: "#0284C7" }}
            >
              My Tasks <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ── Metric Cards Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Personal Completion Rate */}
          <div className="iwms-card p-3.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Completion Rate
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {isLoading ? "—" : `${analytics?.completionRate ?? 0}%`}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                {statusCounts?.approved ?? 0} of {statusCounts?.total ?? 0} assigned tasks
              </p>
            </div>
          </div>

          {/* Active Work In Hand */}
          <div className="iwms-card p-3.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Work
              </span>
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-sky-600">
                {isLoading ? "—" : activeTasksCount}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                {statusCounts?.inProgress ?? 0} in progress, {statusCounts?.assigned ?? 0} unstarted
              </p>
            </div>
          </div>

          {/* Under Supervisor Review */}
          <div className="iwms-card p-3.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Under Review
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {isLoading ? "—" : statusCounts?.submitted ?? 0}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                Submitted to supervisor
              </p>
            </div>
          </div>

          {/* Overdue Deadlines */}
          <div className="iwms-card p-3.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Overdue
              </span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                {isLoading ? "—" : analytics?.deadlines.overdueCount ?? 0}
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                Tasks requiring immediate focus
              </p>
            </div>
          </div>
        </div>

        {/* ── Status Lifecycle Overview ─────────────────────────── */}
        <div className="iwms-card p-4 sm:p-6" style={{ borderRadius: "14px" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm sm:text-base" style={{ color: "var(--iwms-navy)" }}>
              Lifecycle Status Distribution
            </h3>
            <span className="text-xs text-slate-500">
              Personal denominator: {statusCounts?.total ?? 0} Total Tasks
            </span>
          </div>

          {/* Progress visual bar */}
          {statusCounts && statusCounts.total > 0 && (
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-100 mb-4">
              <div
                title={`Assigned: ${statusCounts.assigned}`}
                style={{
                  width: `${(statusCounts.assigned / statusCounts.total) * 100}%`,
                  background: "#94a3b8",
                }}
              />
              <div
                title={`In Progress: ${statusCounts.inProgress}`}
                style={{
                  width: `${(statusCounts.inProgress / statusCounts.total) * 100}%`,
                  background: "#0284c7",
                }}
              />
              <div
                title={`Submitted: ${statusCounts.submitted}`}
                style={{
                  width: `${(statusCounts.submitted / statusCounts.total) * 100}%`,
                  background: "#f59e0b",
                }}
              />
              <div
                title={`Changes Requested: ${statusCounts.changesRequested}`}
                style={{
                  width: `${(statusCounts.changesRequested / statusCounts.total) * 100}%`,
                  background: "#ef4444",
                }}
              />
              <div
                title={`Approved: ${statusCounts.approved}`}
                style={{
                  width: `${(statusCounts.approved / statusCounts.total) * 100}%`,
                  background: "#10b981",
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500">Assigned</span>
              <p className="text-xl font-extrabold mt-0.5 text-slate-800">
                {statusCounts?.assigned ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-sky-100 bg-sky-50/70 text-center">
              <span className="text-[10px] font-bold uppercase text-sky-700">In Progress</span>
              <p className="text-xl font-extrabold mt-0.5 text-sky-700">
                {statusCounts?.inProgress ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/70 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-700">Submitted</span>
              <p className="text-xl font-extrabold mt-0.5 text-amber-700">
                {statusCounts?.submitted ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/70 text-center">
              <span className="text-[10px] font-bold uppercase text-rose-700">Changes Req.</span>
              <p className="text-xl font-extrabold mt-0.5 text-rose-700">
                {statusCounts?.changesRequested ?? 0}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl border border-emerald-100 bg-emerald-50/70 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Approved</span>
              <p className="text-xl font-extrabold mt-0.5 text-emerald-700">
                {statusCounts?.approved ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* ── Deadlines & Milestones Grid ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Upcoming Deadlines (Next 7 Days) */}
          <div className="iwms-card overflow-hidden" style={{ borderRadius: "14px" }}>
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                <h4 className="font-bold text-xs sm:text-sm" style={{ color: "var(--iwms-navy)" }}>
                  Upcoming Deadlines (Next 7 Days)
                </h4>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700">
                {analytics?.deadlines.upcomingDeadlinesCount ?? 0}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {analytics?.deadlines.upcomingTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No upcoming deadlines in the next 7 days.
                </div>
              ) : (
                analytics?.deadlines.upcomingTasks.map((t) => (
                  <div key={t.id} className="p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <Link
                        href={`/intern/tasks/${t.id}`}
                        className="font-semibold text-slate-800 hover:text-sky-600 truncate block"
                      >
                        {t.title}
                      </Link>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold mt-1 ${getPriorityBadgeClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-semibold text-sky-700 block">
                        Due {formatDate(t.dueDate)}
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] capitalize font-medium mt-0.5 ${getStatusBadgeClass(t.status)}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Overdue Deadlines Alert */}
          <div className="iwms-card overflow-hidden" style={{ borderRadius: "14px" }}>
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h4 className="font-bold text-xs sm:text-sm text-rose-900">
                  Past Deadlines (Action Required)
                </h4>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                {analytics?.deadlines.overdueCount ?? 0}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {analytics?.deadlines.overdueTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-emerald-600 font-medium">
                  ✓ Great job! You have no overdue assignments.
                </div>
              ) : (
                analytics?.deadlines.overdueTasks.map((t) => (
                  <div key={t.id} className="p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <Link
                        href={`/intern/tasks/${t.id}`}
                        className="font-semibold text-rose-950 hover:underline truncate block"
                      >
                        {t.title}
                      </Link>
                      <span className="text-[10px] text-rose-700 mt-0.5 block">
                        Urgent priority deliverable
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-rose-600 block">
                        Due {formatDate(t.dueDate)}
                      </span>
                      <Link
                        href={`/intern/tasks/${t.id}`}
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors mt-0.5"
                      >
                        Submit Now
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Supervisor Feedback & Review Activity ─────────────── */}
        <div className="iwms-card overflow-hidden shadow-xs" style={{ borderRadius: "14px" }}>
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-600" />
              <h4 className="font-bold text-xs sm:text-sm" style={{ color: "var(--iwms-navy)" }}>
                Supervisor Review Activity & Feedback
              </h4>
            </div>
            <Link
              href="/intern/history"
              className="text-xs font-semibold text-sky-600 hover:underline inline-flex items-center"
            >
              Full Work History <ArrowRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {analytics?.recentActivity.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No submissions or reviews recorded yet. Submit your task deliverables to view supervisor feedback here.
              </div>
            ) : (
              analytics?.recentActivity.map((act) => (
                <div key={act.id} className="p-3.5 sm:p-4 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-800 truncate">
                        {act.taskTitle}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        v{act.version}
                      </span>
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${getStatusBadgeClass(
                        act.reviewStatus
                      )}`}
                    >
                      {act.reviewStatus.replace("_", " ")}
                    </span>
                  </div>

                  {act.adminFeedback ? (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                      <span className="font-bold text-[11px] text-slate-800 block mb-0.5">
                        Supervisor Feedback:
                      </span>
                      <p className="text-xs italic leading-relaxed">
                        &ldquo;{act.adminFeedback}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Awaiting supervisor review decision.
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Submitted: {formatDateTime(act.submittedAt)}</span>
                    {act.taskId && (
                      <Link
                        href={`/intern/tasks/${act.taskId}`}
                        className="font-semibold text-sky-600 hover:underline"
                      >
                        View Task Details &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
