"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IProject, ITask, IUser } from "@/types";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  ArrowLeft,
  FolderGit2,
  Users,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Clock,
  UserPlus,
  UserMinus,
  AlertCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";

interface ProjectDetailData {
  project: IProject;
  tasks: ITask[];
  progress: {
    totalTasks: number;
    assigned: number;
    inProgress: number;
    submitted: number;
    changesRequested: number;
    approved: number;
    unassigned: number;
    transferred: number;
    completionPercentage: number;
  };
}

export default function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [interns, setInterns] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProject = async () => {
    if (!data?.project) return;
    if (!confirm(`Are you sure you want to delete "${data.project.title}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/projects");
      } else {
        const json = await res.json();
        alert(json.error || "Failed to delete project");
        setIsDeleting(false);
      }
    } catch {
      alert("Failed to delete project");
      setIsDeleting(false);
    }
  };

  // New Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [taskAssignedInternId, setTaskAssignedInternId] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskModalError, setTaskModalError] = useState<string | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Add Member Modal State
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMemberInternId, setNewMemberInternId] = useState("");
  const [addMemberReason, setAddMemberReason] = useState("");
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Remove Member Modal State
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [removeMemberReason, setRemoveMemberReason] = useState("");
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const fetchProjectDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveInterns = async () => {
    try {
      const res = await fetch("/api/admin/interns?status=active");
      if (res.ok) {
        const json = await res.json();
        setInterns(json.interns || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchProjectDetails();
    fetchActiveInterns();
  }, [id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskModalError(null);
    setIsSubmittingTask(true);

    try {
      const res = await fetch(`/api/admin/projects/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          priority: taskPriority,
          assignedInternId: taskAssignedInternId,
          assignmentDate: new Date().toISOString().split("T")[0],
          dueDate: taskDueDate,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create project task");
      }

      setIsTaskModalOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignedInternId("");
      setTaskDueDate("");
      fetchProjectDetails();
    } catch (err: unknown) {
      setTaskModalError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMemberError(null);
    setIsAddingMember(true);

    try {
      const res = await fetch(`/api/admin/projects/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          internId: newMemberInternId,
          reason: addMemberReason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add team member");
      }

      setIsAddMemberModalOpen(false);
      setNewMemberInternId("");
      setAddMemberReason("");
      fetchProjectDetails();
    } catch (err: unknown) {
      setAddMemberError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToRemove) return;

    setRemoveMemberError(null);
    setIsRemovingMember(true);

    try {
      const res = await fetch(`/api/admin/projects/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          internId: memberToRemove.id,
          reason: removeMemberReason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to remove team member");
      }

      setMemberToRemove(null);
      setRemoveMemberReason("");
      fetchProjectDetails();
    } catch (err: unknown) {
      setRemoveMemberError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setIsRemovingMember(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <DashboardHeader title="Team Project Overview" />
        <main className="p-8 text-slate-500">Loading project details and task breakdown...</main>
      </>
    );
  }

  if (!data || !data.project) {
    return (
      <>
        <DashboardHeader title="Project Not Found" />
        <main className="p-8">
          <p className="text-slate-600 mb-4">The requested project could not be found.</p>
          <Link href="/admin/projects" className="text-blue-600 font-semibold hover:underline">
            &larr; Back to Projects
          </Link>
        </main>
      </>
    );
  }

  const { project, tasks, progress } = data;

  return (
    <>
      <DashboardHeader
        title={`Project: ${project.title}`}
        description="Monitor team roster, inspect progress metrics, and allocate individual task responsibilities"
      />

      <main className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href="/admin/projects"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" /> Back to Team Projects
          </Link>

          <div className="flex flex-wrap sm:flex-nowrap sm:items-center gap-2 sm:gap-3">
            <button
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium border border-rose-200 text-rose-600 rounded-lg bg-rose-50/50 hover:bg-rose-100 hover:border-rose-300 transition-colors text-center disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> {isDeleting ? "Deleting..." : "Delete Project"}
            </button>

            <button
              onClick={() => {
                setAddMemberError(null);
                setIsAddMemberModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors text-center"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" /> Add Member
            </button>

            <button
              onClick={() => {
                setTaskModalError(null);
                setIsTaskModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm text-center"
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Assign Task
            </button>
          </div>
        </div>

        {/* Project Summary Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border capitalize ${getStatusBadgeClass(
                  project.status
                )}`}
              >
                {project.status.replace("_", " ")}
              </span>
              <span className="text-xs text-slate-500">
                Created: {formatDate(project.createdAt)}
              </span>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-4">
              <span>Start: {formatDate(project.startDate)}</span>
              <span>Deadline: <strong>{formatDate(project.dueDate)}</strong></span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Project Description & Objectives
            </h4>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
              {project.description}
            </p>
          </div>

          {/* Progress Bar & KPI Stats */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider">
                Overall Progress: {progress.completionPercentage}% Complete
              </span>
              <span className="text-slate-500">
                {progress.approved} of {progress.totalTasks} task(s) approved
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress.completionPercentage}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500">Assigned</span>
                <p className="font-bold text-slate-800 text-base">{progress.assigned}</p>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-blue-700">In Progress</span>
                <p className="font-bold text-blue-800 text-base">{progress.inProgress}</p>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-amber-700">Under Review</span>
                <p className="font-bold text-amber-800 text-base">{progress.submitted}</p>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200">
                <span className="text-rose-700">Changes Req.</span>
                <p className="font-bold text-rose-800 text-base">{progress.changesRequested}</p>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-emerald-700">Approved</span>
                <p className="font-bold text-emerald-800 text-base">{progress.approved}</p>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200">
                <span className="text-purple-700">Transferred</span>
                <p className="font-bold text-purple-800 text-base">{progress.transferred}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Roster & Tasks Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Team Members List */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Team Roster ({project.teamMembers.length})
            </h3>

            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs">
              {project.teamMembers.map((m) => {
                const intern = m.internId as unknown as {
                  _id: string;
                  name?: string;
                  email?: string;
                  internId?: string;
                  department?: string;
                };

                return (
                  <div
                    key={intern._id || String(m.internId)}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {intern?.name || "Intern"}
                      </p>
                      <p className="text-slate-500 font-mono text-[11px]">
                        {intern?.internId || intern?.email} • {intern?.department || "General"}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        Joined {formatDate(m.joinedAt)}
                      </span>
                    </div>

                    {project.teamMembers.length > 2 && (
                      <button
                        onClick={() => {
                          setRemoveMemberError(null);
                          setMemberToRemove({ id: intern._id, name: intern?.name || "Intern" });
                        }}
                        title="Remove member from project"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Removed past members history */}
              {project.removedMembers && project.removedMembers.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Past Members (History Retained)
                  </h5>
                  <div className="space-y-1.5">
                    {project.removedMembers.map((rm, idx) => {
                      const prevIntern = rm.internId as unknown as { name?: string; internId?: string };
                      return (
                        <div
                          key={idx}
                          className="p-2 bg-slate-100/70 rounded text-[11px] text-slate-600 flex items-center justify-between"
                        >
                          <span>{prevIntern?.name || "Past Intern"}</span>
                          <span className="text-slate-400 text-[10px]">
                            Removed {formatDate(rm.removedAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Project Tasks Breakdown */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-blue-600" /> Individual Task Breakdown ({tasks.length})
            </h3>

            {tasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No project tasks delegated yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click &ldquo;Assign Project Task&rdquo; to divide the project into distinct task responsibilities.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((t) => {
                  const assigned = t.assignedInternId as unknown as {
                    name?: string;
                    internId?: string;
                  };

                  return (
                    <div
                      key={t._id}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getStatusBadgeClass(
                              t.status
                            )}`}
                          >
                            {t.status.replace("_", " ")}
                          </span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${getPriorityBadgeClass(
                              t.priority
                            )}`}
                          >
                            {t.priority}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm truncate">{t.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                          <span>
                            Assignee:{" "}
                            <strong className="text-slate-700">
                              {assigned?.name || t.assignedInternSnapshot?.name || "Unassigned"}
                            </strong>
                          </span>
                          <span>Due: {formatDate(t.dueDate)}</span>
                        </div>
                      </div>

                      <Link
                        href={`/admin/tasks/${t._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shrink-0"
                      >
                        Inspect Task <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Assign Project Task */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-lg">Assign Project Task</h3>
                <button
                  onClick={() => setIsTaskModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              {taskModalError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{taskModalError}</span>
                </div>
              )}

              <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Design Wireframes for Checkout Flow"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description *</label>
                  <textarea
                    rows={3}
                    required
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Provide specific instructions and deliverables for this project subtask..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assign to Team Member *</label>
                    <select
                      required
                      value={taskAssignedInternId}
                      onChange={(e) => setTaskAssignedInternId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Choose member --</option>
                      {project.teamMembers.map((m) => {
                        const intern = m.internId as unknown as { _id: string; name?: string; internId?: string };
                        return (
                          <option key={intern._id} value={intern._id}>
                            {intern?.name || "Intern"} ({intern?.internId})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Priority *</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as "low" | "medium" | "high" | "urgent")}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTask}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSubmittingTask ? "Assigning..." : "Assign Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Team Member */}
        {isAddMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-lg">Add Project Member</h3>
                <button
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              {addMemberError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addMemberError}</span>
                </div>
              )}

              <form onSubmit={handleAddMember} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Active Intern *</label>
                  <select
                    required
                    value={newMemberInternId}
                    onChange={(e) => setNewMemberInternId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Choose intern --</option>
                    {interns
                      .filter(
                        (i) =>
                          !project.teamMembers.some(
                            (m) =>
                              (m.internId as unknown as { _id: string })._id === i._id ||
                              String(m.internId) === i._id
                          )
                      )
                      .map((i) => (
                        <option key={i._id} value={i._id}>
                          {i.name} ({i.internId || i.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason / Note (Optional)</label>
                  <input
                    type="text"
                    value={addMemberReason}
                    onChange={(e) => setAddMemberReason(e.target.value)}
                    placeholder="e.g. Added to support frontend development"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingMember}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isAddingMember ? "Adding..." : "Add to Team"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Remove Team Member */}
        {memberToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Remove Member</h3>
                  <p className="text-xs text-slate-500">
                    Remove <strong>{memberToRemove.name}</strong> from project roster.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <p>
                  • Removing this member will <strong>not</strong> delete their previous tasks, submissions, or review history.
                </p>
                <p>
                  • An immutable audit event will record this member removal.
                </p>
              </div>

              {removeMemberError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{removeMemberError}</span>
                </div>
              )}

              <form onSubmit={handleRemoveMember} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Removal Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={removeMemberReason}
                    onChange={(e) => setRemoveMemberReason(e.target.value)}
                    placeholder="e.g. Intern rotated to another department..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setMemberToRemove(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRemovingMember}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isRemovingMember ? "Removing..." : "Confirm Removal"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
