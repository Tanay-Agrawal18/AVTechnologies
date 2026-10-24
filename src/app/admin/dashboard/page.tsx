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

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
        {/* Quick action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">Operational Actions</h3>
            <p className="text-xs text-slate-500">Quickly create tasks or manage intern cohorts</p>
          </div>
          <div className="flex flex-col xs:flex-row flex-wrap items-stretch xs:items-center gap-2 sm:gap-3">
            <Link
              href="/admin/import"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-500" /> Bulk Import
            </Link>
            <Link
              href="/admin/interns"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Users className="w-4 h-4 text-slate-500" /> Manage Interns
            </Link>
            <Link
              href="/admin/tasks"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Create New Task
            </Link>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">Active Interns</span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-4">
              {isLoading ? "..." : kpis?.activeInterns ?? 0}
            </p>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Rostered active accounts</span>
              <Link href="/admin/interns" className="text-blue-600 font-medium inline-flex items-center hover:underline">
                View all <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">In Progress Tasks</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-4">
              {isLoading ? "..." : kpis?.inProgress ?? 0}
            </p>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>{kpis?.assigned ?? 0} freshly assigned</span>
              <Link href="/admin/tasks?status=in_progress" className="text-indigo-600 font-medium inline-flex items-center hover:underline">
                Filter <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">Awaiting Review</span>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-4">
              {isLoading ? "..." : kpis?.submitted ?? 0}
            </p>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Ready for supervisor review</span>
              <Link href="/admin/tasks?status=submitted" className="text-amber-600 font-medium inline-flex items-center hover:underline">
                Review <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">Overdue Tasks</span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-4 text-rose-600">
              {isLoading ? "..." : kpis?.overdue ?? 0}
            </p>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Past deadline unapproved</span>
              <Link href="/admin/reports" className="text-rose-600 font-medium inline-flex items-center hover:underline">
                Report <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Operational Status Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 text-lg mb-4">Task Lifecycle Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs text-slate-500 uppercase font-semibold">Assigned</span>
              <p className="text-2xl font-bold text-slate-800 mt-1">{kpis?.assigned ?? 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
              <span className="text-xs text-blue-600 uppercase font-semibold">In Progress</span>
              <p className="text-2xl font-bold text-blue-700 mt-1">{kpis?.inProgress ?? 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
              <span className="text-xs text-amber-700 uppercase font-semibold">Submitted</span>
              <p className="text-2xl font-bold text-amber-800 mt-1">{kpis?.submitted ?? 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-center">
              <span className="text-xs text-rose-700 uppercase font-semibold">Changes Requested</span>
              <p className="text-2xl font-bold text-rose-800 mt-1">{kpis?.changesRequested ?? 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-xs text-emerald-700 uppercase font-semibold">Approved</span>
              <p className="text-2xl font-bold text-emerald-800 mt-1">{kpis?.approved ?? 0}</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
