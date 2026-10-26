"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { UnifiedCalendarView } from "@/components/UnifiedCalendarView";
import { ITask } from "@/types";

export default function InternCalendarPage() {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState<{
    priority?: string;
    status?: string;
  }>({});

  const fetchTasks = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  return (
    <>
      <DashboardHeader
        title="My Deadline Calendar"
        description="Track your task deadlines, plan your week, and stay on schedule with deliverables"
      />

      <main className="p-3 sm:p-5 lg:p-8 space-y-4">
        <UnifiedCalendarView
          tasks={tasks}
          isLoading={isLoading}
          role="intern"
          onFilterChange={(newFilters) => setFilters(newFilters)}
        />
      </main>
    </>
  );
}
