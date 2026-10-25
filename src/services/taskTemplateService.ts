import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { TaskTemplate, ITaskTemplateDocument } from "@/models/TaskTemplate";
import { AuditLog } from "@/models/AuditLog";
import { SessionUser, TaskPriority } from "@/types";

export interface CreateTaskTemplateInput {
  title: string;
  description: string;
  priority?: TaskPriority;
  defaultDueDaysOffset?: number | null;
  tags?: string[];
  isActive?: boolean;
}

export interface UpdateTaskTemplateInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  defaultDueDaysOffset?: number | null;
  tags?: string[];
  isActive?: boolean;
}

export interface TaskTemplateFilter {
  search?: string;
  priority?: string;
  includeInactive?: boolean;
}

export class TaskTemplateService {
  /**
   * List task templates with search and filtering
   */
  static async getTemplates(
    filter: TaskTemplateFilter = {},
    actor: SessionUser
  ): Promise<ITaskTemplateDocument[]> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can view task templates");
    }

    await connectDB();

    const query: Record<string, unknown> = {};

    if (!filter.includeInactive) {
      query.isActive = true;
    }

    if (filter.priority && filter.priority !== "all") {
      query.priority = filter.priority;
    }

    if (filter.search && filter.search.trim().length > 0) {
      const searchRegex = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } },
      ];
    }

    return TaskTemplate.find(query).sort({ isActive: -1, createdAt: -1 }).lean();
  }

  /**
   * Fetch single template by ID
   */
  static async getTemplateById(
    templateId: string,
    actor: SessionUser
  ): Promise<ITaskTemplateDocument> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can view task templates");
    }

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw new Error("Invalid template ID format");
    }

    await connectDB();

    const template = await TaskTemplate.findById(templateId);
    if (!template) {
      throw new Error("Task template not found");
    }

    return template;
  }

  /**
   * Create a new task template
   */
  static async createTemplate(
    data: CreateTaskTemplateInput,
    actor: SessionUser
  ): Promise<ITaskTemplateDocument> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can create task templates");
    }

    await connectDB();

    const template = (await TaskTemplate.create({
      title: data.title.trim(),
      description: data.description.trim(),
      priority: data.priority || "medium",
      defaultDueDaysOffset:
        typeof data.defaultDueDaysOffset === "number" ? data.defaultDueDaysOffset : null,
      tags: data.tags || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
      usageCount: 0,
      createdByAdminId: new mongoose.Types.ObjectId(actor.id),
    })) as unknown as ITaskTemplateDocument;

    await AuditLog.create({
      action: "template_created",
      targetModel: "TaskTemplate",
      targetId: template._id as mongoose.Types.ObjectId,
      actorId: new mongoose.Types.ObjectId(actor.id),
      actorName: actor.name,
      actorRole: actor.role,
      metadata: {
        title: template.title,
        priority: template.priority,
        defaultDueDaysOffset: template.defaultDueDaysOffset,
      },
    });

    return template;
  }

  /**
   * Update an existing task template
   */
  static async updateTemplate(
    templateId: string,
    data: UpdateTaskTemplateInput,
    actor: SessionUser
  ): Promise<ITaskTemplateDocument> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can modify task templates");
    }

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw new Error("Invalid template ID format");
    }

    await connectDB();

    const template = await TaskTemplate.findById(templateId);
    if (!template) {
      throw new Error("Task template not found");
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (data.title !== undefined && data.title.trim() !== template.title) {
      changes.title = { from: template.title, to: data.title.trim() };
      template.title = data.title.trim();
    }

    if (data.description !== undefined && data.description.trim() !== template.description) {
      changes.description = { from: template.description, to: data.description.trim() };
      template.description = data.description.trim();
    }

    if (data.priority !== undefined && data.priority !== template.priority) {
      changes.priority = { from: template.priority, to: data.priority };
      template.priority = data.priority;
    }

    if (data.defaultDueDaysOffset !== undefined && data.defaultDueDaysOffset !== template.defaultDueDaysOffset) {
      changes.defaultDueDaysOffset = { from: template.defaultDueDaysOffset, to: data.defaultDueDaysOffset };
      template.defaultDueDaysOffset = data.defaultDueDaysOffset;
    }

    if (data.tags !== undefined) {
      changes.tags = { from: template.tags, to: data.tags };
      template.tags = data.tags;
    }

    if (data.isActive !== undefined && data.isActive !== template.isActive) {
      changes.isActive = { from: template.isActive, to: data.isActive };
      template.isActive = data.isActive;
    }

    await template.save();

    if (Object.keys(changes).length > 0) {
      await AuditLog.create({
        action: "template_updated",
        targetModel: "TaskTemplate",
        targetId: template._id,
        actorId: new mongoose.Types.ObjectId(actor.id),
        actorName: actor.name,
        actorRole: actor.role,
        changes,
        metadata: {
          title: template.title,
        },
      });
    }

    return template;
  }

  /**
   * Deactivate a template (safe soft deletion/retirement)
   */
  static async deactivateTemplate(
    templateId: string,
    actor: SessionUser
  ): Promise<ITaskTemplateDocument> {
    return this.updateTemplate(templateId, { isActive: false }, actor);
  }

  /**
   * Delete or deactivate template:
   * If usageCount > 0, deactivate instead of deleting to protect audit history and integrity.
   * If usageCount === 0, hard delete is safely allowed.
   */
  static async deleteOrDeactivate(
    templateId: string,
    actor: SessionUser
  ): Promise<{ action: "deleted" | "deactivated"; template: ITaskTemplateDocument }> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can remove task templates");
    }

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      throw new Error("Invalid template ID format");
    }

    await connectDB();

    const template = await TaskTemplate.findById(templateId);
    if (!template) {
      throw new Error("Task template not found");
    }

    if (template.usageCount > 0) {
      // Must preserve: deactivate instead of deleting
      template.isActive = false;
      await template.save();

      await AuditLog.create({
        action: "template_deactivated",
        targetModel: "TaskTemplate",
        targetId: template._id,
        actorId: new mongoose.Types.ObjectId(actor.id),
        actorName: actor.name,
        actorRole: actor.role,
        metadata: {
          title: template.title,
          usageCount: template.usageCount,
          reason: "Preserved historical audit trail; template deactivated instead of hard deletion.",
        },
      });

      return { action: "deactivated", template };
    } else {
      await TaskTemplate.findByIdAndDelete(templateId);

      await AuditLog.create({
        action: "template_deleted",
        targetModel: "TaskTemplate",
        targetId: template._id,
        actorId: new mongoose.Types.ObjectId(actor.id),
        actorName: actor.name,
        actorRole: actor.role,
        metadata: {
          title: template.title,
          usageCount: 0,
        },
      });

      return { action: "deleted", template };
    }
  }

  /**
   * Record template usage when a task is created from it
   */
  static async recordUsage(templateId: string): Promise<void> {
    if (!templateId || !mongoose.Types.ObjectId.isValid(templateId)) return;
    await connectDB();
    await TaskTemplate.findByIdAndUpdate(templateId, { $inc: { usageCount: 1 } });
  }
}
