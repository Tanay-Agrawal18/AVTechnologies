"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { UnifiedCalendarView } from "@/components/UnifiedCalendarView";
import { AdminCreateEventModal } from "@/components/AdminCreateEventModal";
import { ITask, IUser, ICalendarEvent } from "@/types";

export default function AdminCalendarPage() {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [events, setEvents] = useState<ICalendarEvent[]>([]);
  const [interns, setInterns] = useState<IUser[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [filters, setFilters] = useState<{
    internId?: string;
    priority?: string;
    status?: string;
    eventType?: string;
  }>({});

  const fetchInterns = async () => {
    try {
      const res = await fetch("/api/admin/interns?status=active");
      if (res.ok) {
        const data = await res.json();
        const activeList: IUser[] = data.interns || [];
        setInterns(activeList);

        // Derive existing department list from active interns
        const depts = Array.from(
          new Set(
            activeList
              .map((u) => u.department)
              .filter((d): d is string => Boolean(d && d.trim()))
          )
        );
        setDepartments(depts);
      }
    } catch (e) {
      console.error("Failed to fetch active interns for calendar:", e);
    }
  };

  const fetchTasks = async () => {
    try {
      const query = new URLSearchParams();
      if (filters.internId && filters.internId !== "all") {
        query.set("internId", filters.internId);
      }
      if (filters.priority && filters.priority !== "all") {
        query.set("priority", filters.priority);
      }
      if (filters.status && filters.status !== "all") {
        query.set("status", filters.status);
      }

      const res = await fetch(`/api/admin/calendar?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error("Failed to load admin calendar tasks:", e);
    }
  };

  const fetchEvents = async () => {
    try {
      const query = new URLSearchParams();
      if (filters.eventType && filters.eventType !== "all" && filters.eventType !== "tasks") {
        query.set("type", filters.eventType);
      }

      const res = await fetch(`/api/admin/calendar/events?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error("Failed to load admin calendar events:", e);
    }
  };

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchTasks(), fetchEvents()]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInterns();
  }, []);

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

  const handleEventCreated = (newEvent: ICalendarEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
  };

  const handleEventCancelled = (updatedEvent: ICalendarEvent) => {
    setEvents((prev) =>
      prev.map((e) => (e._id === updatedEvent._id ? updatedEvent : e))
    );
  };

  const handleEventPublished = (updatedEvent: ICalendarEvent) => {
    setEvents((prev) =>
      prev.map((e) => (e._id === updatedEvent._id ? updatedEvent : e))
    );
  };

  return (
    <>
      <DashboardHeader
        title="Admin Calendar & Announcements"
        description="Unified visual view of team deadlines, official notices, meetings, and company holidays"
      />

      <main className="p-3 sm:p-5 lg:p-8 space-y-4">
        <UnifiedCalendarView
          tasks={tasks}
          events={events}
          isLoading={isLoading}
          role="admin"
          interns={interns}
          onFilterChange={(newFilters) => setFilters(newFilters)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onEventCancelled={handleEventCancelled}
          onEventPublished={handleEventPublished}
        />
      </main>

      <AdminCreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleEventCreated}
        interns={interns}
        departments={departments}
      />
    </>
  );
}
