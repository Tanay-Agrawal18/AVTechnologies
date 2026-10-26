"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AdminAnalyticsData } from "@/services/analyticsService";
import { IUser } from "@/types";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Percent,
  Calendar,
  Filter,
  RefreshCw,
  Building2,
  Inbox,
  ArrowRight,
  ArrowUpRight,
  FileSpreadsheet,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [interns, setInterns] = useState<IUser[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [internFilter, setInternFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "workload" | "departments">("overview");

  const fetchInterns = async () => {
    try {
      const res = await fetch("/api/admin/interns");
      if (res.ok) {
        const data = await res.json();
        const internList: IUser[] = data.interns || [];
        setInterns(internList);

        // Derive distinct non-empty departments
        const depts = Array.from(
          new Set(
            internList
              .map((i) => i.department?.trim())
              .filter((d): d is string => Boolean(d && d.length > 0))
          )
        ).sort();
        setDepartments(depts);
      }
    } catch (err) {
      console.error("Failed to fetch intern list:", err);
    }
  };

  const fetchAnalytics = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const query = new URLSearchParams();
      if (startDate) query.set("startDate", startDate);
      if (endDate) query.set("endDate", endDate);
      if (departmentFilter !== "all") query.set("department", departmentFilter);
      if (internFilter !== "all") query.set("internId", internFilter);

      const res = await fetch(`/api/admin/analytics?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInterns();
  }, []);

  useEffect(() => {
    fetchAnalytics(true);
  }, [startDate, endDate, departmentFilter, internFilter]);

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setDepartmentFilter("all");
    setInternFilter("all");
  };

  const hasActiveFilters = Boolean(
    startDate || endDate || departmentFilter !== "all" || internFilter !== "all"
  );

  return (
    <>
      <DashboardHeader
        title="Admin Performance Analytics"
        description="Team-wide operational telemetry, task lifecycle distributions, and intern workload metrics"
      />

      <main className="p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6">
        {/* ── Top Bar: Filter & Refresh Controls ────────────────── */}
        <div className="iwms-card p-4 sm:p-5 space-y-3.5" style={{ borderRadius: "14px" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-sky-600 shrink-0" />
              <h3 className="font-bold text-sm sm:text-base" style={{ color: "var(--iwms-navy)" }}>
                Analytics Filters & Date Range
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Reset Filters
                </button>
              )}
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
                href="/admin/reports"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-opacity hover:opacity-95"
                style={{ background: "#0284C7" }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Reports & CSV
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--iwms-navy)" }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-black)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--iwms-navy)" }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-black)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--iwms-navy)" }}>
                Filter by Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-black)" }}
              >
                <option value="all">All Departments ({departments.length})</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--iwms-navy)" }}>
                Filter by Intern
              </label>
              <select
                value={internFilter}
                onChange={(e) => setInternFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-black)" }}
              >
                <option value="all">All Interns ({interns.length})</option>
                {interns.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.name} ({i.internId || i.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Key Efficiency & Quality Metric Cards ─────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Completion Rate */}
          <div className="iwms-card p-3.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.5)" }}>
                Completion Rate
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {isLoading ? "—" : `${analytics?.rates.completionRate ?? 0}%`}
              </p>
              <p className="text-[10px] sm:text-xs mt-1 text-slate-500">
                Approved vs actionable tasks
              </p>
            </div>
          </div>

          {/* Review Approval Rate */}
          <div className="iwms-card p-3.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.5)" }}>
                Approval Rate
              </span>
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-sky-600">
                {isLoading ? "—" : `${analytics?.rates.approvalRate ?? 0}%`}
              </p>
              <p className="text-[10px] sm:text-xs mt-1 text-slate-500">
                Approved on evaluation
              </p>
            </div>
          </div>

          {/* Submission Review Backlog */}
          <div className="iwms-card p-3.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.5)" }}>
                Review Backlog
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {isLoading ? "—" : analytics?.reviewBacklog.pendingReviewsCount ?? 0}
              </p>
              <div className="text-[10px] sm:text-xs mt-1 flex items-center justify-between">
                <span className="text-slate-500">Awaiting admin review</span>
                <Link href="/admin/review-queue" className="text-amber-700 font-semibold hover:underline inline-flex items-center">
                  Queue <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="iwms-card p-3.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.5)" }}>
                Overdue Tasks
              </span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                {isLoading ? "—" : analytics?.deadlines.overdueCount ?? 0}
              </p>
              <p className="text-[10px] sm:text-xs mt-1 text-slate-500">
                Passed deadline unapproved
              </p>
            </div>
          </div>
        </div>

        {/* ── Status Lifecycle Breakdown (Horizontal Bar + Cards) ─── */}
        <div className="iwms-card p-4 sm:p-6" style={{ borderRadius: "14px" }}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h3 className="font-bold text-sm sm:text-base" style={{ color: "var(--iwms-navy)" }}>
                Task Status Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Total filtered tasks: {analytics?.statusCounts.total ?? 0}
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700">
              Live DB Counts
            </span>
          </div>

          {/* Visual Bar representation */}
          {analytics && analytics.statusCounts.total > 0 && (
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 mb-4 sm:mb-5">
              <div
                title={`Assigned: ${analytics.statusCounts.assigned}`}
                style={{
                  width: `${(analytics.statusCounts.assigned / analytics.statusCounts.total) * 100}%`,
                  background: "#94a3b8",
                }}
              />
              <div
                title={`In Progress: ${analytics.statusCounts.inProgress}`}
                style={{
                  width: `${(analytics.statusCounts.inProgress / analytics.statusCounts.total) * 100}%`,
                  background: "#0284c7",
                }}
              />
              <div
                title={`Submitted: ${analytics.statusCounts.submitted}`}
                style={{
                  width: `${(analytics.statusCounts.submitted / analytics.statusCounts.total) * 100}%`,
                  background: "#f59e0b",
                }}
              />
              <div
                title={`Changes Requested: ${analytics.statusCounts.changesRequested}`}
                style={{
                  width: `${(analytics.statusCounts.changesRequested / analytics.statusCounts.total) * 100}%`,
                  background: "#ef4444",
                }}
              />
              <div
                title={`Approved: ${analytics.statusCounts.approved}`}
                style={{
                  width: `${(analytics.statusCounts.approved / analytics.statusCounts.total) * 100}%`,
                  background: "#10b981",
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500">Assigned</span>
              <p className="text-xl sm:text-2xl font-extrabold mt-0.5 text-slate-800">
                {analytics?.statusCounts.assigned ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-sky-100 bg-sky-50/70 text-center">
              <span className="text-[10px] font-bold uppercase text-sky-700">In Progress</span>
              <p className="text-xl sm:text-2xl font-extrabold mt-0.5 text-sky-700">
                {analytics?.statusCounts.inProgress ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/70 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-700">Submitted</span>
              <p className="text-xl sm:text-2xl font-extrabold mt-0.5 text-amber-700">
                {analytics?.statusCounts.submitted ?? 0}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/70 text-center">
              <span className="text-[10px] font-bold uppercase text-rose-700">Changes Req.</span>
              <p className="text-xl sm:text-2xl font-extrabold mt-0.5 text-rose-700">
                {analytics?.statusCounts.changesRequested ?? 0}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl border border-emerald-100 bg-emerald-50/70 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Approved</span>
              <p className="text-xl sm:text-2xl font-extrabold mt-0.5 text-emerald-700">
                {analytics?.statusCounts.approved ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* ── Navigation Tabs for Detailed Insights ─────────────── */}
        <div className="flex border-b border-slate-200 gap-6 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === "overview"
                ? "border-sky-600 text-sky-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Deadlines & Backlog
          </button>
          <button
            onClick={() => setActiveTab("workload")}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === "workload"
                ? "border-sky-600 text-sky-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Intern Workload ({analytics?.workloadDistribution.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === "departments"
                ? "border-sky-600 text-sky-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Department Breakdown ({analytics?.departmentBreakdown.length ?? 0})
          </button>
        </div>

        {/* ── Tab 1: Deadlines & Review Queue Backlog ───────────── */}
        {activeTab === "overview" && (
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
                    No tasks due in the next 7 days.
                  </div>
                ) : (
                  analytics?.deadlines.upcomingTasks.map((t) => (
                    <div key={t.id} className="p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{t.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Assigned: {t.assignedIntern?.name || "Unassigned"} &bull; {t.assignedIntern?.department || "General"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-semibold text-sky-700 block">
                          {formatDate(t.dueDate)}
                        </span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold mt-0.5 ${getPriorityBadgeClass(t.priority)}`}>
                          {t.priority}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Critical Overdue Tasks */}
            <div className="iwms-card overflow-hidden" style={{ borderRadius: "14px" }}>
              <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <h4 className="font-bold text-xs sm:text-sm text-rose-900">
                    Overdue Tasks Requiring Action
                  </h4>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                  {analytics?.deadlines.overdueCount ?? 0}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {analytics?.deadlines.overdueTasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-emerald-600 font-medium">
                    ✓ All tasks are on schedule. No overdue items.
                  </div>
                ) : (
                  analytics?.deadlines.overdueTasks.map((t) => (
                    <div key={t.id} className="p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-rose-950 truncate">{t.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Intern: {t.assignedIntern?.name || "Unassigned"} &bull; {t.assignedIntern?.department || "General"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-rose-600 block">
                          Due {formatDate(t.dueDate)}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] capitalize font-medium ${getStatusBadgeClass(t.status)}`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Intern Workload Distribution ───────────────── */}
        {activeTab === "workload" && (
          <div className="iwms-card overflow-hidden shadow-xs" style={{ borderRadius: "14px" }}>
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm" style={{ color: "var(--iwms-navy)" }}>
                Intern Workload Distribution & Task Completion
              </h4>
              <span className="text-xs text-slate-500">
                Sorted by total tasks assigned
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="py-2.5 px-3">Intern</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Active Work</th>
                    <th className="py-2.5 px-3 text-center">Under Review</th>
                    <th className="py-2.5 px-3 text-center">Overdue</th>
                    <th className="py-2.5 px-3 text-center">Approved</th>
                    <th className="py-2.5 px-3 text-center">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics?.workloadDistribution.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No intern workload records found.
                      </td>
                    </tr>
                  ) : (
                    analytics?.workloadDistribution.map((w) => (
                      <tr key={w.internId} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {w.name}
                          <span className="block text-[11px] font-normal text-slate-400 font-mono">
                            {w.email}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {w.department || "General"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-sky-700">
                          {w.assignedCount + w.inProgressCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-600">
                          {w.submittedCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                          {w.overdueCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                          {w.approvedCount}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                            <span>{w.completionRate}%</span>
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${w.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 3: Department-level Comparisons ────────────────── */}
        {activeTab === "departments" && (
          <div className="space-y-4">
            {analytics?.departmentBreakdown.length === 0 ? (
              <div className="iwms-card p-8 text-center" style={{ borderRadius: "14px" }}>
                <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  No department telemetry available
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Assign department tags in Intern Profile management to activate department metrics.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {analytics?.departmentBreakdown.map((dept) => (
                  <div key={dept.department} className="iwms-card p-4 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "14px" }}>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-800">{dept.department}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700">
                          {dept.totalTasks} Tasks
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="p-2 rounded-lg bg-sky-50">
                          <span className="text-[10px] uppercase font-bold text-sky-700">Active</span>
                          <p className="font-extrabold text-sm text-sky-800 mt-0.5">{dept.inProgressTasks}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50">
                          <span className="text-[10px] uppercase font-bold text-emerald-700">Done</span>
                          <p className="font-extrabold text-sm text-emerald-800 mt-0.5">{dept.completedTasks}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-50">
                          <span className="text-[10px] uppercase font-bold text-rose-700">Overdue</span>
                          <p className="font-extrabold text-sm text-rose-800 mt-0.5">{dept.overdueTasks}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Department Completion</span>
                      <span className="font-bold text-emerald-600">{dept.completionRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
