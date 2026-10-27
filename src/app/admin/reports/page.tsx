"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { KPIStats } from "@/services/reportService";
import { IUser, ITask } from "@/types";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  BarChart3,
  Download,
  Filter,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function AdminReportsPage() {
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [interns, setInterns] = useState<IUser[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [internFilter, setInternFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const fetchKpis = async () => {
    const res = await fetch("/api/admin/reports?kpi=true");
    if (res.ok) {
      const data = await res.json();
      setKpis(data.kpis);
    }
  };

  const fetchInterns = async () => {
    const res = await fetch("/api/admin/interns");
    if (res.ok) {
      const data = await res.json();
      setInterns(data.interns || []);
    }
  };

  const fetchFilteredTasks = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (internFilter !== "all") query.set("internId", internFilter);
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (startDate) query.set("startDate", startDate);
      if (endDate) query.set("endDate", endDate);
      if (includeArchived) query.set("archived", "true");

      const res = await fetch(`/api/admin/reports?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    fetchInterns();

    const handleRevalidate = () => {
      fetchKpis();
      fetchFilteredTasks();
    };
    window.addEventListener("iwms:revalidate", handleRevalidate);
    return () => {
      window.removeEventListener("iwms:revalidate", handleRevalidate);
    };
  }, []);

  useEffect(() => {
    fetchFilteredTasks();
  }, [internFilter, statusFilter, startDate, endDate, includeArchived]);

  const handleExportCSV = () => {
    const query = new URLSearchParams();
    query.set("export", "csv");
    if (internFilter !== "all") query.set("internId", internFilter);
    if (statusFilter !== "all") query.set("status", statusFilter);
    if (startDate) query.set("startDate", startDate);
    if (endDate) query.set("endDate", endDate);
    if (includeArchived) query.set("archived", "true");

    window.location.href = `/api/admin/reports?${query.toString()}`;
  };

  return (
    <>
      <DashboardHeader
        title="Reports & Analytics"
        description="Comprehensive operational reporting, lifecycle telemetry, and CSV data exports"
      />

      <main className="p-3 sm:p-5 lg:p-8 space-y-3 sm:space-y-5 lg:space-y-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="iwms-card p-3.5 sm:p-5" style={{ borderRadius: "12px" }}>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.5)" }}>Active Interns</span>
            <p className="text-xl sm:text-2xl font-extrabold mt-1 sm:mt-2" style={{ color: "var(--iwms-navy)" }}>
              {kpis?.activeInterns ?? 0}
            </p>
          </div>
          <div className="iwms-card p-3.5 sm:p-5" style={{ borderRadius: "12px" }}>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.5)" }}>In Progress Tasks</span>
            <p className="text-xl sm:text-2xl font-extrabold mt-1 sm:mt-2 text-sky-600">
              {kpis?.inProgress ?? 0}
            </p>
          </div>
          <div className="iwms-card p-3.5 sm:p-5" style={{ borderRadius: "12px" }}>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.5)" }}>Approved</span>
            <p className="text-xl sm:text-2xl font-extrabold mt-1 sm:mt-2 text-emerald-600">
              {kpis?.approved ?? 0}
            </p>
          </div>
          <div className="iwms-card p-3.5 sm:p-5" style={{ borderRadius: "12px" }}>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(11,31,58,0.5)" }}>Overdue Tasks</span>
            <p className="text-xl sm:text-2xl font-extrabold mt-1 sm:mt-2 text-rose-600">
              {kpis?.overdue ?? 0}
            </p>
          </div>
        </div>

        {/* Filter Controls & CSV Export Bar */}
        <div className="iwms-card p-3.5 sm:p-5 space-y-3 sm:space-y-4" style={{ borderRadius: "14px" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-sm sm:text-base" style={{ color: "var(--iwms-navy)" }}>Report Customization & Export</h3>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/analytics"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all hover:bg-slate-50 w-full sm:w-auto"
                style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-navy)" }}
              >
                <BarChart3 className="w-4 h-4 shrink-0 text-sky-600" /> View Analytics
              </Link>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:opacity-95 active:scale-95 w-full sm:w-auto"
                style={{ background: "#0284C7" }}
              >
                <Download className="w-4 h-4 shrink-0" /> Export CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--iwms-navy)" }}>
                Filter by Intern
              </label>
              <select
                value={internFilter}
                onChange={(e) => setInternFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-black)" }}
              >
                <option value="all">All Interns</option>
                {interns.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.name} ({i.internId || i.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--iwms-navy)" }}>
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-black)" }}
              >
                <option value="all">All Statuses</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="changes_requested">Changes Requested</option>
                <option value="approved">Approved</option>
                <option value="unassigned">Unassigned</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--iwms-navy)" }}>From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-black)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--iwms-navy)" }}>To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                style={{ borderColor: "var(--iwms-border)", color: "var(--iwms-black)" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--iwms-border)" }}>
            <input
              type="checkbox"
              id="includeArchived"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="includeArchived" className="text-xs font-medium cursor-pointer" style={{ color: "rgba(11,31,58,0.7)" }}>
              Include archived tasks in report output
            </label>
          </div>
        </div>

        {/* Results Data Table */}
        <div className="iwms-card overflow-hidden shadow-xs" style={{ borderRadius: "14px" }}>
          <div className="p-3.5 sm:p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--iwms-border)" }}>
            <span className="font-bold text-sm" style={{ color: "var(--iwms-navy)" }}>
              Filtered Records ({tasks.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Intern</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Assigned Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Generating report...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No matching task records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const intern = task.assignedInternId as unknown as {
                      name?: string;
                      internId?: string;
                    };
                    return (
                      <tr key={task._id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {task.title}
                          {task.isArchived && (
                            <span className="ml-1.5 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              Archived
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {intern?.name || task.assignedInternSnapshot?.name || "N/A"}{" "}
                          <span className="text-slate-400">
                            ({intern?.internId || task.assignedInternSnapshot?.internId || ""})
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium uppercase ${getPriorityBadgeClass(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClass(
                              task.status
                            )}`}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">
                          {formatDate(task.assignmentDate)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">
                          {formatDate(task.dueDate)}
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
