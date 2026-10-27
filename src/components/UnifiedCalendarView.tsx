"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ITask, ICalendarEvent } from "@/types";
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
  Plus,
  Palmtree,
  Video,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { CalendarEventDetailModal } from "./CalendarEventDetailModal";

export type CalendarViewMode = "month" | "week" | "agenda";

interface UnifiedCalendarViewProps {
  tasks: ITask[];
  events?: ICalendarEvent[];
  isLoading: boolean;
  role: "admin" | "intern";
  onFilterChange?: (filters: {
    internId?: string;
    priority?: string;
    status?: string;
    eventType?: string;
  }) => void;
  interns?: Array<{ _id: string; name: string; internId?: string }>;
  onOpenCreateModal?: () => void;
  onEventCancelled?: (updatedEvent: ICalendarEvent) => void;
  onEventPublished?: (updatedEvent: ICalendarEvent) => void;
}

export function UnifiedCalendarView({
  tasks,
  events = [],
  isLoading,
  role,
  onFilterChange,
  interns = [],
  onOpenCreateModal,
  onEventCancelled,
  onEventPublished,
}: UnifiedCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ICalendarEvent | null>(null);

  // Filter States
  const [selectedIntern, setSelectedIntern] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");

  const handleInternChange = (val: string) => {
    setSelectedIntern(val);
    onFilterChange?.({
      internId: val,
      priority: selectedPriority,
      status: selectedStatus,
      eventType: selectedEventType,
    });
  };

  const handlePriorityChange = (val: string) => {
    setSelectedPriority(val);
    onFilterChange?.({
      internId: selectedIntern,
      priority: val,
      status: selectedStatus,
      eventType: selectedEventType,
    });
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    onFilterChange?.({
      internId: selectedIntern,
      priority: selectedPriority,
      status: val,
      eventType: selectedEventType,
    });
  };

  const handleEventTypeChange = (val: string) => {
    setSelectedEventType(val);
    onFilterChange?.({
      internId: selectedIntern,
      priority: selectedPriority,
      status: selectedStatus,
      eventType: val,
    });
  };

  // Filter tasks locally
  const filteredTasks = useMemo(() => {
    if (selectedEventType !== "all" && selectedEventType !== "tasks") {
      return [];
    }
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
  }, [tasks, selectedPriority, selectedStatus, selectedIntern, selectedEventType, role]);

  // Filter events locally
  const filteredEvents = useMemo(() => {
    if (selectedEventType === "tasks") return [];
    return events.filter((evt) => {
      if (selectedEventType !== "all" && evt.type !== selectedEventType) return false;
      return true;
    });
  }, [events, selectedEventType]);

  // Group tasks by YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map = new Map<string, ITask[]>();
    for (const task of filteredTasks) {
      if (!task.dueDate) continue;
      const d = new Date(task.dueDate);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [filteredTasks]);

  // Group events by YYYY-MM-DD across their date spans
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ICalendarEvent[]>();

    for (const evt of filteredEvents) {
      const start = new Date(evt.startDate);
      const end = new Date(evt.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

      // Iterate through each date the event spans
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endBoundary = new Date(end.getFullYear(), end.getMonth(), end.getDate());

      while (cur <= endBoundary) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
          cur.getDate()
        ).padStart(2, "0")}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(evt);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [filteredEvents]);

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

  const renderEventIcon = (type: string) => {
    switch (type) {
      case "holiday":
        return <Palmtree className="w-2.5 h-2.5 shrink-0 text-emerald-600" />;
      case "meeting":
        return <Video className="w-2.5 h-2.5 shrink-0 text-sky-600" />;
      case "notice":
        return <Megaphone className="w-2.5 h-2.5 shrink-0 text-amber-600" />;
      default:
        return <Sparkles className="w-2.5 h-2.5 shrink-0 text-indigo-600" />;
    }
  };

  const getEventBadgeClass = (evt: ICalendarEvent) => {
    if (evt.status === "cancelled") {
      return "bg-rose-50 border-rose-200 text-rose-700 line-through opacity-70";
    }
    switch (evt.type) {
      case "holiday":
        return "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold";
      case "meeting":
        return "bg-sky-50 border-sky-200 text-sky-800 font-semibold";
      case "notice":
        return "bg-amber-50 border-amber-200 text-amber-900 font-semibold";
      default:
        return "bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold";
    }
  };

  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);

  // Active filter count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedEventType !== "all") count++;
    if (selectedIntern !== "all") count++;
    if (selectedStatus !== "all") count++;
    if (selectedPriority !== "all") count++;
    return count;
  }, [selectedEventType, selectedIntern, selectedStatus, selectedPriority]);

  const clearAllFilters = () => {
    setSelectedEventType("all");
    setSelectedIntern("all");
    setSelectedStatus("all");
    setSelectedPriority("all");
    onFilterChange?.({
      internId: "all",
      priority: "all",
      status: "all",
      eventType: "all",
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar & Navigation ─────────────────────────────── */}
      <div
        className="iwms-card p-3 sm:p-4 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 transition-all"
        style={{ borderRadius: "16px" }}
      >
        {/* Left: Navigation & Period Title */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center p-0.5 bg-slate-100/90 border border-slate-200/80 rounded-xl shadow-2xs">
            <button
              onClick={handlePrevious}
              aria-label="Previous Period"
              className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-sky-700 hover:bg-white rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              aria-label="Next Period"
              className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <h2
              className="text-base sm:text-lg lg:text-xl font-bold tracking-tight"
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

            {/* Total items badge */}
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 rounded-full">
              {filteredEvents.length + filteredTasks.length} Scheduled
            </span>
          </div>

          {/* Admin "Create Event" Quick Action */}
          {role === "admin" && onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 rounded-xl shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Event</span>
            </button>
          )}
        </div>

        {/* Center/Right: View Switcher & Filters */}
        <div className="flex items-center gap-2.5 flex-wrap justify-between lg:justify-end">
          {/* View Switcher Segmented Control */}
          <div className="inline-flex items-center p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl shadow-2xs">
            <button
              onClick={() => setViewMode("month")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "month"
                  ? "bg-white text-sky-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "week"
                  ? "bg-white text-sky-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Week</span>
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "agenda"
                  ? "bg-white text-sky-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>

          {/* Filter Dropdowns with refined styles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-slate-400 pl-1">
              <Filter className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            </div>

            {/* Event Type Filter */}
            <select
              value={selectedEventType}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer shadow-2xs"
            >
              <option value="all">All Types</option>
              <option value="holiday">🌴 Holidays & Vacations</option>
              <option value="meeting">📹 Meetings</option>
              <option value="notice">📢 Official Notices</option>
              <option value="event">✨ Company Events</option>
              <option value="tasks">📋 Tasks Only</option>
            </select>

            {/* Admin intern dropdown filter */}
            {role === "admin" && interns.length > 0 && (
              <select
                value={selectedIntern}
                onChange={(e) => handleInternChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer shadow-2xs max-w-[150px] truncate"
              >
                <option value="all">All Assignees</option>
                {interns.map((intern) => (
                  <option key={intern._id} value={intern._id}>
                    {intern.name} {intern.internId ? `(${intern.internId})` : ""}
                  </option>
                ))}
              </select>
            )}

            {/* Status filter (for tasks) */}
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer shadow-2xs"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="changes_requested">Changes Req.</option>
              <option value="approved">Approved</option>
            </select>

            {/* Priority filter */}
            <select
              value={selectedPriority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer shadow-2xs"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Clear filters shortcut button if any active */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Reset filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Category Quick Legend / Visual Aid ──────────────── */}
      <div className="flex items-center gap-3 sm:gap-4 px-2 overflow-x-auto text-[11px] text-slate-500 py-1 scrollbar-none">
        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] shrink-0">
          Legend:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Holidays</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span>Meetings</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Notices</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>Company Events</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-slate-700" />
          <span>Tasks & Deadlines</span>
        </div>
      </div>

      {/* ── Loading Skeleton / Content ──────────────────────── */}
      {isLoading ? (
        <div className="iwms-card p-6 space-y-4 bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs" style={{ borderRadius: "16px" }}>
          <div className="h-6 w-48 bg-slate-200/70 animate-pulse rounded-lg" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-100/70 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* MONTH VIEW */}
          {viewMode === "month" && (
            <div
              className="iwms-card overflow-hidden bg-white border border-slate-200/80 shadow-sm"
              style={{ borderRadius: "16px" }}
            >
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/90 text-center py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <div className="text-rose-500">Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div className="text-rose-500">Sat</div>
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/40">
                {monthDays.map((day, idx) => {
                  const dayTasks = tasksByDate.get(day.dateKey) || [];
                  const dayEvents = eventsByDate.get(day.dateKey) || [];
                  const totalItems = dayTasks.length + dayEvents.length;
                  const isToday = day.dateKey === todayKey;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[110px] sm:min-h-[135px] p-1.5 sm:p-2 transition-all flex flex-col justify-between group ${
                        !day.isCurrentMonth
                          ? "bg-slate-50/60 text-slate-400"
                          : isToday
                          ? "bg-sky-50/25 ring-1 ring-inset ring-sky-300/60"
                          : "bg-white hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Date header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center justify-center min-w-[24px] leading-tight transition-transform ${
                            isToday
                              ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white font-extrabold shadow-xs scale-105"
                              : day.isCurrentMonth
                              ? "text-slate-800 group-hover:text-sky-700"
                              : "text-slate-400"
                          }`}
                        >
                          {day.date.getDate()}
                        </span>

                        {totalItems > 0 && (
                          <span
                            onClick={() => setExpandedDayKey(expandedDayKey === day.dateKey ? null : day.dateKey)}
                            className="text-[10px] font-semibold text-slate-400 hover:text-sky-600 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            title="Click to view all items for this day"
                          >
                            {totalItems} {totalItems === 1 ? "item" : "items"}
                          </span>
                        )}
                      </div>

                      {/* Items list: Holidays/Events first, then Tasks */}
                      <div className="space-y-1 overflow-y-auto max-h-[85px] sm:max-h-[96px] pr-0.5 scrollbar-thin">
                        {/* Admin-Managed Events (Holidays, Meetings, Notices) */}
                        {dayEvents.slice(0, 2).map((evt) => (
                          <button
                            key={evt._id}
                            type="button"
                            onClick={() => setSelectedEvent(evt)}
                            className={`w-full text-left px-1.5 py-1 rounded-md text-[11px] leading-snug border transition-all hover:scale-[1.01] hover:shadow-2xs block truncate cursor-pointer ${getEventBadgeClass(
                              evt
                            )}`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {renderEventIcon(evt.type)}
                              <span className="truncate font-medium">{evt.title}</span>
                            </div>
                            {role === "admin" && evt.status === "draft" && (
                              <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider mt-0.5">
                                Draft
                              </span>
                            )}
                          </button>
                        ))}

                        {/* Task items list for this date */}
                        {dayTasks.slice(0, 3 - Math.min(dayEvents.length, 2)).map((task) => {
                          const isUrgent = task.priority === "urgent";
                          const isHigh = task.priority === "high";

                          return (
                            <button
                              key={task._id}
                              type="button"
                              onClick={() => setSelectedTask(task)}
                              className={`w-full text-left px-1.5 py-1 rounded-md text-[11px] leading-snug border transition-all hover:scale-[1.01] hover:shadow-2xs block truncate cursor-pointer ${
                                isUrgent
                                  ? "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100/70"
                                  : isHigh
                                  ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/70"
                                  : task.status === "approved"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70"
                                  : "bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100/70"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-medium truncate">
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

                        {/* Show +N more interactive pill */}
                        {totalItems > 3 && (
                          <button
                            type="button"
                            onClick={() => setExpandedDayKey(day.dateKey)}
                            className="text-[10px] font-bold text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded w-full text-center py-0.5 transition-colors cursor-pointer"
                          >
                            +{totalItems - 3} more
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
              className="iwms-card overflow-hidden bg-white border border-slate-200/80 shadow-sm"
              style={{ borderRadius: "16px" }}
            >
              <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[420px]">
                {weekDays.map((day, idx) => {
                  const dayTasks = tasksByDate.get(day.dateKey) || [];
                  const dayEvents = eventsByDate.get(day.dateKey) || [];
                  const isToday = day.dateKey === todayKey;

                  return (
                    <div
                      key={idx}
                      className={`p-2 sm:p-3 flex flex-col transition-colors ${
                        isToday ? "bg-sky-50/20" : "bg-white"
                      }`}
                    >
                      {/* Day column header */}
                      <div
                        className={`text-center pb-2.5 mb-2.5 border-b border-slate-100 ${
                          isToday ? "bg-sky-50/80 rounded-xl pt-1.5 shadow-2xs" : ""
                        }`}
                      >
                        <div
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            day.date.getDay() === 0 || day.date.getDay() === 6
                              ? "text-rose-500"
                              : "text-slate-500"
                          }`}
                        >
                          {day.date.toLocaleDateString("default", { weekday: "short" })}
                        </div>
                        <div
                          className={`text-base font-extrabold inline-block px-2.5 py-0.5 rounded-full mt-0.5 ${
                            isToday
                              ? "bg-gradient-to-r from-sky-600 to-sky-500 text-white shadow-xs"
                              : "text-slate-800"
                          }`}
                        >
                          {day.date.getDate()}
                        </div>
                      </div>

                      {/* Day Items */}
                      <div className="flex-1 space-y-2 overflow-y-auto max-h-[420px] pr-0.5 scrollbar-thin">
                        {dayEvents.map((evt) => (
                          <div
                            key={evt._id}
                            onClick={() => setSelectedEvent(evt)}
                            className={`p-2.5 rounded-xl border transition-all hover:shadow-xs cursor-pointer ${getEventBadgeClass(
                              evt
                            )}`}
                          >
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1">
                              {renderEventIcon(evt.type)}
                              <span>{evt.type}</span>
                            </div>
                            <p className="text-xs font-bold line-clamp-2 leading-snug">{evt.title}</p>
                            {evt.location && (
                              <p className="text-[10px] opacity-80 truncate mt-1.5 flex items-center gap-1">
                                <span>📍</span>
                                <span>{evt.location}</span>
                              </p>
                            )}
                          </div>
                        ))}

                        {dayTasks.map((task) => (
                          <div
                            key={task._id}
                            onClick={() => setSelectedTask(task)}
                            className="p-2.5 rounded-xl border border-slate-200/90 hover:border-sky-300 bg-white hover:bg-sky-50/30 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityBadgeClass(
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
                            <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                              {task.title}
                            </p>
                            {role === "admin" && (
                              <p className="text-[10px] text-slate-500 truncate mt-1.5 flex items-center gap-1">
                                <UserIcon className="w-3 h-3 text-slate-400" />
                                <span>{getAssigneeLabel(task)}</span>
                              </p>
                            )}
                          </div>
                        ))}

                        {dayEvents.length === 0 && dayTasks.length === 0 && (
                          <div className="text-center py-10 text-slate-300 text-xs font-medium">
                            No scheduled items
                          </div>
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
              className="iwms-card divide-y divide-slate-100 bg-white border border-slate-200/80 shadow-sm"
              style={{ borderRadius: "16px" }}
            >
              {filteredEvents.length === 0 && filteredTasks.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-700">No scheduled calendar items found</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Try adjusting your filter selection or navigate to another month.
                  </p>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
                    >
                      Reset active filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Events Section */}
                  {filteredEvents.map((evt) => (
                    <div
                      key={evt._id}
                      className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase border flex items-center gap-1 ${getEventBadgeClass(
                              evt
                            )}`}
                          >
                            {renderEventIcon(evt.type)}
                            <span>{evt.type}</span>
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            {new Date(evt.startDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {!evt.isAllDay &&
                              ` ${new Date(evt.startDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`}
                            {" – "}
                            {new Date(evt.endDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{evt.title}</h4>
                        {evt.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{evt.description}</p>
                        )}
                        {evt.location && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <span>📍</span>
                            <span>{evt.location}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(evt)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Tasks Section */}
                  {filteredTasks.map((task) => (
                    <div
                      key={task._id}
                      className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase ${getPriorityBadgeClass(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg capitalize border ${getStatusBadgeClass(
                              task.status
                            )}`}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            Due: <strong className="text-slate-800">{formatDate(task.dueDate)}</strong>
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                        )}
                        {role === "admin" && (
                          <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
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
                          className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
                        >
                          Preview
                        </button>
                        <Link
                          href={getTaskLink(task)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <span>Open Task</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Unscheduled / Missing Due Dates Notice */}
          {unscheduledTasks.length > 0 && (
            <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-200 bg-amber-50/70 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>
                    {unscheduledTasks.length} task{unscheduledTasks.length > 1 ? "s" : ""}
                  </strong>{" "}
                  have no valid due date set and cannot be placed on the calendar grid.
                </span>
              </div>
              <button
                type="button"
                className="font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer shrink-0"
                onClick={() => setViewMode("agenda")}
              >
                View in Agenda
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Day Details Popover / Modal when clicking +N more ── */}
      {expandedDayKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {new Date(expandedDayKey + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <p className="text-xs text-slate-500">
                  {(eventsByDate.get(expandedDayKey) || []).length +
                    (tasksByDate.get(expandedDayKey) || []).length}{" "}
                  scheduled items
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedDayKey(null)}
                aria-label="Close dialog"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {/* Events for this day */}
              {(eventsByDate.get(expandedDayKey) || []).map((evt) => (
                <div
                  key={evt._id}
                  onClick={() => {
                    setExpandedDayKey(null);
                    setSelectedEvent(evt);
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer hover:shadow-2xs transition-all ${getEventBadgeClass(
                    evt
                  )}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1">
                    {renderEventIcon(evt.type)}
                    <span>{evt.type}</span>
                  </div>
                  <h4 className="text-xs font-bold leading-snug">{evt.title}</h4>
                  {evt.location && (
                    <p className="text-[10px] opacity-80 mt-1">📍 {evt.location}</p>
                  )}
                </div>
              ))}

              {/* Tasks for this day */}
              {(tasksByDate.get(expandedDayKey) || []).map((task) => (
                <div
                  key={task._id}
                  onClick={() => {
                    setExpandedDayKey(null);
                    setSelectedTask(task);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-sky-300 bg-white hover:bg-sky-50/30 transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityBadgeClass(
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
                  <h4 className="text-xs font-bold text-slate-900">{task.title}</h4>
                  {role === "admin" && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Assignee: {getAssigneeLabel(task)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setExpandedDayKey(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
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

      {/* ── Calendar Event Detail Modal ──────────────────────── */}
      <CalendarEventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        role={role}
        onEventCancelled={onEventCancelled}
        onEventPublished={onEventPublished}
      />
    </div>
  );
}
