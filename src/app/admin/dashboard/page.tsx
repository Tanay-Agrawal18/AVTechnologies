"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { KPIStats } from "@/services/reportService";
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  FileSpreadsheet,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports?kpi=true")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.kpis) setKpis(data.kpis);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <DashboardHeader
        title="Admin Overview"
        description="Key performance indicators and operational task metrics across the organization"
      />

      <main className="p-2.5 sm:p-5 lg:p-8 space-y-2.5 sm:space-y-5 lg:space-y-8 max-w-7xl mx-auto">
        {/* Quick action buttons */}
        <div className="iwms-card p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
          <div>
            <h3 className="font-bold text-xs sm:text-base leading-tight" style={{ color: "var(--iwms-navy)" }}>Operational Actions</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Quickly create tasks or manage intern cohorts</p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-row flex-wrap items-center gap-1.5 sm:gap-2.5">
            <Link
              href="/admin/import"
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 text-[11px] sm:text-sm font-medium rounded-xl border transition-colors hover:bg-slate-50 active:scale-95"
              style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-navy)" }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 shrink-0" />
              <span>Bulk Import</span>
            </Link>
            <Link
              href="/admin/interns"
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 text-[11px] sm:text-sm font-medium rounded-xl border transition-colors hover:bg-slate-50 active:scale-95"
              style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-navy)" }}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 shrink-0" />
              <span>Manage Interns</span>
            </Link>
            <Link
              href="/admin/tasks"
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 text-[11px] sm:text-sm font-semibold text-white rounded-xl shadow-xs transition-all hover:opacity-95 active:scale-95"
              style={{ background: "#0284C7" }}
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Create New Task</span>
            </Link>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="iwms-card p-2.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.55)" }}>Active Interns</span>
              <div className="p-1.5 sm:p-2 bg-sky-50 rounded-lg shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-sky-600" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl font-extrabold mt-1 sm:mt-3" style={{ color: "var(--iwms-navy)" }}>
              {isLoading ? "..." : kpis?.activeInterns ?? 0}
            </p>
            <div className="mt-1.5 pt-1 border-t border-slate-100 sm:border-0 text-[10px] sm:text-xs flex items-center justify-between gap-1" style={{ color: "rgba(11,31,58,0.55)" }}>
              <span className="truncate">Rostered</span>
              <Link href="/admin/interns" className="font-semibold inline-flex items-center hover:underline shrink-0" style={{ color: "#0284C7" }}>
                View <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </div>

          <div className="iwms-card p-2.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.55)" }}>In Progress</span>
              <div className="p-1.5 sm:p-2 bg-sky-50 rounded-lg shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-sky-600" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl font-extrabold mt-1 sm:mt-3 text-sky-600">
              {isLoading ? "..." : kpis?.inProgress ?? 0}
            </p>
            <div className="mt-1.5 pt-1 border-t border-slate-100 sm:border-0 text-[10px] sm:text-xs flex items-center justify-between gap-1" style={{ color: "rgba(11,31,58,0.55)" }}>
              <span className="truncate">Active ({kpis?.assigned ?? 0} wait)</span>
              <Link href="/admin/tasks?status=in_progress" className="font-semibold inline-flex items-center hover:underline shrink-0" style={{ color: "#0284C7" }}>
                Filter <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </div>

          <div className="iwms-card p-2.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.55)" }}>Awaiting Review</span>
              <div className="p-1.5 sm:p-2 bg-amber-50 rounded-lg shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl font-extrabold mt-1 sm:mt-3 text-amber-600">
              {isLoading ? "..." : kpis?.submitted ?? 0}
            </p>
            <div className="mt-1.5 pt-1 border-t border-slate-100 sm:border-0 text-[10px] sm:text-xs flex items-center justify-between gap-1" style={{ color: "rgba(11,31,58,0.55)" }}>
              <span className="truncate">Ready</span>
              <Link href="/admin/tasks?status=submitted" className="text-amber-600 font-semibold inline-flex items-center hover:underline shrink-0">
                Review <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </div>

          <div className="iwms-card p-2.5 sm:p-5 flex flex-col justify-between" style={{ borderRadius: "12px" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.55)" }}>Overdue Tasks</span>
              <div className="p-1.5 sm:p-2 bg-rose-50 rounded-lg shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-rose-600" />
              </div>
            </div>
            <p className="text-xl sm:text-3xl font-extrabold mt-1 sm:mt-3 text-rose-600">
              {isLoading ? "..." : kpis?.overdue ?? 0}
            </p>
            <div className="mt-1.5 pt-1 border-t border-slate-100 sm:border-0 text-[10px] sm:text-xs flex items-center justify-between gap-1" style={{ color: "rgba(11,31,58,0.55)" }}>
              <span className="truncate">Past due</span>
              <Link href="/admin/reports" className="text-rose-600 font-semibold inline-flex items-center hover:underline shrink-0">
                Report <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Operational Status Breakdown */}
        <div className="iwms-card p-3 sm:p-6" style={{ borderRadius: "14px" }}>
          <h3 className="font-bold text-xs sm:text-base mb-2.5 sm:mb-4" style={{ color: "var(--iwms-navy)" }}>Task Lifecycle Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
            <div className="p-2 sm:p-4 rounded-xl text-center border" style={{ background: "rgba(11,31,58,0.02)", borderColor: "var(--iwms-border)" }}>
              <span className="text-[9px] sm:text-xs uppercase font-bold tracking-wider" style={{ color: "rgba(11,31,58,0.55)" }}>Assigned</span>
              <p className="text-lg sm:text-2xl font-extrabold mt-0.5" style={{ color: "var(--iwms-navy)" }}>{kpis?.assigned ?? 0}</p>
            </div>
            <div className="p-2 sm:p-4 rounded-xl text-center border border-sky-100 bg-sky-50/60">
              <span className="text-[9px] sm:text-xs text-sky-700 uppercase font-bold tracking-wider">In Progress</span>
              <p className="text-lg sm:text-2xl font-extrabold text-sky-700 mt-0.5">{kpis?.inProgress ?? 0}</p>
            </div>
            <div className="p-2 sm:p-4 rounded-xl text-center border border-amber-100 bg-amber-50/60">
              <span className="text-[9px] sm:text-xs text-amber-700 uppercase font-bold tracking-wider">Submitted</span>
              <p className="text-lg sm:text-2xl font-extrabold text-amber-800 mt-0.5">{kpis?.submitted ?? 0}</p>
            </div>
            <div className="p-2 sm:p-4 rounded-xl text-center border border-rose-100 bg-rose-50/60">
              <span className="text-[9px] sm:text-xs text-rose-700 uppercase font-bold tracking-wider">Changes Req.</span>
              <p className="text-lg sm:text-2xl font-extrabold text-rose-800 mt-0.5">{kpis?.changesRequested ?? 0}</p>
            </div>
            <div className="col-span-2 sm:col-span-1 p-2 sm:p-4 rounded-xl text-center border border-emerald-100 bg-emerald-50/60">
              <span className="text-[9px] sm:text-xs text-emerald-700 uppercase font-bold tracking-wider">Approved</span>
              <p className="text-lg sm:text-2xl font-extrabold text-emerald-800 mt-0.5">{kpis?.approved ?? 0}</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
