"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IProject, IUser } from "@/types";
import { formatDate, getStatusBadgeClass } from "@/lib/utils";
import {
  FolderGit2,
  PlusCircle,
  Users,
  Calendar,
  ArrowRight,
  AlertCircle,
  Trash2,
} from "lucide-react";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [interns, setInterns] = useState<IUser[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteProject = async (id: string, projectTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${projectTitle}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p._id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete project");
      }
    } catch {
      alert("Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  };

  // New Project Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "all") query.set("status", statusFilter);

      const res = await fetch(`/api/admin/projects?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInterns = async () => {
    try {
      const res = await fetch("/api/admin/interns?status=active");
      if (res.ok) {
        const data = await res.json();
        setInterns(data.interns || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchInterns();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  useEffect(() => {
    const handleRealtime = (e: Event) => {
      const custom = e as CustomEvent<{ type: string }>;
      if (
        !custom.detail ||
        custom.detail.type?.startsWith("project_") ||
        custom.detail.type?.startsWith("task_")
      ) {
        fetchProjects();
      }
    };
    window.addEventListener("iwms:realtime", handleRealtime);
    window.addEventListener("iwms:revalidate", handleRealtime);

    return () => {
      window.removeEventListener("iwms:realtime", handleRealtime);
      window.removeEventListener("iwms:revalidate", handleRealtime);
    };
  }, []);

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (new Date(dueDate) < new Date(startDate)) {
      setModalError("Project due date cannot be before the start date");
      return;
    }

    if (selectedMemberIds.length < 2) {
      setModalError("Collaborative projects require at least 2 team members selected");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          teamMemberIds: selectedMemberIds,
          startDate,
          dueDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setSelectedMemberIds([]);
      setDueDate("");
      fetchProjects();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Collaborative Team Projects"
        description="Organize cross-intern collaborative initiatives, delegate subtasks, and track project-level milestones"
      />

      <main className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Projects</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 shrink-0" /> Create New Project
          </button>
        </div>

        {/* Project Cards Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FolderGit2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No collaborative projects found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create a team project with two or more interns to coordinate shared initiatives and delegate individual task responsibilities.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const members = proj.teamMembers || [];
              const visibleMembers = members.slice(0, 4);
              const remainingCount = Math.max(0, members.length - 4);

              const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string; bar: string }> = {
                planning: {
                  bg: "bg-indigo-50/80",
                  text: "text-indigo-700",
                  border: "border-indigo-200/70",
                  dot: "bg-indigo-500",
                  bar: "from-indigo-500 to-sky-500",
                },
                in_progress: {
                  bg: "bg-sky-50/80",
                  text: "text-sky-700",
                  border: "border-sky-200/70",
                  dot: "bg-sky-500 animate-pulse",
                  bar: "from-sky-500 to-blue-600",
                },
                completed: {
                  bg: "bg-emerald-50/80",
                  text: "text-emerald-700",
                  border: "border-emerald-200/70",
                  dot: "bg-emerald-500",
                  bar: "from-emerald-400 to-teal-500",
                },
                on_hold: {
                  bg: "bg-amber-50/80",
                  text: "text-amber-700",
                  border: "border-amber-200/70",
                  dot: "bg-amber-500",
                  bar: "from-amber-400 to-orange-500",
                },
              };

              const currentStatus = statusConfig[proj.status] || {
                bg: "bg-slate-50",
                text: "text-slate-700",
                border: "border-slate-200",
                dot: "bg-slate-400",
                bar: "from-slate-400 to-slate-500",
              };

              const avatarColors = [
                { bg: "bg-sky-100 text-sky-700 border-white ring-2 ring-sky-50" },
                { bg: "bg-indigo-100 text-indigo-700 border-white ring-2 ring-indigo-50" },
                { bg: "bg-emerald-100 text-emerald-700 border-white ring-2 ring-emerald-50" },
                { bg: "bg-violet-100 text-violet-700 border-white ring-2 ring-violet-50" },
              ];

              return (
                <div
                  key={proj._id}
                  className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-sky-300/80 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-6 space-y-5">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border} shadow-2xs backdrop-blur-xs`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`} />
                        {proj.status.replace("_", " ")}
                      </span>

                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-600 text-xs font-medium">
                        <Calendar className="w-3.5 h-3.5 text-sky-500" />
                        <span>Due {formatDate(proj.dueDate)}</span>
                      </div>
                    </div>

                    <div>
                      <Link
                        href={`/admin/projects/${proj._id}`}
                        className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 tracking-tight"
                      >
                        {proj.title}
                      </Link>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed font-normal">
                        {proj.description || "No project description provided."}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100/80">
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-sky-500" />
                          Team Collaboration
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold text-[11px]">
                          {members.length} {members.length === 1 ? "Member" : "Members"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2 overflow-hidden py-1">
                          {visibleMembers.map((m, idx) => {
                            const memberInfo = m.internId as unknown as { name?: string; internId?: string };
                            const name = memberInfo?.name || "Intern";
                            const initial = name.charAt(0).toUpperCase();
                            const colorClass = avatarColors[idx % avatarColors.length];

                            return (
                              <div
                                key={typeof m.internId === "object" ? (m.internId as unknown as { _id: string })._id : String(m.internId)}
                                title={name}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${colorClass.bg} shadow-xs transition-transform transform group-hover:scale-105`}
                              >
                                {initial}
                              </div>
                            );
                          })}
                          {remainingCount > 0 && (
                            <div
                              title={`${remainingCount} more members`}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white bg-slate-100 text-slate-600 shadow-xs ring-2 ring-slate-100"
                            >
                              +{remainingCount}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                          {visibleMembers.map((m) => {
                            const memberInfo = m.internId as unknown as { name?: string; internId?: string };
                            return (
                              <span
                                key={typeof m.internId === "object" ? (m.internId as unknown as { _id: string })._id : String(m.internId)}
                                className="inline-flex items-center px-2.5 py-0.5 text-[11px] rounded-md font-medium bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-colors"
                              >
                                {memberInfo?.name?.split(" ")[0] || "Intern"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-gradient-to-b from-white to-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                      <span>Started:</span>
                      <span className="text-slate-600 font-semibold">{formatDate(proj.startDate)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteProject(proj._id, proj.title)}
                        disabled={deletingId === proj._id}
                        className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors disabled:opacity-50"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <Link
                        href={`/admin/projects/${proj._id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
                      >
                        <span>View & Manage</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Project Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-lg">Create Team Project</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              {modalError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Next-Gen Mobile App Redesign"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Description & Objective *</label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Outline project scope, deliverables, and expectations..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Overall Deadline *</label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-700">
                      Select Team Members * (At least 2 required)
                    </label>
                    <span className="text-slate-500 font-medium">
                      {selectedMemberIds.length} selected
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1.5 bg-slate-50/50">
                    {interns.length === 0 ? (
                      <p className="text-slate-400 p-2 text-center">No active interns available.</p>
                    ) : (
                      interns.map((i) => {
                        const isSelected = selectedMemberIds.includes(i._id);
                        return (
                          <label
                            key={i._id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors ${
                              isSelected
                                ? "bg-blue-50 border-blue-200 text-blue-900"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleMemberSelection(i._id)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span className="font-medium">{i.name}</span>
                              <span className="text-slate-400 text-[11px]">({i.internId || i.email})</span>
                            </div>
                            <span className="text-[11px] text-slate-400 uppercase">
                              {i.department || "General"}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isSubmitting ? "Creating..." : "Create Project"}
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
