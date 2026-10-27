import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { ProjectService } from "@/services/projectService";
import { NotificationService } from "@/services/notificationService";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { TaskEvent } from "@/models/TaskEvent";
import { realtimeBus } from "@/lib/realtime";
import { SessionUser } from "@/types";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/cache", () => ({
  getOrSetCache: vi.fn((key, ttl, fn) => fn()),
  invalidateProjectsCache: vi.fn().mockResolvedValue(true),
  invalidateKpiCache: vi.fn().mockResolvedValue(true),
  invalidateReviewQueueCache: vi.fn().mockResolvedValue(true),
  CACHE_KEYS: {
    projectsList: vi.fn(),
    allProjectListKeys: vi.fn(),
    projectDetail: vi.fn(),
    projectTags: vi.fn(),
  },
  CACHE_TTL: {
    PROJECTS_LIST: 60,
    PROJECT_DETAIL: 60,
  },
}));

vi.mock("@/models/Project", () => ({
  Project: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

vi.mock("@/models/Task", () => ({
  Task: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/models/User", () => ({
  User: {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("@/models/AuditLog", () => ({
  AuditLog: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/models/TaskEvent", () => ({
  TaskEvent: {
    create: vi.fn().mockResolvedValue({}),
    insertMany: vi.fn().mockResolvedValue([]),
  },
}));

describe("Phase 2 & 3: Team Project Notifications, Task Assignment & Real-Time Synchronization", () => {
  const adminActor: SessionUser = {
    id: "507f1f77bcf86cd799439011",
    email: "admin@vyorai.com",
    name: "System Administrator",
    role: "admin",
    status: "active",
  };

  const intern1Id = "507f1f77bcf86cd799439021";
  const intern2Id = "507f1f77bcf86cd799439022";
  const inactiveInternId = "507f1f77bcf86cd799439099";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Phase 2: Project Creation Notifications", () => {
    it("notifies all eligible intern members when an admin creates a team project", async () => {
      const mockProject = {
        _id: new mongoose.Types.ObjectId("650000000000000000000001"),
        title: "Autonomous Navigation v2",
        description: "Develop ROS2 navigation algorithms",
        status: "planning",
        startDate: new Date("2026-11-01"),
        dueDate: new Date("2026-12-01"),
        teamMembers: [
          { internId: new mongoose.Types.ObjectId(intern1Id) },
          { internId: new mongoose.Types.ObjectId(intern2Id) },
        ],
      };

      vi.mocked(User.find).mockImplementation((query: any) => {
        // First call in createProject validates interns existence
        if (query.role === "intern" && !query.status) {
          return Promise.resolve([
            { _id: new mongoose.Types.ObjectId(intern1Id), name: "Intern One" },
            { _id: new mongoose.Types.ObjectId(intern2Id), name: "Intern Two" },
          ] as any);
        }
        // Second call in notifyProjectAssigned checks active status
        if (query.role === "intern" && query.status === "active") {
          return {
            select: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([
                { _id: new mongoose.Types.ObjectId(intern1Id), name: "Intern One" },
                { _id: new mongoose.Types.ObjectId(intern2Id), name: "Intern Two" },
              ]),
            }),
          } as any;
        }
        return Promise.resolve([]) as any;
      });

      vi.mocked(Project.create).mockResolvedValueOnce(mockProject as any);

      const notifySpy = vi.spyOn(NotificationService, "createNotification").mockResolvedValue({
        notification: { _id: "notif-1" } as any,
        created: true,
      });

      const realtimeSpy = vi.spyOn(realtimeBus, "emit");

      await ProjectService.createProject(
        {
          title: "Autonomous Navigation v2",
          description: "Develop ROS2 navigation algorithms",
          teamMemberIds: [intern1Id, intern2Id],
          startDate: "2026-11-01",
          dueDate: "2026-12-01",
        },
        adminActor
      );

      // Verify NotificationService called for both interns
      expect(notifySpy).toHaveBeenCalledTimes(2);
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: intern1Id,
          type: "project_assigned",
          title: "Added to Team Project",
          link: `/intern/projects/${mockProject._id}`,
        })
      );
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: intern2Id,
          type: "project_assigned",
          title: "Added to Team Project",
          link: `/intern/projects/${mockProject._id}`,
        })
      );

      // Verify real-time broadcast
      expect(realtimeSpy).toHaveBeenCalledWith(
        "project_created",
        expect.objectContaining({
          projectId: mockProject._id.toString(),
          title: "Autonomous Navigation v2",
        }),
        { broadcast: true }
      );
    });

    it("does not notify inactive interns who are not eligible", async () => {
      vi.mocked(User.find).mockImplementation((query: any) => {
        if (query.role === "intern" && query.status === "active") {
          // Inactive intern is filtered out from active query
          return {
            select: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([
                { _id: new mongoose.Types.ObjectId(intern1Id), name: "Intern One" },
              ]),
            }),
          } as any;
        }
        return Promise.resolve([]) as any;
      });

      const notifySpy = vi.spyOn(NotificationService, "createNotification").mockResolvedValue({
        notification: { _id: "notif-1" } as any,
        created: true,
      });

      await NotificationService.notifyProjectAssigned(
        { _id: "proj-1", title: "Project Alpha" },
        [intern1Id, inactiveInternId],
        adminActor
      );

      // Only active intern1 should be notified
      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: intern1Id,
        })
      );
    });

    it("does not notify the creator admin if the admin is listed in member IDs", async () => {
      vi.mocked(User.find).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: new mongoose.Types.ObjectId(intern1Id), name: "Intern One" },
            { _id: new mongoose.Types.ObjectId(adminActor.id), name: "Admin" },
          ]),
        }),
      } as any);

      const notifySpy = vi.spyOn(NotificationService, "createNotification").mockResolvedValue({
        notification: { _id: "notif-1" } as any,
        created: true,
      });

      await NotificationService.notifyProjectAssigned(
        { _id: "proj-1", title: "Project Beta" },
        [intern1Id, adminActor.id],
        adminActor
      );

      // Admin is excluded
      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: intern1Id,
        })
      );
    });
  });

  describe("Phase 3: Project Task Assignment Notifications", () => {
    it("notifies newly assigned intern when admin creates a task inside a team project", async () => {
      const mockProject = {
        _id: new mongoose.Types.ObjectId("650000000000000000000001"),
        title: "Autonomous Navigation v2",
        teamMembers: [{ internId: new mongoose.Types.ObjectId(intern1Id) }],
      };

      vi.mocked(Project.findById).mockResolvedValueOnce(mockProject as any);
      vi.mocked(User.findOne).mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(intern1Id),
        name: "Intern One",
        email: "intern1@vyorai.com",
        internId: "VYOR-01",
      } as any);

      const mockTask = {
        _id: new mongoose.Types.ObjectId("650000000000000000000099"),
        title: "Calibrate LiDAR sensors",
        priority: "high",
        status: "assigned",
        assignedInternId: new mongoose.Types.ObjectId(intern1Id),
        projectId: mockProject._id,
        dueDate: new Date("2026-11-20"),
      };

      vi.mocked(Task.create).mockResolvedValueOnce(mockTask as any);

      const notifySpy = vi.spyOn(NotificationService, "createNotification").mockResolvedValue({
        notification: { _id: "notif-task" } as any,
        created: true,
      });

      const realtimeSpy = vi.spyOn(realtimeBus, "emit");

      await ProjectService.createProjectTask(
        mockProject._id.toString(),
        {
          title: "Calibrate LiDAR sensors",
          description: "Run ROS2 calibration node",
          priority: "high",
          assignedInternId: intern1Id,
          assignmentDate: "2026-11-05",
          dueDate: "2026-11-20",
        },
        adminActor
      );

      // Verify notification sent with team project context and destination link
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: intern1Id,
          type: "task_assigned",
          title: "New Team Project Task Assigned",
          link: `/intern/tasks/${mockTask._id}`,
          message: expect.stringContaining("Autonomous Navigation v2"),
        })
      );

      // Verify real-time broadcast of task creation
      expect(realtimeSpy).toHaveBeenCalledWith(
        "task_created",
        expect.objectContaining({
          taskId: mockTask._id.toString(),
          projectId: mockProject._id.toString(),
        }),
        { broadcast: true }
      );
    });

    it("generates deterministic idempotency keys preventing duplicate assignment notifications", async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId("650000000000000000000099"),
        title: "Test Task",
        priority: "medium",
        assignedInternId: new mongoose.Types.ObjectId(intern1Id),
        projectId: new mongoose.Types.ObjectId("650000000000000000000001"),
        dueDate: new Date("2026-11-20"),
      } as any;

      const createSpy = vi.spyOn(NotificationService, "createNotification").mockResolvedValue({
        notification: { _id: "notif-dup" } as any,
        created: true,
      });

      await NotificationService.notifyProjectTaskAssigned(mockTask, "Project Alpha", adminActor);
      await NotificationService.notifyProjectTaskAssigned(mockTask, "Project Alpha", adminActor);

      // Both invocations must pass identical stable idempotencyKey
      expect(createSpy).toHaveBeenCalledTimes(2);
      const expectedKey = `project_task_assigned:${mockTask._id}:${intern1Id}`;
      expect(createSpy.mock.calls[0][0].idempotencyKey).toBe(expectedKey);
      expect(createSpy.mock.calls[1][0].idempotencyKey).toBe(expectedKey);
    });
  });

  describe("Phase 5: Realtime Synchronization & Bus Behavior", () => {
    it("subscribes authenticated user and delivers scoped events without leaking data to other interns", () => {
      const intern1Events: any[] = [];
      const intern2Events: any[] = [];
      const adminEvents: any[] = [];

      const unsub1 = realtimeBus.subscribe({
        id: "sub-1",
        userId: intern1Id,
        role: "intern",
        send: (e) => intern1Events.push(e),
      });

      const unsub2 = realtimeBus.subscribe({
        id: "sub-2",
        userId: intern2Id,
        role: "intern",
        send: (e) => intern2Events.push(e),
      });

      const unsubAdmin = realtimeBus.subscribe({
        id: "sub-admin",
        userId: adminActor.id,
        role: "admin",
        send: (e) => adminEvents.push(e),
      });

      // 1. Emit notification targeted specifically to intern1
      realtimeBus.emit(
        "notification_created",
        { notification: { title: "Private to Intern 1" } },
        { targetUserIds: [intern1Id] }
      );

      expect(intern1Events.length).toBe(1);
      expect(intern2Events.length).toBe(0);
      expect(adminEvents.length).toBe(0);

      // 2. Emit broadcast event (e.g. project_created)
      realtimeBus.emit(
        "project_created",
        { projectId: "p-1", title: "New Project" },
        { broadcast: true }
      );

      expect(intern1Events.length).toBe(2);
      expect(intern2Events.length).toBe(1);
      expect(adminEvents.length).toBe(1);

      // 3. Emit role-targeted event (e.g. task_submitted for admins)
      realtimeBus.emit(
        "task_updated",
        { status: "submitted", internName: "Alex" },
        { targetRole: "admin" }
      );

      expect(intern1Events.length).toBe(2);
      expect(intern2Events.length).toBe(1);
      expect(adminEvents.length).toBe(2);

      // Cleanup
      unsub1();
      unsub2();
      unsubAdmin();

      // Emit after unsubscribe
      realtimeBus.emit("project_created", { projectId: "p-2" }, { broadcast: true });
      expect(intern1Events.length).toBe(2);
    });
  });
});
