"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ITask } from "@/types";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  CheckSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function InternDashboardPage() {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/intern/tasks")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tasks) setTasks(data.tasks);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const assignedCount = tasks.filter((t) => t.status === "assigned").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const submittedCount = tasks.filter((t) => t.status === "submitted").length;
  const approvedCount = tasks.filter((t) => t.status === "approved").length;
  const changesCount = tasks.filter((t) => t.status === "changes_requested").length;

  return (
    <>
      <DashboardHeader
        title="Intern Workspace"
        description="Your assigned assignments, current deliverable statuses, and pending tasks"
      />

      <main className="p-8 space-y-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Assigned Tasks</span>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{assignedCount}</p>
            <p className="text-xs text-slate-400 mt-1">Ready to be started</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-blue-600 uppercase">In Progress</span>
            <p className="text-3xl font-extrabold text-blue-600 mt-2">{inProgressCount}</p>
            <p className="text-xs text-slate-400 mt-1">Currently working on</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-amber-600 uppercase">Under Review</span>
            <p className="text-3xl font-extrabold text-amber-600 mt-2">{submittedCount}</p>
            <p className="text-xs text-slate-400 mt-1">Submitted to supervisor</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 uppercase">Approved Deliverables</span>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">{approvedCount}</p>
            <p className="text-xs text-slate-400 mt-1">Successfully completed</p>
          </div>
        </div>

        {changesCount > 0 && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <div>
                <p className="font-semibold text-rose-900 text-sm">
                  {changesCount} task(s) require revisions!
                </p>
                <p className="text-xs text-rose-700">
                  Supervisor has provided feedback on your submission. Please check and revise.
                </p>
              </div>
            </div>
            <Link
              href="/intern/tasks?status=changes_requested"
              className="text-xs font-bold text-rose-800 hover:underline inline-flex items-center gap-1"
            >
              View Feedback <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Priority & Upcoming Deadlines */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Current Assigned Tasks</h3>
            <Link
              href="/intern/tasks"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All Tasks &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="p-10 text-center">
                <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No active tasks</p>
                <p className="text-xs text-slate-400 mt-1">You are all caught up!</p>
              </div>
            ) : (
              tasks.slice(0, 5).map((task) => (
                <div
                  key={task._id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 text-sm">{task.title}</span>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClass(
                          task.status
                        )}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                      {task.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-500">
                      Due: <strong className="text-slate-700">{formatDate(task.dueDate)}</strong>
                    </span>
                    <Link
                      href={`/intern/tasks/${task._id}`}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      Open Task <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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
