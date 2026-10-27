"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ITask } from "@/types";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import { CheckSquare, ArrowRight, Filter, CalendarDays } from "lucide-react";
import { TaskCardSkeleton } from "@/components/Skeleton";

export default function InternTasksPage() {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = () => {
    const query = new URLSearchParams();
    if (statusFilter !== "all") query.set("status", statusFilter);

    fetch(`/api/intern/tasks?${query.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tasks) {
          setTasks(data.tasks);
        }
      })
      .catch((err) => {
        console.error("Failed to load intern tasks:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setIsLoading(true);
    fetchTasks();
  }, [statusFilter]);

  useEffect(() => {
    const handleRealtime = (e: Event) => {
      const custom = e as CustomEvent<{ type: string }>;
      if (!custom.detail || custom.detail.type?.startsWith("task_") || custom.detail.type?.startsWith("project_")) {
        fetchTasks();
      }
    };
    window.addEventListener("iwms:realtime", handleRealtime);
    window.addEventListener("iwms:revalidate", handleRealtime);

    return () => {
      window.removeEventListener("iwms:realtime", handleRealtime);
      window.removeEventListener("iwms:revalidate", handleRealtime);
    };
  }, [statusFilter]);

  return (
    <>
      <DashboardHeader
        title="My Assigned Tasks"
        description="View instructions, submit your work deliverables, and track revision requests"
      />

      <main className="p-3 sm:p-5 lg:p-8 space-y-3 sm:space-y-5">
        {/* ── Filter bar ─────────────────────────────────────── */}
        <div
          className="iwms-card flex flex-wrap items-center justify-between px-3.5 py-2.5 gap-2"
          style={{ borderRadius: "10px" }}
        >
          <div className="flex items-center gap-2">
            <Filter
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
              <option value="all">All Assignments</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/intern/calendar"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <CalendarDays className="w-3.5 h-3.5 text-sky-600" />
              <span>Calendar View</span>
            </Link>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] sm:text-xs font-medium"
                style={{ color: "rgba(11,31,58,.55)" }}
              >
                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* ── Task Cards ─────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div
            className="iwms-card py-10 px-5 text-center"
            style={{ borderRadius: "12px" }}
          >
            <CheckSquare
              className="w-9 h-9 mx-auto mb-3"
              style={{ color: "rgba(56,189,248,.35)" }}
            />
            <h3
              className="font-bold text-sm sm:text-base"
              style={{ color: "var(--iwms-navy)" }}
            >
              No tasks match the selected filter
            </h3>
            <p
              className="text-[10px] sm:text-xs mt-1"
              style={{ color: "rgba(11,31,58,.45)" }}
            >
              Check back later or adjust the status dropdown.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {tasks.map((task) => (
              <div
                key={task._id}
                className="iwms-card flex flex-col justify-between transition-shadow hover:shadow-md"
                style={{ padding: "0.875rem 1rem", borderRadius: "12px" }}
              >
                {/* Top: badges + title + description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border capitalize ${getStatusBadgeClass(
                        task.status
                      )}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={
                          task.status === "assigned"
                            ? { background: "#1D6CE5" }
                            : {}
                        }
                      />
                      {task.status.replace("_", " ")}
                    </span>

                    {/* Priority badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase ${getPriorityBadgeClass(
                        task.priority
                      )}`}
                    >
                      {task.priority === "urgent" && (
                        <span className="w-3 h-3 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-black leading-none">
                          !
                        </span>
                      )}
                      {task.priority}
                    </span>
                  </div>

                  {/* Task info */}
                  <div>
                    <h3
                      className="font-bold text-sm sm:text-base line-clamp-1"
                      style={{ color: "var(--iwms-navy)" }}
                    >
                      {task.title}
                    </h3>
                    <p
                      className="text-[11px] sm:text-xs line-clamp-2 mt-0.5 leading-relaxed"
                      style={{ color: "rgba(11,31,58,.55)" }}
                    >
                      {task.description}
                    </p>
                  </div>
                </div>

                {/* Bottom: due date + CTA */}
                <div
                  className="pt-2.5 mt-2.5 flex items-center justify-between gap-2"
                  style={{ borderTop: "1px solid rgba(11,31,58,.07)" }}
                >
                  <div
                    className="text-[10px] sm:text-xs flex items-center gap-1"
                    style={{ color: "rgba(11,31,58,.55)" }}
                  >
                    <CalendarDays
                      className="w-3 h-3 flex-shrink-0"
                      style={{ color: "var(--iwms-sky)" }}
                    />
                    Due:{" "}
                    <strong style={{ color: "var(--iwms-black)" }}>
                      {formatDate(task.dueDate)}
                    </strong>
                  </div>

                  <Link
                    href={`/intern/tasks/${task._id}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold text-white transition-all shadow-xs hover:opacity-90 shrink-0 ${
                      task.status === "changes_requested"
                        ? "animate-pulse"
                        : ""
                    }`}
                    style={{
                      background:
                        task.status === "approved"
                          ? "#10b981"
                          : task.status === "changes_requested"
                          ? "#ef4444"
                          : task.status === "submitted"
                          ? "#f59e0b"
                          : "#1D6CE5",
                      borderRadius: "7px",
                    }}
                  >
                    {task.status === "assigned"
                      ? "Start Task"
                      : task.status === "approved"
                      ? "View Completed"
                      : task.status === "submitted"
                      ? "Awaiting Review"
                      : task.status === "changes_requested"
                      ? "Review & Revise"
                      : "Submit Work"} <ArrowRight className="w-3 h-3" />
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
