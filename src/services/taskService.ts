import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Task, ITaskDocument } from "@/models/Task";
import { TaskEvent } from "@/models/TaskEvent";
import { Submission, ISubmissionDocument } from "@/models/Submission";
import { User } from "@/models/User";
import { canTransitionStatus } from "./taskStateService";
import { TaskPriority, TaskStatus, SessionUser } from "@/types";

export interface CreateTaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  assignedInternId?: string;
  assignedInternIds?: string[];
  assignmentDate: string;
  dueDate: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  assignedInternId?: string;
  assignmentDate?: string;
  dueDate?: string;
  isArchived?: boolean;
}

export interface SubmissionInput {
  workDescription: string;
  externalLinks: string[];
  attachments: {
    fileKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }[];
}

export class TaskService {
  static async createTask(data: CreateTaskInput, actor: SessionUser): Promise<ITaskDocument> {
    const tasks = await this.createTasks(data, actor);
    return tasks[0];
  }

  static async createTasks(data: CreateTaskInput, actor: SessionUser): Promise<ITaskDocument[]> {
    await connectDB();

    // Determine intern IDs list
    const rawIds: string[] = [];
    if (data.assignedInternIds && data.assignedInternIds.length > 0) {
      rawIds.push(...data.assignedInternIds);
    } else if (data.assignedInternId) {
      rawIds.push(data.assignedInternId);
    }

    const uniqueIds = Array.from(new Set(rawIds));
    if (uniqueIds.length === 0) {
      throw new Error("At least one valid intern must be assigned");
    }

    const interns = await User.find({ _id: { $in: uniqueIds }, role: "intern" });
    if (interns.length !== uniqueIds.length) {
      throw new Error("One or more assigned interns were not found or have invalid roles");
    }

    // If multiple interns, assign a common taskGroupId for correlation while keeping independent task records
    const taskGroupId = uniqueIds.length > 1 ? new mongoose.Types.ObjectId().toString() : undefined;
    const createdTasks: ITaskDocument[] = [];

    for (const intern of interns) {
      const task = await Task.create({
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: "assigned",
        assignedInternId: intern._id,
        assignedInternSnapshot: {
          name: intern.name,
          email: intern.email,
          internId: intern.internId || "",
        },
        taskGroupId,
        assignmentDate: new Date(data.assignmentDate),
        dueDate: new Date(data.dueDate),
        isArchived: false,
        createdByAdminId: actor.id,
      });

      await TaskEvent.create({
        taskId: task._id,
        eventType: "created",
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        newValue: {
          title: task.title,
          priority: task.priority,
          status: task.status,
          assignedTo: intern.name,
          taskGroupId,
        },
        note: `Task created and assigned to ${intern.name}`,
        timestamp: new Date(),
      });

      createdTasks.push(task);
    }

    return createdTasks;
  }

  static async updateTask(
    taskId: string,
    data: UpdateTaskInput,
    actor: SessionUser
  ): Promise<ITaskDocument> {
    await connectDB();
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const eventsToCreate: Array<Record<string, unknown>> = [];

    if (data.assignedInternId && data.assignedInternId !== task.assignedInternId.toString()) {
      const newIntern = await User.findOne({ _id: data.assignedInternId, role: "intern" });
      if (!newIntern) {
        throw new Error("New assigned intern not found");
      }
      const prevIntern = task.assignedInternSnapshot?.name || task.assignedInternId.toString();
      task.assignedInternId = newIntern._id as mongoose.Types.ObjectId;
      task.assignedInternSnapshot = {
        name: newIntern.name,
        email: newIntern.email,
        internId: newIntern.internId || "",
      };

      eventsToCreate.push({
        taskId: task._id,
        eventType: "reassigned",
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        previousValue: prevIntern,
        newValue: newIntern.name,
        timestamp: new Date(),
      });
    }

    if (data.dueDate && new Date(data.dueDate).getTime() !== new Date(task.dueDate).getTime()) {
      const prevDue = task.dueDate.toISOString();
      task.dueDate = new Date(data.dueDate);
      eventsToCreate.push({
        taskId: task._id,
        eventType: "deadline_changed",
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        previousValue: prevDue,
        newValue: task.dueDate.toISOString(),
        timestamp: new Date(),
      });
    }

    if (typeof data.isArchived === "boolean" && data.isArchived !== task.isArchived) {
      task.isArchived = data.isArchived;
      eventsToCreate.push({
        taskId: task._id,
        eventType: data.isArchived ? "archived" : "unarchived",
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.name,
        timestamp: new Date(),
      });
    }

    if (data.title) task.title = data.title;
    if (data.description) task.description = data.description;
    if (data.priority) task.priority = data.priority;
    if (data.assignmentDate) task.assignmentDate = new Date(data.assignmentDate);

    await task.save();

    if (eventsToCreate.length > 0) {
      await TaskEvent.insertMany(eventsToCreate);
    }

    return task;
  }

