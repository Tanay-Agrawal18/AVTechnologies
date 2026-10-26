import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as adminCalendarGET } from "@/app/api/admin/calendar/route";
import { GET as internCalendarGET } from "@/app/api/intern/calendar/route";
import { Task } from "@/models/Task";
import { requireAuth } from "@/lib/apiAuth";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/apiAuth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/models/Task", () => ({
  Task: {
    find: vi.fn(),
  },
}));

describe("Phase 6: Unified Deadline Calendar Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Admin Calendar API (/api/admin/calendar)", () => {
    it("enforces admin authorization and rejects unauthorized callers", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: false,
        response: NextResponse.json({ error: "Forbidden: Admin required" }, { status: 403 }),
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/calendar");
      const res = await adminCalendarGET(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Forbidden");
    });

    it("fetches team tasks within date range and populates assignee details", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: "admin-1", role: "admin", name: "Admin", email: "admin@corp.com", status: "active" },
      } as any);

      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: "task-1",
            title: "API Design",
            dueDate: new Date("2026-11-15T00:00:00.000Z"),
            priority: "high",
            status: "in_progress",
            assignedInternId: {
              _id: "intern-1",
              name: "John Doe",
              email: "john@corp.com",
              internId: "AV-001",
            },
          },
        ]),
      };

      vi.mocked(Task.find).mockReturnValue(mockQuery as any);

      const req = new NextRequest(
        "http://localhost:3000/api/admin/calendar?startDate=2026-11-01&endDate=2026-11-30&internId=intern-1&priority=high&status=in_progress"
      );
      const res = await adminCalendarGET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.tasks).toHaveLength(1);
      expect(json.tasks[0].title).toBe("API Design");
      expect(json.tasks[0].assignedInternId.name).toBe("John Doe");

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isArchived: false,
          assignedInternId: "intern-1",
          priority: "high",
          status: "in_progress",
          dueDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        })
      );
    });

    it("handles tasks when date range is empty and queries non-archived tasks", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: "admin-1", role: "admin", name: "Admin", email: "admin@corp.com", status: "active" },
      } as any);

      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(Task.find).mockReturnValue(mockQuery as any);

      const req = new NextRequest("http://localhost:3000/api/admin/calendar");
      const res = await adminCalendarGET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.tasks).toEqual([]);
      expect(Task.find).toHaveBeenCalledWith({ isArchived: false });
    });
  });

  describe("2. Intern Calendar API (/api/intern/calendar)", () => {
    it("enforces intern authentication and rejects admin or non-intern calls", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: false,
        response: NextResponse.json({ error: "Forbidden: Intern required" }, { status: 403 }),
      } as any);

      const req = new NextRequest("http://localhost:3000/api/intern/calendar");
      const res = await internCalendarGET(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Forbidden");
    });

    it("strictly isolates tasks to the authenticated intern and excludes unassigned/transferred/archived", async () => {
      const internId = "intern-auth-123";
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: internId, role: "intern", name: "Intern 1", email: "i1@corp.com", status: "active" },
      } as any);

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: "task-intern-1",
            title: "Frontend Feature",
            dueDate: new Date("2026-11-20T00:00:00.000Z"),
            priority: "medium",
            status: "assigned",
            assignedInternId: internId,
          },
        ]),
      };

      vi.mocked(Task.find).mockReturnValue(mockQuery as any);

      const req = new NextRequest("http://localhost:3000/api/intern/calendar?startDate=2026-11-01&endDate=2026-11-30");
      const res = await internCalendarGET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.tasks).toHaveLength(1);
      expect(json.tasks[0].title).toBe("Frontend Feature");

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedInternId: internId,
          isArchived: false,
          status: { $nin: ["unassigned", "transferred"] },
          dueDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        })
      );
    });

    it("gracefully handles invalid date string parameters by ignoring invalid boundary values", async () => {
      const internId = "intern-auth-123";
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: internId, role: "intern", name: "Intern 1", email: "i1@corp.com", status: "active" },
      } as any);

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(Task.find).mockReturnValue(mockQuery as any);

      const req = new NextRequest("http://localhost:3000/api/intern/calendar?startDate=not-a-valid-date");
      const res = await internCalendarGET(req);

      expect(res.status).toBe(200);
      expect(Task.find).toHaveBeenCalledWith({
        assignedInternId: internId,
        isArchived: false,
        status: { $nin: ["unassigned", "transferred"] },
      });
    });
  });

  describe("3. Calendar Logic & Date Aggregation Properties", () => {
    it("correctly buckets tasks into date keys (YYYY-MM-DD)", () => {
      const tasks = [
        {
          _id: "t1",
          title: "Documentation",
          dueDate: new Date("2026-11-15T14:30:00Z"),
          priority: "urgent",
          status: "in_progress",
        },
        {
          _id: "t2",
          title: "Testing",
          dueDate: new Date("2026-11-15T18:00:00Z"),
          priority: "medium",
          status: "submitted",
        },
        {
          _id: "t3",
          title: "Deploy",
          dueDate: new Date("2026-11-16T10:00:00Z"),
          priority: "low",
          status: "assigned",
        },
        {
          _id: "t4",
          title: "Unscheduled",
          dueDate: null as any,
          priority: "low",
          status: "assigned",
        },
      ];

      const bucketMap = new Map<string, typeof tasks>();
      const unscheduled: typeof tasks = [];

      for (const t of tasks) {
        if (!t.dueDate) {
          unscheduled.push(t);
          continue;
        }
        const d = new Date(t.dueDate);
        if (isNaN(d.getTime())) {
          unscheduled.push(t);
          continue;
        }
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        if (!bucketMap.has(key)) bucketMap.set(key, []);
        bucketMap.get(key)!.push(t);
      }

      expect(bucketMap.get("2026-11-15")?.length).toBe(2);
      expect(bucketMap.get("2026-11-16")?.length).toBe(1);
      expect(unscheduled.length).toBe(1);
      expect(unscheduled[0].title).toBe("Unscheduled");
    });
  });
});
