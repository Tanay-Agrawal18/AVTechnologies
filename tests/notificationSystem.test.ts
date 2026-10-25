import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock connectDB so tests run completely isolated in-memory without live MongoDB connection dependency
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

import mongoose from "mongoose";
import { NotificationService } from "@/services/notificationService";
import { DeadlineReminderService } from "@/services/deadlineReminderService";
import { Notification } from "@/models/Notification";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { NotificationQuerySchema, UpdateNotificationSchema } from "@/validators";
import { SessionUser } from "@/types";

describe("Phase 2: In-App Notifications & Deadline Reminders Unit Tests", () => {
  const adminActor: SessionUser = {
    id: "507f1f77bcf86cd799439011",
    email: "admin@vyorai.com",
    name: "System Administrator",
    role: "admin",
    status: "active",
  };

  const internActor: SessionUser = {
    id: "507f1f77bcf86cd799439022",
    email: "intern@vyorai.com",
    name: "Alex Intern",
    role: "intern",
    internId: "VYOR-26-01",
    status: "active",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validation Schemas", () => {
    it("validates NotificationQuerySchema query parameters", () => {
      const valid = NotificationQuerySchema.safeParse({
        page: "2",
        limit: "25",
        unreadOnly: "true",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.page).toBe(2);
        expect(valid.data.limit).toBe(25);
        expect(valid.data.unreadOnly).toBe("true");
      }

      // Rejects invalid limit (> 50)
      const invalid = NotificationQuerySchema.safeParse({
        limit: "999",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates UpdateNotificationSchema payload", () => {
      const single = UpdateNotificationSchema.safeParse({
        notificationId: "650f1234567890abcdef1234",
        isRead: true,
      });
      expect(single.success).toBe(true);

      const markAll = UpdateNotificationSchema.safeParse({
        markAllAsRead: true,
      });
      expect(markAll.success).toBe(true);

      // Rejects when neither notificationId nor markAllAsRead is provided
      const invalid = UpdateNotificationSchema.safeParse({});
      expect(invalid.success).toBe(false);
    });
  });

  describe("Sanitization & Security", () => {
    it("sanitizes notification links to prevent open redirects and SSRF", () => {
      // Relative internal routes allowed
      expect(NotificationService.sanitizeInternalLink("/intern/tasks/123")).toBe("/intern/tasks/123");
      expect(NotificationService.sanitizeInternalLink("/admin/review-queue")).toBe("/admin/review-queue");

      // Dangerous external URLs rejected
      expect(NotificationService.sanitizeInternalLink("https://evil.com/phish")).toBeUndefined();
      expect(NotificationService.sanitizeInternalLink("http://malicious.org")).toBeUndefined();
      expect(NotificationService.sanitizeInternalLink("//protocol-relative.com")).toBeUndefined();
      expect(NotificationService.sanitizeInternalLink("javascript:alert(1)")).toBeUndefined();
      expect(NotificationService.sanitizeInternalLink("\\\\windows-share\\path")).toBeUndefined();
      expect(NotificationService.sanitizeInternalLink(undefined)).toBeUndefined();
    });
  });

  describe("NotificationService Event Triggers & Recipient Isolation", () => {
    it("notifies the assigned intern upon task creation and respects idempotency", async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439099"),
        title: "Build Phase 2 UI",
        priority: "high",
        status: "assigned",
        assignedInternId: new mongoose.Types.ObjectId(internActor.id),
        dueDate: new Date(Date.now() + 86400000),
      };

      const createSpy = vi.spyOn(Notification, "create").mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        recipientId: mockTask.assignedInternId,
        title: "New Task Assigned",
        message: 'You have been assigned to "Build Phase 2 UI". Priority: HIGH.',
        link: `/intern/tasks/${mockTask._id}`,
        isRead: false,
      } as any);

      vi.spyOn(Notification, "findOne").mockResolvedValueOnce(null);

      await NotificationService.notifyTaskAssigned(mockTask as any, adminActor);

      expect(createSpy).toHaveBeenCalledTimes(1);
      const args = createSpy.mock.calls[0][0] as any;
      expect(args.recipientId.toString()).toBe(internActor.id);
      expect(args.type).toBe("task_assigned");
      expect(args.link).toBe(`/intern/tasks/${mockTask._id}`);
      expect(args.idempotencyKey).toBe(`task_assigned:${mockTask._id}:${internActor.id}`);
    });

    it("skips duplicate task assignment notifications when idempotency key exists", async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439099"),
        title: "Build Phase 2 UI",
        priority: "high",
        status: "assigned",
        assignedInternId: new mongoose.Types.ObjectId(internActor.id),
        dueDate: new Date(),
      };

      vi.spyOn(Notification, "findOne").mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        idempotencyKey: `task_assigned:${mockTask._id}:${internActor.id}`,
      } as any);

      const createSpy = vi.spyOn(Notification, "create");

      await NotificationService.notifyTaskAssigned(mockTask as any, adminActor);

      expect(createSpy).not.toHaveBeenCalled();
    });

    it("notifies all active administrators upon intern task submission", async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439099"),
        title: "API Design Document",
        status: "submitted",
        assignedInternId: new mongoose.Types.ObjectId(internActor.id),
        assignedInternSnapshot: { name: internActor.name },
      };

      const mockSubmission = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439088"),
        version: 1,
      };

      const admin1Id = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
      const admin2Id = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");

      vi.spyOn(User, "find").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: admin1Id, role: "admin", status: "active" },
            { _id: admin2Id, role: "admin", status: "active" },
          ]),
        }),
      } as any);

      vi.spyOn(Notification, "findOne").mockResolvedValue(null as any);
      const createSpy = vi.spyOn(Notification, "create" as any).mockResolvedValue({} as any);

      await NotificationService.notifyTaskSubmitted(mockTask as any, mockSubmission as any, internActor);

      expect(createSpy).toHaveBeenCalledTimes(2);
      const calls = (createSpy as any).mock.calls;
      const recipients = calls.map((c: any) => c[0].recipientId.toString());
      expect(recipients).toContain(admin1Id.toString());
      expect(recipients).toContain(admin2Id.toString());
      expect(calls[0][0].link).toBe("/admin/review-queue");
    });

    it("notifies assigned intern when admin approves submission", async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439099"),
        title: "Docker Setup",
        assignedInternId: new mongoose.Types.ObjectId(internActor.id),
      };

      const mockSubmission = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439088"),
        version: 2,
      };

      vi.spyOn(Notification, "findOne").mockResolvedValue(null);
      const createSpy = vi.spyOn(Notification, "create").mockResolvedValue({} as any);

      await NotificationService.notifySubmissionReviewed(
        mockTask as any,
        mockSubmission as any,
        "approve",
        "Great work! Production ready.",
        adminActor
      );

      expect(createSpy).toHaveBeenCalledTimes(1);
      const args = createSpy.mock.calls[0][0] as any;
      expect(args.recipientId.toString()).toBe(internActor.id);
      expect(args.type).toBe("submission_approved");
      expect(args.title).toBe("Submission Approved");
      expect(args.message).toContain("approved");
    });

    it("notifies assigned intern when admin requests changes with reviewer remarks", async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439099"),
        title: "Docker Setup",
        assignedInternId: new mongoose.Types.ObjectId(internActor.id),
      };

      const mockSubmission = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439088"),
        version: 1,
      };

      vi.spyOn(Notification, "findOne").mockResolvedValue(null);
      const createSpy = vi.spyOn(Notification, "create").mockResolvedValue({} as any);

      await NotificationService.notifySubmissionReviewed(
        mockTask as any,
        mockSubmission as any,
        "request_changes",
        "Please fix the lint errors and re-test.",
        adminActor
      );

      expect(createSpy).toHaveBeenCalledTimes(1);
      const args = createSpy.mock.calls[0][0] as any;
      expect(args.recipientId.toString()).toBe(internActor.id);
      expect(args.type).toBe("submission_changes_requested");
      expect(args.title).toBe("Changes Requested");
      expect(args.message).toContain("Please fix the lint errors");
    });
  });

  describe("Mark as Read & User Isolation", () => {
    it("scopes markAsRead strictly to the recipient user ID (preventing IDOR)", async () => {
      const targetNotifId = new mongoose.Types.ObjectId().toString();

      const updateOneSpy = vi.spyOn(Notification, "updateOne").mockResolvedValueOnce({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      } as any);

      const res = await NotificationService.markAsRead(internActor.id, {
        notificationId: targetNotifId,
        isRead: true,
      });

      expect(res.updatedCount).toBe(1);
      expect(updateOneSpy).toHaveBeenCalledWith(
        {
          _id: new mongoose.Types.ObjectId(targetNotifId),
          recipientId: new mongoose.Types.ObjectId(internActor.id),
        },
        expect.objectContaining({ $set: expect.objectContaining({ isRead: true }) })
      );
    });

    it("supports markAllAsRead scoped to the recipient user ID", async () => {
      const updateManySpy = vi.spyOn(Notification, "updateMany").mockResolvedValueOnce({
        acknowledged: true,
        matchedCount: 5,
        modifiedCount: 5,
        upsertedCount: 0,
        upsertedId: null,
      } as any);

      const res = await NotificationService.markAsRead(internActor.id, {
        markAllAsRead: true,
        isRead: true,
      });

      expect(res.updatedCount).toBe(5);
      expect(updateManySpy).toHaveBeenCalledWith(
        {
          recipientId: new mongoose.Types.ObjectId(internActor.id),
          isRead: false,
        },
        expect.objectContaining({ $set: expect.objectContaining({ isRead: true }) })
      );
    });
  });

  describe("Deadline & Overdue Reminders State Machine & Idempotency", () => {
    it("identifies overdue tasks and creates deadline_overdue notification", async () => {
      const pastDueDate = new Date(Date.now() - 3600000 * 24); // 1 day ago
      const overdueTask = {
        _id: new mongoose.Types.ObjectId(),
        title: "Overdue Feature Implementation",
        priority: "urgent",
        status: "in_progress",
        assignedInternId: new mongoose.Types.ObjectId(internActor.id),
        dueDate: pastDueDate,
        isArchived: false,
      };

      vi.spyOn(Task, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([overdueTask]),
      } as any);

      vi.spyOn(Notification, "findOne").mockResolvedValue(null);
      const createSpy = vi.spyOn(Notification, "create").mockResolvedValue({ _id: new mongoose.Types.ObjectId() } as any);

      const summary = await DeadlineReminderService.processDeadlineReminders(24);

      expect(summary.scannedCount).toBe(1);
      expect(summary.overdueCount).toBe(1);
      expect(summary.approachingCount).toBe(0);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "deadline_overdue",
          recipientId: overdueTask.assignedInternId,
          title: "Task Overdue Reminder",
        })
      );
    });

    it("identifies approaching deadlines (within hoursAhead) and triggers deadline_approaching", async () => {
      const upcomingDueDate = new Date(Date.now() + 3600000 * 12); // in 12 hours
      const approachingTask = {
        _id: new mongoose.Types.ObjectId(),
        title: "Upcoming Project Milestone",
        priority: "high",
        status: "assigned",
        assignedInternId: new mongoose.Types.ObjectId(internActor.id),
        dueDate: upcomingDueDate,
        isArchived: false,
      };

      vi.spyOn(Task, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([approachingTask]),
      } as any);

      vi.spyOn(Notification, "findOne").mockResolvedValue(null);
      const createSpy = vi.spyOn(Notification, "create").mockResolvedValue({ _id: new mongoose.Types.ObjectId() } as any);

      const summary = await DeadlineReminderService.processDeadlineReminders(24);

      expect(summary.scannedCount).toBe(1);
      expect(summary.overdueCount).toBe(0);
      expect(summary.approachingCount).toBe(1);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "deadline_approaching",
          recipientId: approachingTask.assignedInternId,
          title: "Upcoming Task Deadline",
        })
      );
    });

    it("does not create duplicate reminder notifications for the same task on the same day", async () => {
      const upcomingDueDate = new Date(Date.now() + 3600000 * 8);
      const task = {
        _id: new mongoose.Types.ObjectId(),
        title: "Milestone Delivery",
        priority: "medium",
        status: "in_progress",
        assignedInternId: new mongoose.Types.ObjectId(internActor.id),
        dueDate: upcomingDueDate,
        isArchived: false,
      };

      vi.spyOn(Task, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([task]),
      } as any);

      // Simulate notification already created on this day
      vi.spyOn(Notification, "findOne").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
      } as any);

      const createSpy = vi.spyOn(Notification, "create");

      const summary = await DeadlineReminderService.processDeadlineReminders(24);

      expect(summary.scannedCount).toBe(1);
      expect(summary.approachingCount).toBe(0);
      expect(summary.details[0].status).toBe("already_notified");
      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});
