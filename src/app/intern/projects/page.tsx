"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IProject } from "@/types";
import { formatDate, getStatusBadgeClass } from "@/lib/utils";
import {
  FolderGit2,
  Users,
  Calendar,
  ArrowRight,
} from "lucide-react";

export default function InternProjectsPage() {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "all") query.set("status", statusFilter);

      const res = await fetch(`/api/intern/projects?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  return (
    <>
      <DashboardHeader
        title="My Collaborative Projects"
        description="View shared initiatives you are contributing to alongside team members"
      />

      <main className="p-8 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Projects</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading your team projects...</div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FolderGit2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">No team projects assigned</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              When administrators assign you to a collaborative team project, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((proj) => (
              <div
                key={proj._id}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-sm transition-shadow"
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
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      {proj.teamMembers?.length || 0} Team Members
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(proj.teamMembers || []).map((m) => {
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
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Started: {formatDate(proj.startDate)}
                  </span>
                  <Link
                    href={`/intern/projects/${proj._id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    View Project <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
