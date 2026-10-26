import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { AnalyticsFilterSchema } from "@/validators";
import { AnalyticsService } from "@/services/analyticsService";
import { Task } from "@/models/Task";
import { Submission } from "@/models/Submission";
import { User } from "@/models/User";
import { SessionUser } from "@/types";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/cache", () => ({
  CACHE_TTL: {
    ADMIN_ANALYTICS: 60,
    INTERN_ANALYTICS: 60,
  },
  CACHE_KEYS: {
    adminAnalytics: vi.fn().mockReturnValue("mock-admin-key"),
    internAnalytics: vi.fn().mockReturnValue("mock-intern-key"),
    allAnalyticsKeys: vi.fn().mockReturnValue("mock-tag"),
  },
  getOrSetCache: vi.fn((_key, _ttl, fetcher) => fetcher()),
}));

describe("Phase 5: Role-Aware Analytics and Performance Insights Unit Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("AnalyticsFilterSchema Validation", () => {
    it("validates empty filters gracefully", () => {
      const parsed = AnalyticsFilterSchema.safeParse({});
      expect(parsed.success).toBe(true);
    });

    it("accepts valid chronological start and end dates", () => {
      const parsed = AnalyticsFilterSchema.safeParse({
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        department: "Engineering",
        internId: "507f1f77bcf86cd799439011",
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid date format", () => {
      const parsed = AnalyticsFilterSchema.safeParse({
        startDate: "invalid-date-string",
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain("Invalid startDate format");
      }
    });

    it("rejects when startDate is after endDate", () => {
      const parsed = AnalyticsFilterSchema.safeParse({
        startDate: "2026-05-15",
        endDate: "2026-05-10",
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain("startDate cannot be after endDate");
      }
    });
  });

  describe("Admin Analytics Metric Calculations & Aggregations", () => {
    it("correctly computes lifecycle status counts and defined completion and approval rates", async () => {
      // Mock Task.aggregate for status breakdown
      vi.spyOn(Task, "aggregate").mockImplementation((pipeline: any) => {
        // First aggregate call is status counts
        if (pipeline[1]?.$group?._id === "$status") {
          return Promise.resolve([
            { _id: "assigned", count: 2 },
            { _id: "in_progress", count: 3 },
            { _id: "submitted", count: 4 },
            { _id: "changes_requested", count: 1 },
            { _id: "approved", count: 10 },
            { _id: "unassigned", count: 1 },
            { _id: "transferred", count: 1 },
          ]) as any;
        }
        // Workload aggregation
        if (pipeline[1]?.$group?._id === "$assignedInternId") {
          return Promise.resolve([
            {
              _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439022"),
              assignedCount: 2,
              inProgressCount: 3,
              submittedCount: 4,
              changesRequestedCount: 1,
              approvedCount: 10,
              overdueCount: 1,
              totalCount: 20,
            },
          ]) as any;
        }
        // Department aggregation
        return Promise.resolve([
          {
            _id: "Engineering",
            totalTasks: 20,
            completedTasks: 10,
            overdueTasks: 1,
            inProgressTasks: 3,
          },
        ]) as any;
      });

      vi.spyOn(Task, "countDocuments").mockResolvedValue(2 as any);
      vi.spyOn(Task, "find").mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(User, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439022"),
            name: "Alice Intern",
            email: "alice@vyorai.com",
            department: "Engineering",
            internId: "VYOR-26-01",
          },
        ]),
      } as any);

      const result = await AnalyticsService.getAdminAnalytics({});

      // Total = 2 + 3 + 4 + 1 + 10 + 1 + 1 = 22
      expect(result.statusCounts.total).toBe(22);
      expect(result.statusCounts.assigned).toBe(2);
      expect(result.statusCounts.inProgress).toBe(3);
      expect(result.statusCounts.submitted).toBe(4);
      expect(result.statusCounts.changesRequested).toBe(1);
      expect(result.statusCounts.approved).toBe(10);
      expect(result.statusCounts.unassigned).toBe(1);
      expect(result.statusCounts.transferred).toBe(1);

      // Actionable = total - unassigned - transferred = 22 - 1 - 1 = 20
      // Completion Rate = (10 / 20) * 100 = 50%
      expect(result.rates.completionRate).toBe(50);

      // Total evaluated = approved (10) + changesRequested (1) = 11
      // Approval rate = Math.round((10 / 11) * 100) = 91%
      expect(result.rates.approvalRate).toBe(91);

      // Review Backlog
      expect(result.reviewBacklog.pendingReviewsCount).toBe(4);
      expect(result.reviewBacklog.changesRequestedCount).toBe(1);
      expect(result.reviewBacklog.approvedCount).toBe(10);

      // Workload Distribution
      expect(result.workloadDistribution).toHaveLength(1);
      expect(result.workloadDistribution[0].name).toBe("Alice Intern");
      expect(result.workloadDistribution[0].completionRate).toBe(50);

      // Department breakdown
      expect(result.departmentBreakdown).toHaveLength(1);
      expect(result.departmentBreakdown[0].department).toBe("Engineering");
      expect(result.departmentBreakdown[0].completionRate).toBe(50);
    });

    it("handles zero total tasks safely without dividing by zero", async () => {
      vi.spyOn(Task, "aggregate").mockResolvedValue([] as any);
      vi.spyOn(Task, "countDocuments").mockResolvedValue(0 as any);
      vi.spyOn(Task, "find").mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);
      vi.spyOn(User, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await AnalyticsService.getAdminAnalytics({});

      expect(result.statusCounts.total).toBe(0);
      expect(result.rates.completionRate).toBe(0);
      expect(result.rates.approvalRate).toBe(0);
      expect(result.workloadDistribution).toEqual([]);
      expect(result.departmentBreakdown).toEqual([]);
    });
  });

  describe("Intern Analytics Data Isolation & Feedback Visibility", () => {
    it("returns strictly scoped metrics and supervisor feedback for the authenticated intern", async () => {
      const internId = "507f1f77bcf86cd799439022";

      vi.spyOn(User, "findById").mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(internId),
          name: "Bob Intern",
          email: "bob@vyorai.com",
          internId: "VYOR-26-02",
          department: "Frontend",
        }),
      } as any);

      vi.spyOn(Task, "aggregate").mockResolvedValue([
        { _id: "assigned", count: 1 },
        { _id: "in_progress", count: 2 },
        { _id: "submitted", count: 1 },
        { _id: "changes_requested", count: 1 },
        { _id: "approved", count: 5 },
      ] as any);

      vi.spyOn(Task, "countDocuments").mockImplementation((query: any) => {
        // Strict assertion: Query must filter by assignedInternId matching the authenticated intern
        expect(query.assignedInternId.toString()).toBe(internId);
        return Promise.resolve(1) as any;
      });

      vi.spyOn(Task, "find").mockImplementation((query: any) => {
        expect(query.assignedInternId.toString()).toBe(internId);
        return {
          sort: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue([
            {
              _id: new mongoose.Types.ObjectId(),
              title: "Component Refactor",
              priority: "high",
              status: "in_progress",
              dueDate: new Date("2026-11-01"),
            },
          ]),
        } as any;
      });

      vi.spyOn(Submission, "find").mockImplementation((query: any) => {
        // Assert submissions are strictly scoped to the intern's id
        expect(query.internId.toString()).toBe(internId);
        return {
          populate: vi.fn().mockReturnThis(),
          sort: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue([
            {
              _id: new mongoose.Types.ObjectId(),
              taskId: { _id: new mongoose.Types.ObjectId(), title: "Auth Flow" },
              version: 2,
              reviewStatus: "approved",
              adminFeedback: "Clean implementation and good test coverage!",
              createdAt: new Date("2026-10-25"),
              reviewedAt: new Date("2026-10-26"),
            },
          ]),
        } as any;
      });

      const result = await AnalyticsService.getInternAnalytics(internId);

      // Verify Intern Identity
      expect(result.intern.name).toBe("Bob Intern");
      expect(result.intern.internId).toBe("VYOR-26-02");

      // Verify Total & Status Counts: 1 + 2 + 1 + 1 + 5 = 10
      expect(result.statusCounts.total).toBe(10);
      expect(result.statusCounts.approved).toBe(5);

      // Personal Completion Rate = (5 / 10) * 100 = 50%
      expect(result.completionRate).toBe(50);

      // Feedback Visibility
      expect(result.recentActivity).toHaveLength(1);
      expect(result.recentActivity[0].taskTitle).toBe("Auth Flow");
      expect(result.recentActivity[0].adminFeedback).toBe("Clean implementation and good test coverage!");
      expect(result.recentActivity[0].reviewStatus).toBe("approved");
    });

    it("throws an error when intern profile is not found", async () => {
      vi.spyOn(User, "findById").mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(
        AnalyticsService.getInternAnalytics("507f1f77bcf86cd799439099")
      ).rejects.toThrow("Intern not found");
    });
  });
});
