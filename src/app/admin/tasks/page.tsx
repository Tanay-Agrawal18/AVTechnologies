"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ITask, IUser } from "@/types";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  CheckSquare,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [interns, setInterns] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [internFilter, setInternFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [includeArchived, setIncludeArchived] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [assignedInternId, setAssignedInternId] = useState("");
  const [assignmentDate, setAssignmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (internFilter !== "all") query.set("internId", internFilter);
      if (priorityFilter !== "all") query.set("priority", priorityFilter);
      if (includeArchived) query.set("archived", "true");

      const res = await fetch(`/api/admin/tasks?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInterns = async () => {
    const res = await fetch("/api/admin/interns?status=active");
    if (res.ok) {
      const data = await res.json();
      setInterns(data.interns || []);
    }
  };

  useEffect(() => {
    fetchInterns();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, internFilter, priorityFilter, includeArchived]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          assignedInternId,
          assignmentDate,
          dueDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      fetchTasks();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to create task");
    }
  };

  return (
    <>
      <DashboardHeader
        title="Task Management & Delegation"
        description="Assign assignments to interns, monitor progression, and review completion lifecycles"
      />

      <main className="p-8 space-y-6">
        {/* Filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="approved">Approved</option>
            </select>

            <select
              value={internFilter}
              onChange={(e) => setInternFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Interns</option>
              {interns.map((i) => (
                <option key={i._id} value={i._id}>
                  {i.name} ({i.internId})
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer ml-2">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              Include Archived
            </label>
          </div>

          <button
            onClick={() => {
              setIsModalOpen(true);
              setModalError(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> Create Task
          </button>
        </div>

        {/* Task Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Task Title</th>
                  <th className="py-3 px-4">Assigned Intern</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignment Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading tasks...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No tasks found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try adjusting your filters or create a new assignment.
                      </p>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const intern = task.assignedInternId as unknown as {
                      name?: string;
                      internId?: string;
                    };
                    const internName =
                      intern?.name || task.assignedInternSnapshot?.name || "Unassigned";
                    const internIdTag =
                      intern?.internId || task.assignedInternSnapshot?.internId || "";

                    return (
                      <tr key={task._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <Link
                            href={`/admin/tasks/${task._id}`}
                            className="hover:text-blue-600 inline-flex items-center gap-1.5"
                          >
                            {task.title}
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </Link>
                          {task.isArchived && (
                            <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Archived
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {internName}{" "}
                          {internIdTag && (
                            <span className="text-xs text-slate-400">({internIdTag})</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${getPriorityBadgeClass(
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
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {formatDate(task.assignmentDate)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {formatDate(task.dueDate)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/admin/tasks/${task._id}`}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Review & Audit &rarr;
                          </Link>
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

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create & Assign Task</h3>
            <p className="text-xs text-slate-500 mb-5">
              Specify scope, priority, and assign to an active intern roster member.
            </p>

            {modalError && (
              <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Implement OAuth2 Refresh Logic"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Deliverable Guidelines *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed criteria, resources, and expected pull request format..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as "low" | "medium" | "high" | "urgent")
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign To Intern *
                  </label>
                  <select
                    required
                    value={assignedInternId}
                    onChange={(e) => setAssignedInternId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select an intern...</option>
                    {interns.map((i) => (
                      <option key={i._id} value={i._id}>
                        {i.name} ({i.internId || i.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assignment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={assignmentDate}
                    onChange={(e) => setAssignmentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  Create & Dispatch Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
