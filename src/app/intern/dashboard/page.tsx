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
  const totalActive    = tasks.length;

  const kpis: (KpiCard & { href: string })[] = [
    {
      label: "To Do (Unstarted)",
      value: assignedCount,
      sublabel: "Assigned, ready to start",
      accent: "var(--iwms-navy)",
      icon: ListTodo,
      href: "/intern/tasks?status=assigned",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      sublabel: "Currently working on",
      accent: "var(--iwms-sky)",
      icon: TrendingUp,
      href: "/intern/tasks?status=in_progress",
    },
    {
      label: "Under Review",
      value: submittedCount,
      sublabel: "Submitted to supervisor",
      accent: "#f59e0b",
      icon: Clock,
      href: "/intern/tasks?status=submitted",
    },
    {
      label: "Approved",
      value: approvedCount,
      sublabel: "Successfully completed",
      accent: "#10b981",
      icon: CheckCircle,
      href: "/intern/tasks?status=approved",
    },
  ];

  return (
    <>
      <DashboardHeader
        title="Intern Workspace"
        description="Your assigned assignments, current deliverable statuses, and pending tasks"
      />

      <main className="p-3 sm:p-5 lg:p-8 space-y-3 sm:space-y-5 lg:space-y-8">
        {/* ── Summary & KPI Strip ──────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs sm:text-sm font-semibold" style={{ color: "var(--iwms-navy)" }}>
            Overview &bull; <span className="font-normal text-slate-500">{totalActive} total task{totalActive !== 1 ? "s" : ""} on your roster</span>
          </p>
          <Link
            href="/intern/tasks"
            className="text-xs font-semibold hover:underline inline-flex items-center gap-1"
            style={{ color: "var(--iwms-sky)" }}
          >
            All Tasks ({totalActive}) <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="iwms-card flex md:flex-col items-center md:items-start gap-3 px-3 py-3 md:p-5 transition-transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                style={{ borderRadius: "12px" }}
              >
                {/* Icon badge */}
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${kpi.accent}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color: kpi.accent }} />
                </span>

                {/* Text group */}
                <div className="min-w-0 flex-1 md:w-full">
                  <p
                    className="text-[10px] font-bold uppercase tracking-wide leading-tight truncate"
                    style={{ color: "rgba(11,31,58,.55)" }}
                    title={kpi.label}
                  >
                    {kpi.label}
                  </p>
                  <p
                    className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight mt-0.5"
                    style={{ color: kpi.accent }}
                  >
                    {isLoading ? "…" : kpi.value}
                  </p>
                  <p
                    className="hidden sm:block text-[10px] leading-tight mt-0.5 truncate"
                    style={{ color: "rgba(11,31,58,.45)" }}
                  >
                    {kpi.sublabel}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── Changes-requested alert ────────────────────────── */}
        {changesCount > 0 && (
          <div
            className="iwms-card flex items-start sm:items-center justify-between gap-3 px-3.5 py-3"
            style={{
              borderRadius: "10px",
              borderLeft: "3px solid #ef4444",
              background: "rgba(239,68,68,.04)",
            }}
          >
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <p
                  className="font-semibold text-xs sm:text-sm leading-tight"
                  style={{ color: "#991b1b" }}
                >
                  {changesCount} task{changesCount > 1 ? "s" : ""} require{changesCount === 1 ? "s" : ""} revisions!
                </p>
                <p
                  className="text-[10px] sm:text-xs mt-0.5 leading-tight"
                  style={{ color: "#b91c1c" }}
                >
                  Supervisor feedback pending review.
                </p>
              </div>
            </div>
            <Link
              href="/intern/tasks?status=changes_requested"
              className="text-[10px] sm:text-xs font-bold text-red-700 hover:underline inline-flex items-center gap-0.5 whitespace-nowrap shrink-0"
            >
              View <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* ── Current Assigned Tasks table ───────────────────── */}
        <div
          className="iwms-card overflow-hidden"
          style={{ borderRadius: "12px" }}
        >
          {/* Table header */}
          <div
            className="px-4 sm:px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--iwms-border)" }}
          >
            <h3
              className="font-bold text-sm sm:text-base"
              style={{ color: "var(--iwms-black)" }}
            >
              Current Tasks
            </h3>
            <Link
              href="/intern/tasks"
              className="text-[11px] sm:text-xs font-semibold hover:underline inline-flex items-center gap-0.5"
              style={{ color: "var(--iwms-sky)" }}
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div>
            {isLoading ? (
              <div
                className="p-6 text-center text-xs sm:text-sm"
                style={{ color: "rgba(11,31,58,.45)" }}
              >
                Loading tasks…
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-8 text-center">
                <CheckSquare
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: "rgba(56,189,248,.3)" }}
                />
                <p
                  className="font-semibold text-xs sm:text-sm"
                  style={{ color: "var(--iwms-navy)" }}
                >
                  No active tasks
                </p>
                <p
                  className="text-[10px] sm:text-xs mt-1"
                  style={{ color: "rgba(11,31,58,.4)" }}
                >
                  You are all caught up!
                </p>
              </div>
            ) : (
              tasks.slice(0, 5).map((task) => (
                <div
                  key={task._id}
                  className="px-4 sm:px-5 py-3 flex flex-col gap-2 transition-colors hover:bg-sky-50/40"
                  style={{ borderBottom: "1px solid var(--iwms-border)" }}
                >
                  {/* Row 1: title + badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="font-semibold text-xs sm:text-sm leading-tight"
                      style={{ color: "var(--iwms-black)" }}
                    >
                      {task.title}
                    </span>
                    <Link
                      href={`/intern/tasks/${task._id}`}
                      className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors inline-flex items-center gap-1 shrink-0"
                      style={{
                        background: "rgba(56,189,248,.12)",
                        color: "var(--iwms-sky)",
                      }}
                    >
                      {task.status === "assigned"
                        ? "Start Task"
                        : task.status === "approved"
                        ? "View Result"
                        : task.status === "submitted"
                        ? "View Status"
                        : "Open"} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Row 2: badges + due date */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border capitalize ${getStatusBadgeClass(task.status)}`}
                    >
                      {task.status.replace("_", " ")}
                    </span>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold uppercase ${getPriorityBadgeClass(task.priority)}`}
                    >
                      {task.priority}
                    </span>
                    <span
                      className="ml-auto text-[10px] sm:text-xs"
                      style={{ color: "rgba(11,31,58,.50)" }}
                    >
                      Due <strong style={{ color: "var(--iwms-black)" }}>{formatDate(task.dueDate)}</strong>
                    </span>
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
