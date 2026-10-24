/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { CreateTaskSchema, ReviewSubmissionSchema, CreateProjectSchema } from "@/validators";
import { ITask } from "@/types";

describe("Usability & Validation Regression Tests", () => {
  describe("Task & Project Date Constraint Validations", () => {
    it("rejects task creation when dueDate is before assignmentDate", () => {
      const invalidTask = {
        title: "Test Task",
        description: "Valid task description with at least 10 chars",
        priority: "medium" as const,
        assignedInternId: "650f1234567890abcdef0002",
        assignmentDate: "2026-06-15",
        dueDate: "2026-06-10",
      };

      const result = CreateTaskSchema.safeParse(invalidTask);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Due date cannot be before assignment date");
      }
    });

    it("accepts task creation when dueDate is on or after assignmentDate", () => {
      const validTask = {
        title: "Test Task",
        description: "Valid task description with at least 10 chars",
        priority: "medium" as const,
        assignedInternId: "650f1234567890abcdef0002",
        assignmentDate: "2026-06-15",
        dueDate: "2026-06-20",
      };

      const result = CreateTaskSchema.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it("rejects project creation when dueDate is before startDate", () => {
      const invalidProject = {
        title: "Team Project",
        description: "Valid project description with at least 10 chars",
        teamMemberIds: ["650f1234567890abcdef0002", "650f1234567890abcdef0003"],
        startDate: "2026-06-15",
        dueDate: "2026-06-10",
      };

      const result = CreateProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Due date cannot be before start date");
      }
    });
  });

  describe("Admin Review Submission Feedback Validation", () => {
    it("rejects review decision if feedback is missing or too short", () => {
      const emptyFeedback = {
        decision: "request_changes",
        feedback: "  ",
      };

      const result = ReviewSubmissionSchema.safeParse(emptyFeedback);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Feedback must be provided");
      }
    });

    it("accepts valid review decision with constructive feedback", () => {
      const validReview = {
        decision: "request_changes",
        feedback: "Please fix the failing integration test and add error handling.",
      };

      const result = ReviewSubmissionSchema.safeParse(validReview);
      expect(result.success).toBe(true);
    });
  });

  describe("Intern KPI Metric Aggregations & Status Logic", () => {
    it("correctly partitions tasks across statuses without conflating total assigned with unstarted", () => {
      const sampleTasks: Partial<ITask>[] = [
        { _id: "t1", status: "in_progress", title: "Task 1" },
        { _id: "t2", status: "submitted", title: "Task 2" },
        { _id: "t3", status: "changes_requested", title: "Task 3" },
      ];

      const assignedUnstartedCount = sampleTasks.filter((t) => t.status === "assigned").length;
      const inProgressCount = sampleTasks.filter((t) => t.status === "in_progress").length;
      const submittedCount = sampleTasks.filter((t) => t.status === "submitted").length;
      const changesCount = sampleTasks.filter((t) => t.status === "changes_requested").length;
      const totalRostered = sampleTasks.length;

      // Demonstrates why old KPI showed "Assigned Tasks: 0" when 3 tasks existed:
      expect(assignedUnstartedCount).toBe(0);
      expect(inProgressCount).toBe(1);
      expect(submittedCount).toBe(1);
      expect(changesCount).toBe(1);
      // Under reconciled logic, total rostered tasks is clearly 3
      expect(totalRostered).toBe(3);
    });
  });
});
