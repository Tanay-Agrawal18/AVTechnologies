"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IUser, ITask } from "@/types";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  ArrowLeft,
  KeyRound,
  CheckCircle,
  XCircle,
  Clock,
  CheckSquare,
  AlertCircle,
} from "lucide-react";

export default function AdminInternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [intern, setIntern] = useState<IUser | null>(null);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const fetchDetail = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/interns/${id}`);
      if (res.ok) {
        const data = await res.json();
        setIntern(data.intern);
        setTasks(data.tasks || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleGenerateReset = async () => {
    try {
      const res = await fetch(`/api/admin/interns/${id}/reset-link`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.resetLink) {
        navigator.clipboard.writeText(data.resetLink);
        setResetMessage("One-time setup link copied to clipboard!");
        setTimeout(() => setResetMessage(null), 4000);
      }
    } catch {
      alert("Failed to generate link");
    }
  };

  const handleToggleStatus = async () => {
    if (!intern) return;
    const nextStatus = intern.status === "active" ? "inactive" : "active";
    if (!confirm(`Are you sure you want to mark ${intern.name} as ${nextStatus}?`)) return;

    try {
      const res = await fetch(`/api/admin/interns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) fetchDetail();
    } catch {
      alert("Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <>
        <DashboardHeader title="Intern Profile" />
        <main className="p-8 text-slate-500">Loading intern details...</main>
      </>
    );
  }

  if (!intern) {
    return (
      <>
        <DashboardHeader title="Intern Not Found" />
        <main className="p-8">
          <p className="text-slate-600 mb-4">The requested intern record was not found.</p>
          <Link href="/admin/interns" className="text-blue-600 font-semibold hover:underline">
            &larr; Back to Interns List
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title={`${intern.name} (${intern.internId || "Intern"})`}
        description="Intern portfolio, assigned task history, and account security controls"
      />

      <main className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/interns"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Interns
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateReset}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <KeyRound className="w-4 h-4 text-slate-500" /> Generate Reset Link
            </button>
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg ${
                intern.status === "active"
                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {intern.status === "active" ? (
                <>
                  <XCircle className="w-4 h-4" /> Deactivate Intern
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Activate Intern
                </>
              )}
            </button>
          </div>
        </div>

        {resetMessage && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {resetMessage}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Intern ID</span>
            <p className="font-mono font-bold text-slate-800 text-base mt-1">
              {intern.internId || "—"}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Work Email</span>
            <p className="font-medium text-slate-800 text-base mt-1">{intern.email}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Department</span>
            <p className="font-medium text-slate-800 text-base mt-1">
              {intern.department || "General"}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Account Status</span>
            <div className="mt-1">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getStatusBadgeClass(
                  intern.status
                )}`}
              >
                {intern.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Task History Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Assigned Task Portfolio</h3>
              <p className="text-xs text-slate-500">
                All tasks assigned to this intern across their engagement lifecycle
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {tasks.length} total tasks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      No tasks assigned yet to this intern.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {task.title}
                        {task.isArchived && (
                          <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium uppercase ${getPriorityBadgeClass(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClass(
                            task.status
                          )}`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {formatDate(task.assignmentDate)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {formatDate(task.dueDate)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/tasks/${task._id}`}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Manage & Review &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
