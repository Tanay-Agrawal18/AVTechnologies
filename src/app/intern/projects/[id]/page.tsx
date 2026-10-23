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
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Projects
          </Link>
        </div>

        {/* Project Overview Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
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
                Deadline: <strong>{formatDate(project.dueDate)}</strong>
              </span>
            </div>

            <div className="text-xs text-slate-500">
              Started: {formatDate(project.startDate)}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Project Description
            </h4>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
              {project.description}
            </p>
          </div>

          {/* Progress Summary */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider">
                Team Milestone Progress: {progress.completionPercentage}%
              </span>
              <span className="text-slate-500">
                {progress.approved} of {progress.totalTasks} task(s) completed
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
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
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" /> Team Members ({project.teamMembers.length})
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
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                  >
                    <p className="font-bold text-slate-900 text-sm">
                      {intern?.name || "Intern"}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {intern?.internId || intern?.email} • {intern?.department || "General"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Task Breakdown */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-indigo-600" /> Project Tasks ({tasks.length})
            </h3>

            {tasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No project tasks allocated yet</p>
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
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
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
                        <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                          <span>
                            Assignee:{" "}
                            <strong className="text-slate-700">
                              {assignee?.name || t.assignedInternSnapshot?.name || "Unassigned"}
                            </strong>
                          </span>
                          <span>Due: {formatDate(t.dueDate)}</span>
                        </div>
                      </div>

                      <Link
                        href={`/intern/tasks/${t._id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shrink-0"
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
