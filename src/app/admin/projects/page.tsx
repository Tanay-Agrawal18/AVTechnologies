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
} from "lucide-react";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [interns, setInterns] = useState<IUser[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

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

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

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

      <main className="p-8 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> Create New Project
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
            {projects.map((proj) => (
              <div
                key={proj._id}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getStatusBadgeClass(
                        proj.status
                      )}`}
                    >
                      {proj.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Due {formatDate(proj.dueDate)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base line-clamp-1">{proj.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {proj.description}
                    </p>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        {proj.teamMembers?.length || 0} Team Member{(proj.teamMembers?.length || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(proj.teamMembers || []).slice(0, 3).map((m) => {
                        const memberInfo = m.internId as unknown as { name?: string; internId?: string };
                        return (
                          <span
                            key={typeof m.internId === "object" ? (m.internId as unknown as { _id: string })._id : String(m.internId)}
                            className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded border border-slate-200"
                          >
                            {memberInfo?.name || "Intern"}
                          </span>
                        );
                      })}
                      {(proj.teamMembers?.length || 0) > 3 && (
                        <span className="inline-block px-2 py-0.5 bg-slate-50 text-slate-500 text-xs rounded border border-slate-200">
                          +{(proj.teamMembers?.length || 0) - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end">
                  <Link
                    href={`/admin/projects/${proj._id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View Project & Tasks <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
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

                <div className="grid grid-cols-2 gap-4">
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
