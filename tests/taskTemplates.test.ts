import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database to run fast and isolated in-memory unit tests
vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/models/TaskTemplate", () => {
  const mockTemplateModel = {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  };
  return {
    TaskTemplate: mockTemplateModel,
  };
});

vi.mock("@/models/AuditLog", () => {
  return {
    AuditLog: {
      create: vi.fn().mockResolvedValue(true),
    },
  };
});

import mongoose from "mongoose";
import { TaskTemplateService } from "@/services/taskTemplateService";
import { TaskTemplate } from "@/models/TaskTemplate";
import { AuditLog } from "@/models/AuditLog";
import {
  CreateTaskTemplateSchema,
  UpdateTaskTemplateSchema,
  TaskTemplateQuerySchema,
} from "@/validators";
import { SessionUser } from "@/types";

describe("Phase 3: Task Templates Unit & Security Tests", () => {
  const adminActor: SessionUser = {
    id: "507f1f77bcf86cd799439011",
    email: "admin@vyorai.com",
    name: "System Admin",
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
    it("accepts valid template creation payload", () => {
      const valid = CreateTaskTemplateSchema.safeParse({
        title: "Weekly Code Review Sprint",
        description: "Submit GitHub pull requests and review peer branches according to checklist.",
        priority: "high",
        defaultDueDaysOffset: 7,
        tags: ["Sprint", "CodeReview"],
        isActive: true,
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.title).toBe("Weekly Code Review Sprint");
        expect(valid.data.priority).toBe("high");
        expect(valid.data.defaultDueDaysOffset).toBe(7);
        expect(valid.data.tags).toEqual(["Sprint", "CodeReview"]);
      }
    });

    it("rejects short or empty titles and descriptions", () => {
      const invalid = CreateTaskTemplateSchema.safeParse({
        title: "No", // min 3
        description: "Short", // min 10
      });

      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        const errors = invalid.error.format();
        expect(errors.title?._errors).toBeDefined();
        expect(errors.description?._errors).toBeDefined();
      }
    });

    it("rejects negative or excessive due date offsets", () => {
      const negativeOffset = CreateTaskTemplateSchema.safeParse({
        title: "Valid Title Here",
        description: "Valid description guidelines long enough",
        defaultDueDaysOffset: -2,
      });
      expect(negativeOffset.success).toBe(false);

      const excessiveOffset = CreateTaskTemplateSchema.safeParse({
        title: "Valid Title Here",
        description: "Valid description guidelines long enough",
        defaultDueDaysOffset: 999,
      });
      expect(excessiveOffset.success).toBe(false);
    });

    it("allows optional and partial updates", () => {
      const partialUpdate = UpdateTaskTemplateSchema.safeParse({
        priority: "urgent",
        defaultDueDaysOffset: 3,
      });
      expect(partialUpdate.success).toBe(true);
      if (partialUpdate.success) {
        expect(partialUpdate.data.priority).toBe("urgent");
        expect(partialUpdate.data.defaultDueDaysOffset).toBe(3);
      }
    });

    it("validates TaskTemplateQuerySchema parameters", () => {
      const valid = TaskTemplateQuerySchema.safeParse({
        search: "Sprint",
        priority: "high",
        includeInactive: "true",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("Authorization & Security (Role Enforcement)", () => {
    it("rejects intern access when calling TaskTemplateService.getTemplates", async () => {
      await expect(
        TaskTemplateService.getTemplates({}, internActor)
      ).rejects.toThrow("Unauthorized: Only administrators can view task templates");
    });

    it("rejects intern access when calling TaskTemplateService.createTemplate", async () => {
      await expect(
        TaskTemplateService.createTemplate(
          { title: "Test Template", description: "Long enough description" },
          internActor
        )
      ).rejects.toThrow("Unauthorized: Only administrators can create task templates");
    });

    it("rejects intern access when calling TaskTemplateService.updateTemplate", async () => {
      await expect(
        TaskTemplateService.updateTemplate("507f1f77bcf86cd799439033", { title: "New Title" }, internActor)
      ).rejects.toThrow("Unauthorized: Only administrators can modify task templates");
    });

    it("rejects intern access when calling TaskTemplateService.deleteOrDeactivate", async () => {
      await expect(
        TaskTemplateService.deleteOrDeactivate("507f1f77bcf86cd799439033", internActor)
      ).rejects.toThrow("Unauthorized: Only administrators can remove task templates");
    });
  });

  describe("Template CRUD Operations & Audit Logging", () => {
    it("creates a template and records an audit log entry", async () => {
      const mockCreated = {
        _id: new mongoose.Types.ObjectId(),
        title: "Setup Cloud Infrastructure",
        description: "Configure staging S3 buckets and IAM credentials.",
        priority: "high",
        defaultDueDaysOffset: 5,
        tags: ["DevOps"],
        isActive: true,
        usageCount: 0,
        createdByAdminId: new mongoose.Types.ObjectId(adminActor.id),
      };

      (TaskTemplate.create as any).mockResolvedValue(mockCreated);

      const result = await TaskTemplateService.createTemplate(
        {
          title: "Setup Cloud Infrastructure",
          description: "Configure staging S3 buckets and IAM credentials.",
          priority: "high",
          defaultDueDaysOffset: 5,
          tags: ["DevOps"],
        },
        adminActor
      );

      expect(result.title).toBe("Setup Cloud Infrastructure");
      expect(TaskTemplate.create).toHaveBeenCalledTimes(1);
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "template_created",
          targetModel: "TaskTemplate",
          actorId: expect.any(Object),
          actorName: adminActor.name,
        })
      );
    });

    it("updates an existing template and logs field changes", async () => {
      const templateId = "507f1f77bcf86cd799439033";
      const existingDoc = {
        _id: new mongoose.Types.ObjectId(templateId),
        title: "Old Title",
        description: "Old description for testing purposes",
        priority: "medium",
        defaultDueDaysOffset: null,
        tags: [],
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      (TaskTemplate.findById as any).mockResolvedValue(existingDoc);

      const updated = await TaskTemplateService.updateTemplate(
        templateId,
        {
          title: "Updated Modern Title",
          priority: "urgent",
        },
        adminActor
      );

      expect(updated.title).toBe("Updated Modern Title");
      expect(existingDoc.title).toBe("Updated Modern Title");
      expect(existingDoc.priority).toBe("urgent");
      expect(existingDoc.save).toHaveBeenCalledTimes(1);
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "template_updated",
          targetModel: "TaskTemplate",
          changes: expect.objectContaining({
            title: { from: "Old Title", to: "Updated Modern Title" },
            priority: { from: "medium", to: "urgent" },
          }),
        })
      );
    });

    it("deactivates instead of deleting when usageCount > 0 to protect history", async () => {
      const templateId = "507f1f77bcf86cd799439044";
      const usedDoc = {
        _id: new mongoose.Types.ObjectId(templateId),
        title: "Popular Onboarding Task",
        usageCount: 12,
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      (TaskTemplate.findById as any).mockResolvedValue(usedDoc);

      const result = await TaskTemplateService.deleteOrDeactivate(templateId, adminActor);

      expect(result.action).toBe("deactivated");
      expect(usedDoc.isActive).toBe(false);
      expect(usedDoc.save).toHaveBeenCalledTimes(1);
      expect(TaskTemplate.findByIdAndDelete).not.toHaveBeenCalled();
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "template_deactivated",
          targetModel: "TaskTemplate",
          metadata: expect.objectContaining({
            usageCount: 12,
          }),
        })
      );
    });

    it("safely hard deletes when template has never been used (usageCount === 0)", async () => {
      const templateId = "507f1f77bcf86cd799439055";
      const unusedDoc = {
        _id: new mongoose.Types.ObjectId(templateId),
        title: "Draft Experimental Template",
        usageCount: 0,
        isActive: true,
      };

      (TaskTemplate.findById as any).mockResolvedValue(unusedDoc);
      (TaskTemplate.findByIdAndDelete as any).mockResolvedValue(unusedDoc);

      const result = await TaskTemplateService.deleteOrDeactivate(templateId, adminActor);

      expect(result.action).toBe("deleted");
      expect(TaskTemplate.findByIdAndDelete).toHaveBeenCalledWith(templateId);
      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "template_deleted",
          targetModel: "TaskTemplate",
        })
      );
    });

    it("increments usage count via recordUsage", async () => {
      const templateId = "507f1f77bcf86cd799439066";
      (TaskTemplate.findByIdAndUpdate as any).mockResolvedValue(true);

      await TaskTemplateService.recordUsage(templateId);

      expect(TaskTemplate.findByIdAndUpdate).toHaveBeenCalledWith(
        templateId,
        { $inc: { usageCount: 1 } }
      );
    });
  });
});