  static async updateTaskStatus(
    taskId: string,
    targetStatus: TaskStatus,
    actor: SessionUser,
    note?: string
  ): Promise<ITaskDocument> {
    await connectDB();
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    // Role & ownership check
    if (actor.role === "intern" && task.assignedInternId.toString() !== actor.id) {
      throw new Error("Access denied: You can only update tasks assigned to you");
    }

    const check = canTransitionStatus(task.status, targetStatus, actor.role);
    if (!check.valid) {
      throw new Error(check.reason);
    }

    const prevStatus = task.status;
    task.status = targetStatus;
    await task.save();

    await TaskEvent.create({
      taskId: task._id,
      eventType: "status_changed",
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name,
      previousValue: prevStatus,
      newValue: targetStatus,
      note: note || `Status updated from ${prevStatus} to ${targetStatus}`,
      timestamp: new Date(),
    });

    return task;
  }

  static async submitWork(
    taskId: string,
    data: SubmissionInput,
    actor: SessionUser
  ): Promise<{ task: ITaskDocument; submission: ISubmissionDocument }> {
    await connectDB();
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.assignedInternId.toString() !== actor.id) {
      throw new Error("Access denied: You can only submit work for tasks assigned to you");
    }

    const check = canTransitionStatus(task.status, "submitted", actor.role);
    if (!check.valid) {
      throw new Error(check.reason);
    }

    // Get current version count for this task
    const lastSubmission = await Submission.findOne({ taskId: task._id }).sort({ version: -1 });
    const nextVersion = lastSubmission ? lastSubmission.version + 1 : 1;

    const submission = await Submission.create({
      taskId: task._id,
      internId: actor.id,
      version: nextVersion,
      workDescription: data.workDescription,
      externalLinks: data.externalLinks,
      attachments: data.attachments,
      reviewStatus: "pending",
    });

    const prevStatus = task.status;
    task.status = "submitted";
    await task.save();

    await TaskEvent.create({
      taskId: task._id,
      eventType: "submitted",
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name,
      previousValue: prevStatus,
      newValue: "submitted",
      note: `Submission version ${nextVersion} provided`,
      timestamp: new Date(),
    });

    return { task, submission };
  }

  static async reviewSubmission(
    taskId: string,
    submissionId: string,
    decision: "approve" | "request_changes",
    feedback: string,
    actor: SessionUser
  ): Promise<{ task: ITaskDocument; submission: ISubmissionDocument }> {
    await connectDB();
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const submission = await Submission.findById(submissionId);
    if (!submission || submission.taskId.toString() !== task._id.toString()) {
      throw new Error("Submission not found for this task");
    }

    const targetTaskStatus: TaskStatus = decision === "approve" ? "approved" : "changes_requested";
    const check = canTransitionStatus(task.status, targetTaskStatus, actor.role);
    if (!check.valid) {
      throw new Error(check.reason);
    }

    submission.reviewStatus = decision === "approve" ? "approved" : "changes_requested";
    submission.adminFeedback = feedback;
    submission.reviewedByAdminId = new mongoose.Types.ObjectId(actor.id);
    submission.reviewedAt = new Date();
    await submission.save();

    const prevStatus = task.status;
    task.status = targetTaskStatus;
    await task.save();

    await TaskEvent.create({
      taskId: task._id,
      eventType: decision === "approve" ? "review_approved" : "review_requested_changes",
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name,
      previousValue: prevStatus,
      newValue: targetTaskStatus,
      note: `Review feedback: ${feedback}`,
      timestamp: new Date(),
    });

    return { task, submission };
  }
}
