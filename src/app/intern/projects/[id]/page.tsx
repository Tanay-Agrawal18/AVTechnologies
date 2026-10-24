"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { IProject, ITask } from "@/types";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  ArrowLeft,
  FolderGit2,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

interface InternProjectDetailData {
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

export default function InternProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<InternProjectDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/intern/projects/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load project");
        }
        setData(json);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load project");
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <>
        <DashboardHeader title="Project Workspace" />
        <main className="p-8 text-slate-500">Loading project details and team tasks...</main>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <DashboardHeader title="Access Denied or Not Found" />
        <main className="p-8 space-y-4">
          <p className="text-slate-600 text-sm">{error || "Project could not be found."}</p>
          <Link href="/intern/projects" className="text-indigo-600 font-semibold text-sm hover:underline">
            &larr; Back to My Projects
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
        description="Collaborate with your team members, track milestone progress, and deliver your assignments"
      />

      <main className="p-8 space-y-8">
        {/* Navigation */}
        <div>
          <Link
            href="/intern/projects"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: "var(--iwms-navy)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Projects
          </Link>
        </div>

        {/* Project Overview Card */}
        <div
          className="iwms-card p-6 space-y-6"
          style={{ borderRadius: "14px" }}
        >
          <div
            className="flex flex-wrap items-center justify-between gap-4 pb-4"
            style={{ borderBottom: "1px solid var(--iwms-border)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border capitalize ${getStatusBadgeClass(
                  project.status
                )}`}
              >
                {project.status.replace("_", " ")}
              </span>
              <span
                className="text-xs"
                style={{ color: "rgba(11,31,58,.55)" }}
              >
                Deadline: <strong style={{ color: "var(--iwms-black)" }}>{formatDate(project.dueDate)}</strong>
              </span>
            </div>

            <div
              className="text-xs"
              style={{ color: "rgba(11,31,58,.50)" }}
            >
              Started: {formatDate(project.startDate)}
            </div>
          </div>

          <div>
            <h4
              className="text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: "rgba(11,31,58,.50)" }}
            >
              Project Description
            </h4>
            <p
              className="text-sm leading-relaxed whitespace-pre-line"
              style={{ color: "var(--iwms-black)" }}
            >
              {project.description}
            </p>
          </div>

          {/* Progress Summary */}
          <div
            className="space-y-3 pt-4"
            style={{ borderTop: "1px solid var(--iwms-border)" }}
          >
            <div className="flex items-center justify-between text-xs">
              <span
                className="font-bold uppercase tracking-wider"
                style={{ color: "var(--iwms-navy)" }}
              >
                Team Milestone Progress: {progress.completionPercentage}%
              </span>
              <span style={{ color: "rgba(11,31,58,.55)" }}>
                {progress.approved} of {progress.totalTasks} task(s) completed
              </span>
            </div>

            <div
              className="w-full h-2.5 rounded-full overflow-hidden"
              style={{ background: "rgba(11,31,58,.08)" }}
            >
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Team Members & Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Team Members */}
          <div className="space-y-4">
            <h3
              className="font-bold text-lg flex items-center gap-2"
              style={{ color: "var(--iwms-navy)" }}
            >
              <Users className="w-5 h-5" style={{ color: "var(--iwms-sky)" }} /> Team Members ({project.teamMembers.length})
            </h3>

            <div
              className="iwms-card p-4 space-y-3"
              style={{ borderRadius: "14px" }}
            >
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
                    className="p-3 rounded-lg text-xs"
                    style={{
                      background: "rgba(56,189,248,.06)",
                      border: "1px solid var(--iwms-border)",
                    }}
                  >
                    <p
                      className="font-bold text-sm"
                      style={{ color: "var(--iwms-black)" }}
                    >
                      {intern?.name || "Intern"}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "rgba(11,31,58,.55)" }}
                    >
                      {intern?.internId || intern?.email} • {intern?.department || "General"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Task Breakdown */}
          <div className="lg:col-span-2 space-y-4">
            <h3
              className="font-bold text-lg flex items-center gap-2"
              style={{ color: "var(--iwms-navy)" }}
            >
              <FolderGit2 className="w-5 h-5" style={{ color: "var(--iwms-sky)" }} /> Project Tasks ({tasks.length})
            </h3>

            {tasks.length === 0 ? (
              <div
                className="iwms-card p-8 text-center"
                style={{ borderRadius: "14px", color: "rgba(11,31,58,.50)" }}
              >
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p
                  className="font-semibold text-sm"
                  style={{ color: "var(--iwms-navy)" }}
                >
                  No project tasks allocated yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((t) => {
                  const assignee = t.assignedInternId as unknown as {
                    name?: string;
                    internId?: string;
                  };

                  return (
                    <div
                      key={t._id}
                      className="iwms-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-300"
                      style={{ borderRadius: "14px" }}
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

                        <h4
                          className="font-bold text-sm truncate"
                          style={{ color: "var(--iwms-black)" }}
                        >
                          {t.title}
                        </h4>
                        <p
                          className="text-xs line-clamp-2"
                          style={{ color: "rgba(11,31,58,.55)" }}
                        >
                          {t.description}
                        </p>

                        <div
                          className="flex items-center gap-4 text-[11px] pt-1"
                          style={{ color: "rgba(11,31,58,.55)" }}
                        >
                          <span>
                            Assignee:{" "}
                            <strong style={{ color: "var(--iwms-black)" }}>
                              {assignee?.name || t.assignedInternSnapshot?.name || "Unassigned"}
                            </strong>
                          </span>
                          <span>
                            Due: <strong style={{ color: "var(--iwms-black)" }}>{formatDate(t.dueDate)}</strong>
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/intern/tasks/${t._id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0"
                        style={{
                          background: "rgba(56,189,248,.12)",
                          color: "var(--iwms-sky)",
                        }}
                      >
                        View & Submit <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
