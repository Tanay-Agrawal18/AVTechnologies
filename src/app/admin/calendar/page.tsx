"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { UnifiedCalendarView } from "@/components/UnifiedCalendarView";
import { ITask, IUser } from "@/types";

export default function AdminCalendarPage() {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [interns, setInterns] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState<{
    internId?: string;
    priority?: string;
    status?: string;
  }>({});

  const fetchInterns = async () => {
    try {
      const res = await fetch("/api/admin/interns?status=active");
      if (res.ok) {
        const data = await res.json();
        setInterns(data.interns || []);
      }
    } catch (e) {
      console.error("Failed to fetch active interns for calendar:", e);
    }
  };

  const fetchTasks = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterns();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  return (
    <>
      <DashboardHeader
        title="Task Deadline Calendar"
        description="Unified visual view of all active team assignments, due dates, and operational timelines"
      />

      <main className="p-3 sm:p-5 lg:p-8 space-y-4">
        <UnifiedCalendarView
          tasks={tasks}
          isLoading={isLoading}
          role="admin"
          interns={interns}
          onFilterChange={(newFilters) => setFilters(newFilters)}
        />
      </main>
    </>
  );
}
