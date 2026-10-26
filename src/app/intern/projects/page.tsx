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
import { ProjectCardSkeleton } from "@/components/Skeleton";

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

      <main className="p-3 sm:p-5 lg:p-8 space-y-3 sm:space-y-5">
        {/* Toolbar */}
        <div
          className="iwms-card flex flex-wrap items-center justify-between px-3.5 py-2.5 gap-2"
          style={{ borderRadius: "10px" }}
        >
          <div className="flex items-center gap-2">
            <FolderGit2
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ color: "var(--iwms-sky)" }}
            />
            <span
              className="text-[10px] sm:text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--iwms-navy)" }}
            >
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded-lg focus:outline-none transition-shadow"
              style={{
                border: "1px solid var(--iwms-border)",
                color: "var(--iwms-navy)",
                background: "var(--iwms-white)",
              }}
            >
              <option value="all">All Projects</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <span
            className="text-[10px] sm:text-xs font-medium"
            style={{ color: "rgba(11,31,58,.55)" }}
          >
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div
            className="iwms-card py-10 px-5 text-center"
            style={{ borderRadius: "12px" }}
          >
            <FolderGit2
              className="w-9 h-9 mx-auto mb-3"
              style={{ color: "rgba(56,189,248,.35)" }}
            />
            <h3
              className="font-bold text-sm sm:text-base"
              style={{ color: "var(--iwms-navy)" }}
            >
              No team projects assigned
            </h3>
            <p
              className="text-[10px] sm:text-xs mt-1 max-w-sm mx-auto"
              style={{ color: "rgba(11,31,58,.45)" }}
            >
              When administrators assign you to a collaborative team project, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {projects.map((proj) => {
              const members = proj.teamMembers || [];
              const visibleMembers = members.slice(0, 4);
              const remainingCount = Math.max(0, members.length - 4);

              // Distinct status colors & accent badges
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
                  <div className="p-3.5 sm:p-5 space-y-3">
                    {/* Header: Status pill + Due date badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border} backdrop-blur-xs`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`} />
                        {proj.status.replace("_", " ")}
                      </span>

                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-600 text-[10px] sm:text-xs font-medium">
                        <Calendar className="w-3 h-3 text-sky-500" />
                        <span>Due {formatDate(proj.dueDate)}</span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <Link
                        href={`/intern/projects/${proj._id}`}
                        className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1 tracking-tight"
                      >
                        {proj.title}
                      </Link>
                      <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed font-normal">
                        {proj.description || "No project description provided."}
                      </p>
                    </div>

                    {/* Team Members Section */}
                    <div className="pt-2 border-t border-slate-100/80">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-700 flex items-center gap-1 text-[10px] sm:text-xs">
                          <Users className="w-3.5 h-3.5 text-sky-500" />
                          Team Collaboration
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold text-[10px] sm:text-[11px]">
                          {members.length} {members.length === 1 ? "Member" : "Members"}
                        </span>
                      </div>

                      {/* Avatar stack + interactive chips */}
                      <div className="flex items-center gap-2">
                        {/* Overlapping Avatar Stack */}
                        <div className="flex -space-x-1.5 overflow-hidden py-0.5">
                          {visibleMembers.map((m, idx) => {
                            const memberInfo = m.internId as unknown as { name?: string; internId?: string };
                            const name = memberInfo?.name || "Intern";
                            const initial = name.charAt(0).toUpperCase();
                            const colorClass = avatarColors[idx % avatarColors.length];

                            return (
                              <div
                                key={typeof m.internId === "object" ? (m.internId as unknown as { _id: string })._id : String(m.internId)}
                                title={name}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${colorClass.bg} shadow-xs`}
                              >
                                {initial}
                              </div>
                            );
                          })}
                          {remainingCount > 0 && (
                            <div
                              title={`${remainingCount} more members`}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white bg-slate-100 text-slate-600 shadow-xs"
                            >
                              +{remainingCount}
                            </div>
                          )}
                        </div>

                        {/* Name tags list */}
                        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                          {visibleMembers.map((m) => {
                            const memberInfo = m.internId as unknown as { name?: string; internId?: string };
                            return (
                              <span
                                key={typeof m.internId === "object" ? (m.internId as unknown as { _id: string })._id : String(m.internId)}
                                className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-md font-medium bg-slate-50 text-slate-700 border border-slate-200/80 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-colors"
                              >
                                {memberInfo?.name?.split(" ")[0] || "Intern"}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-3.5 sm:px-5 py-2.5 bg-gradient-to-b from-white to-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <span>Started:</span>
                      <span className="text-slate-600 font-semibold">{formatDate(proj.startDate)}</span>
                    </div>

                    <Link
                      href={`/intern/projects/${proj._id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-700 shadow-sm transition-all"
                    >
                      <span>View Project</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
