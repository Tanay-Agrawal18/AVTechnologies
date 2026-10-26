"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ITask } from "@/types";
import { formatDate, getStatusBadgeClass, getPriorityBadgeClass } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  Filter,
  AlertCircle,
  X,
  List,
  Grid3X3,
  Columns,
  User as UserIcon,
} from "lucide-react";

export type CalendarViewMode = "month" | "week" | "agenda";

interface UnifiedCalendarViewProps {
  tasks: ITask[];
  isLoading: boolean;
  role: "admin" | "intern";
  onFilterChange?: (filters: {
    internId?: string;
    priority?: string;
    status?: string;
  }) => void;
  interns?: Array<{ _id: string; name: string; internId?: string }>;
}

export function UnifiedCalendarView({
  tasks,
  isLoading,
  role,
  onFilterChange,
  interns = [],
}: UnifiedCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);

  // Filter States
  const [selectedIntern, setSelectedIntern] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const handleInternChange = (val: string) => {
    setSelectedIntern(val);
    onFilterChange?.({
      internId: val,
      priority: selectedPriority,
      status: selectedStatus,
    });
  };

  const handlePriorityChange = (val: string) => {
    setSelectedPriority(val);
    onFilterChange?.({
      internId: selectedIntern,
      priority: val,
      status: selectedStatus,
    });
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    onFilterChange?.({
      internId: selectedIntern,
      priority: selectedPriority,
      status: val,
    });
  };

  // Filter tasks locally (in case endpoint returns full set or when filtered client-side)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedPriority !== "all" && task.priority !== selectedPriority) return false;
      if (selectedStatus !== "all" && task.status !== selectedStatus) return false;
      if (role === "admin" && selectedIntern !== "all") {
        const internObj = task.assignedInternId as unknown as { _id?: string } | string | undefined;
        const assignedId = typeof internObj === "object" ? internObj?._id : internObj;
        if (assignedId !== selectedIntern) return false;
      }
      return true;
    });
  }, [tasks, selectedPriority, selectedStatus, selectedIntern, role]);

  // Tasks grouped by YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map = new Map<string, ITask[]>();
    for (const task of filteredTasks) {
      if (!task.dueDate) continue;
      const d = new Date(task.dueDate);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(task);
    }
    return map;
  }, [filteredTasks]);

  // Tasks without valid due dates
  const unscheduledTasks = useMemo(() => {
    return filteredTasks.filter((task) => {
      if (!task.dueDate) return true;
      const d = new Date(task.dueDate);
      return isNaN(d.getTime());
    });
  }, [filteredTasks]);

  // Navigation handlers
  const handlePrevious = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") {
        next.setMonth(next.getMonth() - 1);
      } else if (viewMode === "week") {
        next.setDate(next.getDate() - 7);
      } else {
        next.setMonth(next.getMonth() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") {
        next.setMonth(next.getMonth() + 1);
      } else if (viewMode === "week") {
        next.setDate(next.getDate() + 7);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month Grid Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Month days array
  const monthDays = useMemo(() => {
    const days: { date: Date; isCurrentMonth: boolean; dateKey: string }[] = [];

    // Previous month filler days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      days.push({ date: d, isCurrentMonth: false, dateKey });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push({ date: d, isCurrentMonth: true, dateKey });
    }

    // Next month filler days to complete rows (up to multiple of 7)
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const d = new Date(year, month + 1, i);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        days.push({ date: d, isCurrentMonth: false, dateKey });
      }
    }

    return days;
  }, [year, month, firstDayOfWeek, daysInMonth]);

  // Week View Days Calculation
  const weekDays = useMemo(() => {
    const current = new Date(currentDate);
    const dayOfWeek = current.getDay();
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - dayOfWeek);

    const days: { date: Date; dateKey: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      days.push({ date: d, dateKey });
    }
    return days;
  }, [currentDate]);

  const todayKey = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
      t.getDate()
    ).padStart(2, "0")}`;
  })();

  const getTaskLink = (task: ITask) => {
    return role === "admin" ? `/admin/tasks/${task._id}` : `/intern/tasks/${task._id}`;
  };

  const getAssigneeLabel = (task: ITask) => {
    if (role !== "admin") return null;
    const intern = task.assignedInternId as unknown as { name?: string; internId?: string } | undefined;
    return intern?.name || task.assignedInternSnapshot?.name || "Unassigned";
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar & Navigation ─────────────────────────────── */}
      <div
        className="iwms-card p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
        style={{ borderRadius: "12px" }}
      >
        {/* Left: Nav & Month Title */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
            <button
              onClick={handlePrevious}
              aria-label="Previous Period"
              className="p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border-x border-slate-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              aria-label="Next Period"
              className="p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2
            className="text-base sm:text-lg font-bold min-w-[160px]"
            style={{ color: "var(--iwms-navy)" }}
          >
            {viewMode === "week"
              ? `Week of ${weekDays[0].date.toLocaleDateString("default", {
                  month: "short",
                  day: "numeric",
                })} – ${weekDays[6].date.toLocaleDateString("default", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`
              : monthName}
          </h2>
        </div>

        {/* Center: View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setViewMode("month")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "month"
                ? "bg-white text-sky-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Month</span>
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "week"
                ? "bg-white text-sky-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Week</span>
          </button>
          <button
            onClick={() => setViewMode("agenda")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "agenda"
                ? "bg-white text-sky-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Agenda</span>
          </button>
        </div>

        {/* Right: Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-sky-500 shrink-0 hidden sm:inline-block" />

          {/* Admin intern dropdown filter */}
          {role === "admin" && interns.length > 0 && (
            <select
              value={selectedIntern}
              onChange={(e) => handleInternChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Assignees</option>
              {interns.map((intern) => (
                <option key={intern._id} value={intern._id}>
                  {intern.name} {intern.internId ? `(${intern.internId})` : ""}
                </option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="approved">Approved</option>
          </select>

          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* ── Loading Skeleton / Content ──────────────────────── */}
      {isLoading ? (
        <div className="iwms-card p-6 space-y-4" style={{ borderRadius: "14px" }}>
          <div className="h-6 w-48 bg-slate-200 animate-pulse rounded" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* MONTH VIEW */}
          {viewMode === "month" && (
            <div
              className="iwms-card overflow-hidden shadow-2xs"
              style={{ borderRadius: "14px" }}
            >
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center py-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                {monthDays.map((day, idx) => {
                  const dayTasks = tasksByDate.get(day.dateKey) || [];
                  const isToday = day.dateKey === todayKey;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[96px] sm:min-h-[118px] p-1.5 sm:p-2 transition-colors flex flex-col justify-between ${
                        !day.isCurrentMonth
                          ? "bg-slate-50/50 text-slate-400"
                          : "bg-white hover:bg-sky-50/20"
                      }`}
                    >
                      {/* Date header */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded-full inline-block leading-none ${
                            isToday
                              ? "bg-sky-500 text-white font-bold"
                              : day.isCurrentMonth
                              ? "text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          {day.date.getDate()}
                        </span>
                        {dayTasks.length > 0 && (
                          <span className="text-[10px] font-medium text-slate-400">
                            {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                          </span>
                        )}
                      </div>

                      {/* Task items list for this date */}
                      <div className="space-y-1 overflow-y-auto max-h-[80px] sm:max-h-[94px]">
                        {dayTasks.slice(0, 3).map((task) => {
                          const isUrgent = task.priority === "urgent";
                          const isHigh = task.priority === "high";

                          return (
                            <button
                              key={task._id}
                              type="button"
                              onClick={() => setSelectedTask(task)}
                              className={`w-full text-left p-1 rounded text-[11px] leading-tight border transition-transform hover:scale-[1.01] block truncate ${
                                isUrgent
                                  ? "bg-rose-50 border-rose-200 text-rose-800"
                                  : isHigh
                                  ? "bg-amber-50 border-amber-200 text-amber-800"
                                  : task.status === "approved"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                  : "bg-sky-50 border-sky-200 text-sky-900"
                              }`}
                            >
                              <div className="flex items-center gap-1 font-semibold truncate">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    task.status === "approved"
                                      ? "bg-emerald-500"
                                      : task.status === "changes_requested"
                                      ? "bg-rose-500"
                                      : task.status === "submitted"
                                      ? "bg-amber-500"
                                      : "bg-sky-500"
                                  }`}
                                />
                                <span className="truncate">{task.title}</span>
                              </div>
                              {role === "admin" && (
                                <div className="text-[9px] text-slate-500 truncate mt-0.5">
                                  {getAssigneeLabel(task)}
                                </div>
                              )}
                            </button>
                          );
                        })}

                        {dayTasks.length > 3 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTask(dayTasks[3]);
                            }}
                            className="text-[10px] font-semibold text-sky-600 hover:text-sky-800 block text-center py-0.5"
                          >
                            +{dayTasks.length - 3} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === "week" && (
            <div
              className="iwms-card overflow-hidden shadow-2xs"
              style={{ borderRadius: "14px" }}
            >
              <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[380px]">
                {weekDays.map((day, idx) => {
                  const dayTasks = tasksByDate.get(day.dateKey) || [];
                  const isToday = day.dateKey === todayKey;

                  return (
                    <div key={idx} className="p-2 sm:p-3 flex flex-col bg-white">
                      {/* Day column header */}
                      <div
                        className={`text-center pb-2 mb-2 border-b border-slate-100 ${
                          isToday ? "bg-sky-50/60 rounded-t-lg pt-1" : ""
                        }`}
                      >
                        <div className="text-[11px] font-semibold text-slate-500 uppercase">
                          {day.date.toLocaleDateString("default", { weekday: "short" })}
                        </div>
                        <div
                          className={`text-base font-bold inline-block px-2 py-0.5 rounded-full ${
                            isToday ? "bg-sky-500 text-white" : "text-slate-800"
                          }`}
                        >
                          {day.date.getDate()}
                        </div>
                      </div>

                      {/* Day Tasks */}
                      <div className="flex-1 space-y-2 overflow-y-auto max-h-[380px]">
                        {dayTasks.length === 0 ? (
                          <div className="text-center py-6 text-slate-300 text-[11px]">
                            No deadlines
                          </div>
                        ) : (
                          dayTasks.map((task) => (
                            <div
                              key={task._id}
                              onClick={() => setSelectedTask(task)}
                              className="p-2 rounded-lg border border-slate-200 hover:border-sky-300 bg-white hover:bg-sky-50/30 transition-all cursor-pointer shadow-2xs"
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span
                                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase ${getPriorityBadgeClass(
                                    task.priority
                                  )}`}
                                >
                                  {task.priority}
                                </span>
                                <span
                                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded capitalize ${getStatusBadgeClass(
                                    task.status
                                  )}`}
                                >
                                  {task.status.replace("_", " ")}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-900 line-clamp-2">
                                {task.title}
                              </p>
                              {role === "admin" && (
                                <p className="text-[10px] text-slate-500 truncate mt-1 flex items-center gap-1">
                                  <UserIcon className="w-2.5 h-2.5" />
                                  {getAssigneeLabel(task)}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AGENDA / LIST VIEW */}
          {viewMode === "agenda" && (
            <div
              className="iwms-card divide-y divide-slate-100 shadow-2xs"
              style={{ borderRadius: "14px" }}
            >
              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center">
                  <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No scheduled tasks found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting your date range or filter criteria.
                  </p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task._id}
                    className="p-3 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded uppercase ${getPriorityBadgeClass(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-medium rounded capitalize border ${getStatusBadgeClass(
                            task.status
                          )}`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-500" />
                          Due: <strong className="text-slate-700">{formatDate(task.dueDate)}</strong>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                      {role === "admin" && (
                        <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-1">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Assignee: <strong>{getAssigneeLabel(task)}</strong>
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Preview
                      </button>
                      <Link
                        href={getTaskLink(task)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-2xs"
                      >
                        <span>Open Task</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Unscheduled / Missing Due Dates Notice */}
          {unscheduledTasks.length > 0 && (
            <div
              className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 text-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{unscheduledTasks.length} task{unscheduledTasks.length > 1 ? "s" : ""}</strong> have no valid due date set and cannot be displayed on the calendar grid.
                </span>
              </div>
              <span className="font-semibold underline cursor-pointer" onClick={() => setViewMode("agenda")}>
                View in Agenda
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Task Detail Quick Drawer / Modal ─────────────────── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${getPriorityBadgeClass(
                      selectedTask.priority
                    )}`}
                  >
                    {selectedTask.priority}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize border ${getStatusBadgeClass(
                      selectedTask.status
                    )}`}
                  >
                    {selectedTask.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                aria-label="Close dialog"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 text-sm text-slate-700">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Description
                </label>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                  {selectedTask.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Assignment Date</span>
                  <span className="font-semibold text-slate-800">
                    {formatDate(selectedTask.assignmentDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Due Date</span>
                  <span className="font-bold text-sky-700">
                    {formatDate(selectedTask.dueDate)}
                  </span>
                </div>
              </div>

              {role === "admin" && (
                <div className="pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 font-medium block">Assigned Intern</span>
                  <span className="font-semibold text-slate-800">
                    {getAssigneeLabel(selectedTask)}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <Link
                href={getTaskLink(selectedTask)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-2xs"
              >
                <span>Open Task Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
