/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  UnassignTaskSchema,
  TransferTaskSchema,
  CreateProjectSchema,
  ManageProjectMemberSchema,
} from "@/validators";
import { TaskService } from "@/services/taskService";
import { ProjectService } from "@/services/projectService";
import { Task } from "@/models/Task";
import { TaskEvent } from "@/models/TaskEvent";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { AuditLog } from "@/models/AuditLog";
import { SessionUser } from "@/types";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

const mockAdminUser: SessionUser = {
  id: "650f1234567890abcdef0001",
  email: "admin@company.com",
  name: "System Admin",
  role: "admin",
  status: "active",
};

const mockIntern1User: SessionUser = {
  id: "650f1234567890abcdef0002",
  email: "intern1@company.com",
  name: "Intern One",
  role: "intern",
  status: "active",
  internId: "AV-001",
};

const mockIntern2User: SessionUser = {
  id: "650f1234567890abcdef0003",
  email: "intern2@company.com",
  name: "Intern Two",
  role: "intern",
  status: "active",
  internId: "AV-002",
};

describe("IWMS Enhancement Features Unit Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Validation Schemas", () => {
    it("validates UnassignTaskSchema with optional reason", () => {
      expect(UnassignTaskSchema.safeParse({}).success).toBe(true);
      expect(
        UnassignTaskSchema.safeParse({ reason: "Intern transferred to urgent project" }).success
      ).toBe(true);
    });

    it("validates TransferTaskSchema requires newInternId and non-empty reason", () => {
      const valid = TransferTaskSchema.safeParse({
        newInternId: "650f1234567890abcdef0003",
        reason: "Handover due to shift change",
      });
      expect(valid.success).toBe(true);

      const missingReason = TransferTaskSchema.safeParse({
        newInternId: "650f1234567890abcdef0003",
        reason: "",
      });
      expect(missingReason.success).toBe(false);

      const missingIntern = TransferTaskSchema.safeParse({
        reason: "Valid reason without intern",
      });
      expect(missingIntern.success).toBe(false);
    });

    it("validates CreateProjectSchema requires at least 2 team members", () => {
      const valid = CreateProjectSchema.safeParse({
        title: "Enterprise Mobile App",
        description: "Collaborative project for intern cohort",
        teamMemberIds: ["650f1234567890abcdef0002", "650f1234567890abcdef0003"],
        startDate: "2026-06-01",
        dueDate: "2026-08-01",
      });
      expect(valid.success).toBe(true);

      const singleMember = CreateProjectSchema.safeParse({
        title: "Enterprise Mobile App",
        description: "Collaborative project for intern cohort",
        teamMemberIds: ["650f1234567890abcdef0002"],
        startDate: "2026-06-01",
        dueDate: "2026-08-01",
      });
      expect(singleMember.success).toBe(false);
    });

    it("validates ManageProjectMemberSchema for add and remove actions", () => {
      expect(
        ManageProjectMemberSchema.safeParse({
          action: "add",
          internId: "650f1234567890abcdef0003",
          reason: "Added as lead frontend intern",
        }).success
      ).toBe(true);

      expect(
        ManageProjectMemberSchema.safeParse({
          action: "remove",
          internId: "650f1234567890abcdef0002",
        }).success
      ).toBe(true);
    });
  });

  describe("Feature 1: Unassign Task Logic", () => {
    it("rejects non-admin attempt to unassign task", async () => {
      await expect(
        TaskService.unassignTask("task123", { reason: "test" }, mockIntern1User)
      ).rejects.toThrow("Only administrators can unassign tasks");
    });

    it("marks task as unassigned and records TaskEvent and AuditLog", async () => {
      const mockTask = {
        _id: new mongoose.Types.ObjectId("650f1234567890abcdef0100"),
        title: "Build Dashboard",
        status: "in_progress",
        assignedInternId: new mongoose.Types.ObjectId(mockIntern1User.id),
        assignedInternSnapshot: {
          name: mockIntern1User.name,
          email: mockIntern1User.email,
          internId: "AV-001",
        },
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Task, "findById").mockResolvedValue(mockTask as any);
      vi.spyOn(TaskEvent, "create").mockResolvedValue({} as any);
      vi.spyOn(AuditLog, "create").mockResolvedValue({} as any);

      const result = await TaskService.unassignTask(
        mockTask._id.toString(),
        { reason: "Workload rebalance" },
        mockAdminUser
      );

      expect(result.status).toBe("unassigned");
      expect(result.unassignedReason).toBe("Workload rebalance");
      expect(mockTask.save).toHaveBeenCalled();
      expect(TaskEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "unassigned",
          actorRole: "admin",
        })
      );
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "task_unassigned",
          targetModel: "Task",
        })
      );
    });
  });

  describe("Feature 2: Transfer Task Logic", () => {
    it("rejects non-admin attempt to transfer task", async () => {
      await expect(
        TaskService.transferTask(
          "task123",
          { newInternId: mockIntern2User.id, reason: "Transfer reason" },
          mockIntern1User
        )
      ).rejects.toThrow("Only administrators can transfer task assignments");
    });

    it("transfers assignment to new intern, creates fresh Task, and isolates prior submissions", async () => {
      const previousTaskId = new mongoose.Types.ObjectId("650f1234567890abcdef0100");
      const mockPreviousTask = {
        _id: previousTaskId,
        title: "API Microservice",
        description: "Build microservice architecture",
        priority: "high",
        status: "in_progress",
        assignedInternId: new mongoose.Types.ObjectId(mockIntern1User.id),
        assignedInternSnapshot: {
          name: mockIntern1User.name,
          email: mockIntern1User.email,
          internId: "AV-001",
        },
        dueDate: new Date("2026-07-01"),
        save: vi.fn().mockResolvedValue(true),
      };

      const mockNewIntern = {
        _id: new mongoose.Types.ObjectId(mockIntern2User.id),
        name: mockIntern2User.name,
        email: mockIntern2User.email,
        internId: "AV-002",
        role: "intern",
        status: "active",
      };

      const newTaskId = new mongoose.Types.ObjectId("650f1234567890abcdef0200");
      const mockNewTask = {
        _id: newTaskId,
        title: mockPreviousTask.title,
        description: mockPreviousTask.description,
        priority: mockPreviousTask.priority,
        status: "assigned",
        assignedInternId: mockNewIntern._id,
        assignedInternSnapshot: {
          name: mockNewIntern.name,
          email: mockNewIntern.email,
          internId: mockNewIntern.internId,
        },
        dueDate: mockPreviousTask.dueDate,
      };

      vi.spyOn(mongoose, "startSession").mockRejectedValue(new Error("No replica set in unit test"));
      vi.spyOn(Task, "findById").mockResolvedValue(mockPreviousTask as any);
      vi.spyOn(User, "findOne").mockResolvedValue(mockNewIntern as any);
      vi.spyOn(Task, "create").mockResolvedValue([mockNewTask] as any);
      vi.spyOn(TaskEvent, "create").mockResolvedValue({} as any);
      vi.spyOn(AuditLog, "create").mockResolvedValue({} as any);

      const result = await TaskService.transferTask(
        previousTaskId.toString(),
        { newInternId: mockIntern2User.id, reason: "Reassigned for sprint coverage" },
        mockAdminUser
      );

      expect(result.previousTask.status).toBe("transferred");
      expect(result.previousTask.transferredReason).toBe("Reassigned for sprint coverage");
      expect(result.newTask.assignedInternSnapshot?.name).toBe("Intern Two");
      expect(result.newTask.status).toBe("assigned");
      expect(mockPreviousTask.save).toHaveBeenCalled();
    });
  });

  describe("Feature 3: Collaborative Project Logic", () => {
    it("enforces intern role access control on project retrieval", async () => {
      const projectId = new mongoose.Types.ObjectId("650f1234567890abcdef0300");
      const mockProject = {
        _id: projectId,
        title: "Cloud Infrastructure",
        teamMembers: [
          { internId: { _id: new mongoose.Types.ObjectId(mockIntern1User.id) } },
        ],
        removedMembers: [],
      };

      vi.spyOn(Project, "findById").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue(mockProject),
          }),
        }),
      } as any);

      // Intern 2 is not a team member and should be denied access
      await expect(
        ProjectService.getProjectById(projectId.toString(), mockIntern2User)
      ).rejects.toThrow("Access denied: You are not authorized to view this project");
    });

    it("allows team member to access project details and computes independent task statuses", async () => {
      const projectId = new mongoose.Types.ObjectId("650f1234567890abcdef0300");
      const mockProject = {
        _id: projectId,
        title: "Cloud Infrastructure",
        status: "in_progress",
        teamMembers: [
          { internId: { _id: new mongoose.Types.ObjectId(mockIntern1User.id) } },
          { internId: { _id: new mongoose.Types.ObjectId(mockIntern2User.id) } },
        ],
        removedMembers: [],
      };

      const mockTasks = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: "Setup CI/CD",
          status: "approved",
          projectId,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: "Terraform IaC",
          status: "in_progress",
          projectId,
        },
      ];

      vi.spyOn(Project, "findById").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue(mockProject),
          }),
        }),
      } as any);

      vi.spyOn(Task, "find").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockResolvedValue(mockTasks),
        }),
      } as any);

      const result = await ProjectService.getProjectById(
        projectId.toString(),
        mockIntern1User
      );

      expect(result.project.title).toBe("Cloud Infrastructure");
      expect(result.tasks.length).toBe(2);
      expect(result.progress.totalTasks).toBe(2);
      expect(result.progress.approved).toBe(1);
      expect(result.progress.inProgress).toBe(1);
      expect(result.progress.completionPercentage).toBe(50);
    });

    it("retains removed member history when removing team member", async () => {
      const projectId = new mongoose.Types.ObjectId("650f1234567890abcdef0300");
      const mockProject = {
        _id: projectId,
        title: "Cloud Infrastructure",
        teamMembers: [
          { internId: new mongoose.Types.ObjectId(mockIntern1User.id) },
          { internId: new mongoose.Types.ObjectId(mockIntern2User.id) },
        ],
        removedMembers: [] as any[],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Project, "findById").mockResolvedValue(mockProject as any);
      vi.spyOn(User, "findOne").mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockIntern1User.id),
        name: mockIntern1User.name,
      } as any);
      vi.spyOn(AuditLog, "create").mockResolvedValue({} as any);

      await ProjectService.manageTeamMember(
        projectId.toString(),
        {
          action: "remove",
          internId: mockIntern1User.id,
          reason: "Intern moved to another team",
        },
        mockAdminUser
      );

      expect(mockProject.teamMembers.length).toBe(1);
      expect(mockProject.removedMembers.length).toBe(1);
      expect(mockProject.removedMembers[0].reason).toBe("Intern moved to another team");
      expect(mockProject.save).toHaveBeenCalled();
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "project_member_removed",
        })
      );
    });
  });
});
