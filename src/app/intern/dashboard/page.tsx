"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ITask } from "@/types";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  CheckSquare,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  ListTodo,
} from "lucide-react";

interface KpiCard {
  label: string;
  value: number;
  sublabel: string;
  accent: string;
  icon: React.ElementType;
}

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

  const assignedCount  = tasks.filter((t) => t.status === "assigned").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const submittedCount = tasks.filter((t) => t.status === "submitted").length;
  const approvedCount  = tasks.filter((t) => t.status === "approved").length;
  const changesCount   = tasks.filter((t) => t.status === "changes_requested").length;

  const kpis: KpiCard[] = [
    {
      label: "Assigned Tasks",
      value: assignedCount,
      sublabel: "Ready to be started",
      accent: "var(--iwms-navy)",
      icon: ListTodo,
    },
    {
      label: "In Progress",
      value: inProgressCount,
      sublabel: "Currently working on",
      accent: "var(--iwms-sky)",
      icon: TrendingUp,
    },
    {
      label: "Under Review",
      value: submittedCount,
      sublabel: "Submitted to supervisor",
      accent: "#f59e0b",
      icon: Clock,
    },
    {
      label: "Approved",
      value: approvedCount,
      sublabel: "Successfully completed",
      accent: "#10b981",
      icon: CheckCircle,
    },
  ];

  return (
    <>
      <DashboardHeader
        title="Intern Workspace"
        description="Your assigned assignments, current deliverable statuses, and pending tasks"
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
        {/* ── KPI Strip ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="iwms-card p-5 flex flex-col gap-3"
                style={{ borderRadius: "14px" }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "rgba(11,31,58,.50)" }}
                  >
                    {kpi.label}
                  </span>
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${kpi.accent}18` }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: kpi.accent }}
                    />
                  </span>
                </div>
                <p
                  className="text-3xl font-extrabold leading-none"
                  style={{ color: kpi.accent }}
                >
                  {kpi.value}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "rgba(11,31,58,.40)" }}
                >
                  {kpi.sublabel}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Changes-requested alert ────────────────────────── */}
        {changesCount > 0 && (
          <div
            className="iwms-card flex items-center justify-between gap-4 px-5 py-4"
            style={{
              borderRadius: "12px",
              borderLeft: "3px solid #ef4444",
              background: "rgba(239,68,68,.04)",
            }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p
                  className="font-semibold text-sm"
                  style={{ color: "#991b1b" }}
                >
                  {changesCount} task{changesCount > 1 ? "s" : ""}{" "}
                  require{changesCount === 1 ? "s" : ""} revisions!
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "#b91c1c" }}
                >
                  Supervisor has provided feedback. Please review and revise.
                </p>
              </div>
            </div>
            <Link
              href="/intern/tasks?status=changes_requested"
              className="text-xs font-bold text-red-700 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              View Feedback <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ── Current Assigned Tasks table ───────────────────── */}
        <div
          className="iwms-card overflow-hidden"
          style={{ borderRadius: "14px" }}
        >
          {/* Table header */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--iwms-border)" }}
          >
            <h3
              className="font-bold text-base"
              style={{ color: "var(--iwms-black)" }}
            >
              Current Assigned Tasks
            </h3>
            <Link
              href="/intern/tasks"
              className="text-xs font-semibold hover:underline"
              style={{ color: "var(--iwms-sky)" }}
            >
              View All Tasks →
            </Link>
          </div>

          <div>
            {isLoading ? (
              <div
                className="p-8 text-center text-sm"
                style={{ color: "rgba(11,31,58,.45)" }}
              >
                Loading tasks…
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-10 text-center">
                <CheckSquare
                  className="w-10 h-10 mx-auto mb-2"
                  style={{ color: "rgba(56,189,248,.3)" }}
                />
                <p
                  className="font-semibold text-sm"
                  style={{ color: "var(--iwms-navy)" }}
                >
                  No active tasks
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "rgba(11,31,58,.4)" }}
                >
                  You are all caught up!
                </p>
              </div>
            ) : (
              tasks.slice(0, 5).map((task) => (
                <div
                  key={task._id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-sky-50/40"
                  style={{ borderBottom: "1px solid var(--iwms-border)" }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className="font-bold text-sm"
                        style={{ color: "var(--iwms-black)" }}
                      >
                        {task.title}
                      </span>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClass(
                          task.status
                        )}`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${getPriorityBadgeClass(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <p
                      className="text-xs line-clamp-1 max-w-xl"
                      style={{ color: "rgba(11,31,58,.50)" }}
                    >
                      {task.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs flex-shrink-0">
                    <span style={{ color: "rgba(11,31,58,.50)" }}>
                      Due:{" "}
                      <strong style={{ color: "var(--iwms-black)" }}>
                        {formatDate(task.dueDate)}
                      </strong>
                    </span>
                    <Link
                      href={`/intern/tasks/${task._id}`}
                      className="px-3.5 py-1.5 rounded-lg font-semibold transition-colors inline-flex items-center gap-1"
                      style={{
                        background: "rgba(56,189,248,.12)",
                        color: "var(--iwms-sky)",
                      }}
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
