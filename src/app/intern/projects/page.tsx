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
        <div
          className="iwms-card flex items-center justify-between px-5 py-3.5 gap-4"
          style={{ borderRadius: "12px" }}
        >
          <div className="flex items-center gap-3">
            <FolderGit2
              className="w-4 h-4 flex-shrink-0"
              style={{ color: "var(--iwms-sky)" }}
            />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--iwms-navy)" }}
            >
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg focus:outline-none transition-shadow"
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
            className="text-xs font-medium"
            style={{ color: "rgba(11,31,58,.55)" }}
          >
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div
            className="p-12 text-center text-sm"
            style={{ color: "rgba(11,31,58,.45)" }}
          >
            Loading your team projects…
          </div>
        ) : projects.length === 0 ? (
          <div
            className="iwms-card p-12 text-center"
            style={{ borderRadius: "14px" }}
          >
            <FolderGit2
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: "rgba(56,189,248,.35)" }}
            />
            <h3
              className="font-bold text-base"
              style={{ color: "var(--iwms-navy)" }}
            >
              No team projects assigned
            </h3>
            <p
              className="text-xs mt-1 max-w-sm mx-auto"
              style={{ color: "rgba(11,31,58,.45)" }}
            >
              When administrators assign you to a collaborative team project, it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((proj) => (
              <div
                key={proj._id}
                className="iwms-card flex flex-col justify-between transition-shadow hover:shadow-md"
                style={{
                  padding: "1.5rem",
                  borderRadius: "14px",
                  borderLeft: "3.5px solid #0284C7",
                }}
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
                    <span
                      className="text-xs flex items-center gap-1"
                      style={{ color: "rgba(11,31,58,.55)" }}
                    >
                      <Calendar className="w-3.5 h-3.5" style={{ color: "var(--iwms-sky)" }} /> Due {formatDate(proj.dueDate)}
                    </span>
                  </div>

                  <div>
                    <h3
                      className="font-bold text-base line-clamp-1"
                      style={{ color: "var(--iwms-black)" }}
                    >
                      {proj.title}
                    </h3>
                    <p
                      className="text-xs line-clamp-2 mt-1 leading-relaxed"
                      style={{ color: "rgba(11,31,58,.55)" }}
                    >
                      {proj.description}
                    </p>
                  </div>

                  <div className="pt-2">
                    <div
                      className="flex items-center gap-1.5 text-xs mb-1.5 font-medium"
                      style={{ color: "var(--iwms-navy)" }}
                    >
                      <Users className="w-3.5 h-3.5" style={{ color: "var(--iwms-sky)" }} />
                      {proj.teamMembers?.length || 0} Team Members
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(proj.teamMembers || []).map((m) => {
                        const memberInfo = m.internId as unknown as { name?: string; internId?: string };
                        return (
                          <span
                            key={typeof m.internId === "object" ? (m.internId as unknown as { _id: string })._id : String(m.internId)}
                            className="inline-block px-2 py-0.5 text-xs rounded font-medium"
                            style={{
                              background: "rgba(56,189,248,.10)",
                              color: "var(--iwms-navy)",
                              border: "1px solid var(--iwms-border)",
                            }}
                          >
                            {memberInfo?.name || "Intern"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div
                  className="pt-4 mt-4 flex items-center justify-between"
                  style={{ borderTop: "1px solid var(--iwms-border)" }}
                >
                  <span
                    className="text-xs"
                    style={{ color: "rgba(11,31,58,.50)" }}
                  >
                    Started: {formatDate(proj.startDate)}
                  </span>
                  <Link
                    href={`/intern/projects/${proj._id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: "rgba(56,189,248,.12)",
                      color: "var(--iwms-sky)",
                    }}
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
