"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { UnifiedCalendarView } from "@/components/UnifiedCalendarView";
import { ITask, ICalendarEvent } from "@/types";

export default function InternCalendarPage() {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [events, setEvents] = useState<ICalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState<{
    priority?: string;
    status?: string;
    eventType?: string;
  }>({});

  const fetchTasks = async () => {
    try {
      const query = new URLSearchParams();
      if (filters.priority && filters.priority !== "all") {
        query.set("priority", filters.priority);
      }
      if (filters.status && filters.status !== "all") {
        query.set("status", filters.status);
      }

      const res = await fetch(`/api/intern/calendar?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error("Failed to load intern calendar tasks:", e);
    }
  };

  const fetchEvents = async () => {
    try {
      const query = new URLSearchParams();
      if (filters.eventType && filters.eventType !== "all" && filters.eventType !== "tasks") {
        query.set("type", filters.eventType);
      }

      const res = await fetch(`/api/intern/calendar/events?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error("Failed to load intern calendar events:", e);
    }
  };

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchTasks(), fetchEvents()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [filters]);

  useEffect(() => {
    const handleRealtime = (e: Event) => {
      const custom = e as CustomEvent<{ type: string }>;
      if (!custom.detail || custom.detail.type?.startsWith("calendar_") || custom.detail.type?.startsWith("task_")) {
        loadAll();
      }
    };
    window.addEventListener("iwms:realtime", handleRealtime);
    window.addEventListener("iwms:revalidate", handleRealtime);

    return () => {
      window.removeEventListener("iwms:realtime", handleRealtime);
      window.removeEventListener("iwms:revalidate", handleRealtime);
    };
  }, [filters]);

  return (
    <>
      <DashboardHeader
        title="Schedule & Announcements"
        description="Track your personal deadlines, official company announcements, meetings, and holiday schedules"
      />

      <main className="p-2.5 sm:p-4 lg:p-5 space-y-3">
        <UnifiedCalendarView
          tasks={tasks}
          events={events}
          isLoading={isLoading}
          role="intern"
          onFilterChange={(newFilters) => setFilters(newFilters)}
        />
      </main>
    </>
  );
}
