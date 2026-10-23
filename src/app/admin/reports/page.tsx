"use client";

import { useState, useEffect } from "react";
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

      <main className="p-8 space-y-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase">Active Interns</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">
              {kpis?.activeInterns ?? 0}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase">In Progress Tasks</span>
            <p className="text-2xl font-extrabold text-indigo-600 mt-2">
              {kpis?.inProgress ?? 0}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase">Approved Deliverables</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-2">
              {kpis?.approved ?? 0}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase">Overdue Tasks</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-2">
              {kpis?.overdue ?? 0}
            </p>
          </div>
        </div>

        {/* Filter Controls & CSV Export Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-bold text-slate-900 text-base">Report Customization & Export</h3>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" /> Export Report to CSV
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filter by Intern
              </label>
              <select
                value={internFilter}
                onChange={(e) => setInternFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="changes_requested">Changes Requested</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="checkbox"
              id="includeArchived"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="includeArchived" className="text-xs font-medium text-slate-600 cursor-pointer">
              Include archived tasks in report output
            </label>
          </div>
        </div>

        {/* Results Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">
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
