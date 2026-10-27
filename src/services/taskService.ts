import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Task, ITaskDocument } from "@/models/Task";
import { TaskEvent } from "@/models/TaskEvent";
import { Submission, ISubmissionDocument } from "@/models/Submission";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { AuditLog } from "@/models/AuditLog";
import { canTransitionStatus } from "./taskStateService";
import { TaskPriority, TaskStatus, SessionUser } from "@/types";
import {
  invalidateKpiCache,
  invalidateProjectsCache,
  invalidateReviewQueueCache,
  invalidateAnalyticsCache,
  getOrSetCache,
  CACHE_KEYS,
  CACHE_TTL,
} from "@/lib/cache";
import { NotificationService } from "./notificationService";
import { realtimeBus } from "@/lib/realtime";

export interface CreateTaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  assignedInternId?: string;
  assignedInternIds?: string[];
  projectId?: string;
  assignmentDate: string;
  dueDate: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  assignedInternId?: string;
  projectId?: string | null;
  assignmentDate?: string;
  dueDate?: string;
  isArchived?: boolean;
}

export interface UnassignTaskInput {
  reason?: string;
}

export interface TransferTaskInput {
  newInternId: string;
  reason: string;
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

export interface ReviewQueueFilter {
  status?: "pending" | "changes_requested" | "approved" | "all";
  internId?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export interface ReviewQueueItem {
  taskId: string;
  taskTitle: string;
  taskPriority: TaskPriority;
  taskStatus: TaskStatus;
  taskDueDate: Date;
  taskAssignmentDate: Date;
  intern: {
    _id: string;
    name: string;
    email: string;
    internId?: string;
    department?: string;
  };
  latestSubmission: {
    _id: string;
    version: number;
    workDescription: string;
    externalLinks: string[];
    attachmentsCount: number;
    reviewStatus: "pending" | "changes_requested" | "approved";
    adminFeedback?: string;
    submittedAt: Date;
    reviewedAt?: Date;
  };
  totalSubmissionsCount: number;
}

export interface ReviewQueueResult {
  items: ReviewQueueItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  counts: {
    pending: number;
    changesRequested: number;
    approved: number;
    total: number;
  };
}

export class TaskService {
  static async getReviewQueue(
    filter: ReviewQueueFilter,
    actor: SessionUser
  ): Promise<ReviewQueueResult> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can access the task review queue");
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 15));
    const statusFilter = filter.status || "pending";
    const internId = filter.internId && filter.internId !== "all" ? filter.internId : undefined;
    const department = filter.department && filter.department !== "all" ? filter.department : undefined;

    const cacheKey = CACHE_KEYS.reviewQueue(
      actor.role,
      actor.id,
      statusFilter,
      internId,
      department,
      page,
      limit
    );

    return getOrSetCache(
      cacheKey,
      CACHE_TTL.REVIEW_QUEUE,
      async () => {
        await connectDB();

        const skip = (page - 1) * limit;

        // Build matching criteria
        // A task in the review queue is typically submitted or changes_requested or approved with a submission
        const taskQuery: Record<string, unknown> = {
          isArchived: false,
        };

        if (internId && mongoose.Types.ObjectId.isValid(internId)) {
          taskQuery.assignedInternId = new mongoose.Types.ObjectId(internId);
        }

        // Filter by task status depending on review filter
        if (statusFilter === "pending") {
          taskQuery.status = "submitted";
        } else if (statusFilter === "changes_requested") {
          taskQuery.status = "changes_requested";
        } else if (statusFilter === "approved") {
          taskQuery.status = "approved";
        } else if (statusFilter === "all") {
          taskQuery.status = { $in: ["submitted", "changes_requested", "approved"] };
        }

        // Aggregate to fetch matching tasks, intern info, and their latest submission
        const pipeline: mongoose.PipelineStage[] = [
          { $match: taskQuery },
          {
            $lookup: {
              from: "users",
              localField: "assignedInternId",
              foreignField: "_id",
              as: "intern",
            },
          },
          { $unwind: { path: "$intern", preserveNullAndEmptyArrays: false } },
        ];

        if (department) {
          pipeline.push({
            $match: {
              "intern.department": department,
            },
          });
        }

        // Lookup submissions for each task
        pipeline.push(
          {
            $lookup: {
              from: "submissions",
              let: { taskId: "$_id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$taskId", "$$taskId"] } } },
                { $sort: { version: -1 } },
              ],
              as: "submissions",
            },
          },
          // Ensure task has at least one submission
          {
            $match: {
              "submissions.0": { $exists: true },
            },
          }
        );

        // If specific submission reviewStatus filtering requested:
        if (statusFilter === "pending") {
          pipeline.push({
            $match: {
              "submissions.0.reviewStatus": "pending",
            },
          });
        } else if (statusFilter === "changes_requested") {
          pipeline.push({
            $match: {
              "submissions.0.reviewStatus": "changes_requested",
            },
          });
        } else if (statusFilter === "approved") {
          pipeline.push({
            $match: {
              "submissions.0.reviewStatus": "approved",
            },
          });
        }

        // Count summary aggregation across all reviewable tasks
        const countPromise = Task.aggregate([
          { $match: { isArchived: false, status: { $in: ["submitted", "changes_requested", "approved"] } } },
          {
            $lookup: {
              from: "submissions",
              let: { taskId: "$_id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$taskId", "$$taskId"] } } },
                { $sort: { version: -1 } },
                { $limit: 1 },
              ],
              as: "latestSub",
            },
          },
          { $unwind: "$latestSub" },
          {
            $group: {
              _id: "$latestSub.reviewStatus",
              count: { $sum: 1 },
            },
          },
        ]);

        // Facet for total filtered count and paginated data
        pipeline.push({
          $facet: {
            totalData: [
              { $sort: { "submissions.0.createdAt": -1, updatedAt: -1 } },
              { $skip: skip },
              { $limit: limit },
            ],
            totalCount: [{ $count: "count" }],
          },
        });

        const [facetResults, countGroups] = await Promise.all([
          Task.aggregate(pipeline),
          countPromise,
        ]);

        const facet = facetResults[0] || { totalData: [], totalCount: [] };
        const total = facet.totalCount[0]?.count || 0;
        const totalPages = Math.ceil(total / limit) || 1;

        const counts = {
          pending: 0,
          changesRequested: 0,
          approved: 0,
          total: 0,
        };

        for (const g of countGroups) {
          if (g._id === "pending") counts.pending = g.count;
          else if (g._id === "changes_requested") counts.changesRequested = g.count;
          else if (g._id === "approved") counts.approved = g.count;
          counts.total += g.count;
        }

        type RawAggregationDoc = {
          _id: mongoose.Types.ObjectId;
          title: string;
          priority: TaskPriority;
          status: TaskStatus;
          dueDate: Date;
          assignmentDate: Date;
          intern: {
            _id: mongoose.Types.ObjectId;
            name: string;
            email: string;
            internId?: string;
            department?: string;
          };
          submissions: Array<{
            _id: mongoose.Types.ObjectId;
            version: number;
            workDescription: string;
            externalLinks: string[];
            attachments?: Array<unknown>;
            reviewStatus: "pending" | "changes_requested" | "approved";
            adminFeedback?: string;
            createdAt: Date;
            reviewedAt?: Date;
          }>;
        };

        const items: ReviewQueueItem[] = (facet.totalData as RawAggregationDoc[]).map((doc) => {
          const latest = doc.submissions[0];
          return {
            taskId: doc._id.toString(),
            taskTitle: doc.title,
            taskPriority: doc.priority,
            taskStatus: doc.status,
            taskDueDate: doc.dueDate,
            taskAssignmentDate: doc.assignmentDate,
            intern: {
              _id: doc.intern._id.toString(),
              name: doc.intern.name,
              email: doc.intern.email,
              internId: doc.intern.internId,
              department: doc.intern.department,
            },
            latestSubmission: {
              _id: latest._id.toString(),
              version: latest.version,
              workDescription: latest.workDescription,
              externalLinks: latest.externalLinks || [],
              attachmentsCount: latest.attachments?.length || 0,
              reviewStatus: latest.reviewStatus,
              adminFeedback: latest.adminFeedback,
              submittedAt: latest.createdAt,
              reviewedAt: latest.reviewedAt,
            },
            totalSubmissionsCount: doc.submissions.length,
          };
        });

        return {
          items,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
          counts,
        };
      },
      CACHE_KEYS.allReviewQueueKeys()
    );
  }
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

    let projectDoc = null;
    if (data.projectId) {
      projectDoc = await Project.findById(data.projectId).select("title").lean();
    }

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
        projectId: data.projectId ? new mongoose.Types.ObjectId(data.projectId) : undefined,
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
          projectId: data.projectId,
        },
        note: `Task created and assigned to ${intern.name}`,
        timestamp: new Date(),
      });

      if (data.projectId) {
        await TaskEvent.create({
          taskId: task._id,
          eventType: "project_linked",
          actorId: actor.id,
          actorRole: actor.role,
          actorName: actor.name,
          newValue: data.projectId,
          note: `Task linked to collaborative project`,
          timestamp: new Date(),
        });
      }

      createdTasks.push(task);
    }

    // Trigger in-app notifications asynchronously without blocking core task creation
    for (const task of createdTasks) {
      NotificationService.notifyTaskAssigned(task, actor, projectDoc?.title).catch((err) => {
        console.error(`[TaskService] Failed to notify intern for task ${task._id}:`, err);
      });
    }

    // Realtime broadcast for live UI synchronization
    try {
      realtimeBus.emit(
        "task_created",
        {
          taskIds: createdTasks.map((t) => t._id.toString()),
          count: createdTasks.length,
          projectId: data.projectId,
          assignedInternIds: createdTasks.map((t) => t.assignedInternId?.toString()).filter(Boolean),
        },
        { broadcast: true }
      );
    } catch (err) {
      console.error("[TaskService] Realtime emit error on task_created:", err);
    }

    await invalidateKpiCache();
    await invalidateReviewQueueCache();
    if (data.projectId) {
      await invalidateProjectsCache(data.projectId);
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

    if (data.assignedInternId && data.assignedInternId !== task.assignedInternId?.toString()) {
      const newIntern = await User.findOne({ _id: data.assignedInternId, role: "intern" });
      if (!newIntern) {
        throw new Error("New assigned intern not found");
      }
      const prevIntern = task.assignedInternSnapshot?.name || task.assignedInternId?.toString() || "Unassigned";
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

    if (data.assignedInternId && task.assignedInternId) {
      NotificationService.notifyTaskAssigned(task, actor).catch((err) => {
        console.error(`[TaskService] Failed to notify intern for reassigned task ${task._id}:`, err);
      });
    }

    await invalidateKpiCache();
    await invalidateReviewQueueCache();
    if (task.projectId) {
      await invalidateProjectsCache(task.projectId.toString());
    }

    try {
      realtimeBus.emit(
        "task_updated",
        {
          taskId: task._id.toString(),
          title: task.title,
          assignedInternId: task.assignedInternId?.toString(),
          projectId: task.projectId?.toString(),
          status: task.status,
          dueDate: task.dueDate,
        },
        { broadcast: true }
      );
    } catch (err) {
      console.error("[TaskService] Realtime emit error on task_updated:", err);
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
    if (actor.role === "intern" && (!task.assignedInternId || task.assignedInternId.toString() !== actor.id)) {
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

    await invalidateKpiCache();
    await invalidateReviewQueueCache();
    await invalidateAnalyticsCache(task.assignedInternId?.toString());
    if (task.projectId) {
      await invalidateProjectsCache(task.projectId.toString());
    }

    try {
      realtimeBus.emit(
        "task_status_changed",
        {
          taskId: task._id.toString(),
          title: task.title,
          previousStatus: prevStatus,
          status: targetStatus,
          assignedInternId: task.assignedInternId?.toString(),
          projectId: task.projectId?.toString(),
        },
        { broadcast: true }
      );
    } catch (err) {
      console.error("[TaskService] Realtime emit error on task_status_changed:", err);
    }

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

    if (!task.assignedInternId || task.assignedInternId.toString() !== actor.id) {
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

    await invalidateKpiCache();
    await invalidateReviewQueueCache();
    await invalidateAnalyticsCache(task.assignedInternId?.toString());
    if (task.projectId) {
      await invalidateProjectsCache(task.projectId.toString());
    }

    // Trigger admin notification asynchronously
    NotificationService.notifyTaskSubmitted(task, submission, actor).catch((err) => {
      console.error(`[TaskService] Failed to notify admins for submission on task ${task._id}:`, err);
    });

    try {
      realtimeBus.emit(
        "task_updated",
        {
          taskId: task._id.toString(),
          title: task.title,
          status: "submitted",
          version: nextVersion,
          assignedInternId: actor.id,
        },
        { broadcast: true }
      );
    } catch (err) {
      console.error("[TaskService] Realtime emit error on submitWork:", err);
    }

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

    await invalidateKpiCache();
    await invalidateReviewQueueCache();
    await invalidateAnalyticsCache(task.assignedInternId?.toString());
    if (task.projectId) {
      await invalidateProjectsCache(task.projectId.toString());
    }

    // Trigger intern notification asynchronously
    NotificationService.notifySubmissionReviewed(task, submission, decision, feedback, actor).catch((err) => {
      console.error(`[TaskService] Failed to notify intern for review on task ${task._id}:`, err);
    });

    try {
      realtimeBus.emit(
        "task_updated",
        {
          taskId: task._id.toString(),
          title: task.title,
          decision,
          status: targetTaskStatus,
          assignedInternId: task.assignedInternId?.toString(),
        },
        { broadcast: true }
      );
    } catch (err) {
      console.error("[TaskService] Realtime emit error on reviewSubmission:", err);
    }

    return { task, submission };
  }

  static async unassignTask(
    taskId: string,
    data: UnassignTaskInput,
    actor: SessionUser
  ): Promise<ITaskDocument> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can unassign tasks");
    }

    await connectDB();
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status === "unassigned") {
      throw new Error("Task is already unassigned");
    }

    if (task.status === "transferred") {
      throw new Error("Cannot unassign a transferred task");
    }

    const prevStatus = task.status;
    const prevInternId = task.assignedInternId;
    const prevInternSnapshot = task.assignedInternSnapshot;

    task.status = "unassigned";
    task.unassignedAt = new Date();
    task.unassignedReason = data.reason?.trim() || "Unassigned by administrator";
    task.unassignedByAdminId = new mongoose.Types.ObjectId(actor.id);
    // Retain assignedInternSnapshot for audit clarity, while clearing active assignment
    task.assignedInternId = undefined;

    await task.save();

    await TaskEvent.create({
      taskId: task._id,
      eventType: "unassigned",
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name,
      previousValue: {
        status: prevStatus,
        assignedInternId: prevInternId?.toString(),
        internName: prevInternSnapshot?.name,
      },
      newValue: {
        status: "unassigned",
        reason: task.unassignedReason,
      },
      note: `Intern unassigned from task. Reason: ${task.unassignedReason}`,
      timestamp: new Date(),
    });

    await AuditLog.create({
      action: "task_unassigned",
      targetModel: "Task",
      targetId: task._id,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      changes: {
        status: { from: prevStatus, to: "unassigned" },
        assignedInternId: { from: prevInternId?.toString(), to: null },
      },
      metadata: {
        previousIntern: prevInternSnapshot,
        reason: task.unassignedReason,
      },
    });

    await invalidateKpiCache();
    await invalidateReviewQueueCache();
    if (task.projectId) {
      await invalidateProjectsCache(task.projectId.toString());
    }

    try {
      realtimeBus.emit(
        "task_unassigned",
        {
          taskId: task._id.toString(),
          title: task.title,
          previousInternId: prevInternId?.toString(),
        },
        { broadcast: true }
      );
    } catch (err) {
      console.error("[TaskService] Realtime emit error on task_unassigned:", err);
    }

    return task;
  }

  static async transferTask(
    taskId: string,
    data: TransferTaskInput,
    actor: SessionUser
  ): Promise<{ previousTask: ITaskDocument; newTask: ITaskDocument }> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can transfer task assignments");
    }

    await connectDB();
    const previousTask = await Task.findById(taskId);
    if (!previousTask) {
      throw new Error("Original task not found");
    }

    if (previousTask.status === "transferred") {
      throw new Error("Task has already been transferred to another intern");
    }

    if (previousTask.status === "approved") {
      throw new Error("Cannot transfer an already approved task");
    }

    // Verify new intern
    const newIntern = await User.findOne({ _id: data.newInternId, role: "intern", status: "active" });
    if (!newIntern) {
      throw new Error("Selected replacement intern does not exist or is not an active intern");
    }

    if (previousTask.assignedInternId && previousTask.assignedInternId.toString() === newIntern._id.toString()) {
      throw new Error("Target intern is already the active assignee for this task");
    }

    // Prevent duplicate active assignments if the target intern already has an active task in the same group or project
    if (previousTask.taskGroupId || previousTask.projectId) {
      const duplicateQuery: Record<string, unknown> = {
        assignedInternId: newIntern._id,
        status: { $in: ["assigned", "in_progress", "submitted", "changes_requested"] },
        isArchived: false,
      };
      if (previousTask.taskGroupId) {
        duplicateQuery.taskGroupId = previousTask.taskGroupId;
      } else if (previousTask.projectId) {
        duplicateQuery.projectId = previousTask.projectId;
        duplicateQuery.title = previousTask.title;
      }

      const existingActive = await Task.findOne(duplicateQuery);
      if (existingActive) {
        throw new Error(
          `Target intern '${newIntern.name}' already has an active assignment for this task set`
        );
      }
    }

    const previousInternSnapshot = previousTask.assignedInternSnapshot;
    const prevStatus = previousTask.status;

    // Use transaction if supported by Mongo deployment, else fallback safely
    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }

    try {
      // 1. Mark previous assignment as 'transferred'
      previousTask.status = "transferred";
      previousTask.transferredAt = new Date();
      previousTask.transferredToInternId = newIntern._id as mongoose.Types.ObjectId;
      previousTask.transferredReason = data.reason.trim();
      await previousTask.save(session ? { session } : undefined);

      // 2. Create brand-new clean assignment for new intern WITHOUT copying old submissions
      const newTaskData = {
        title: previousTask.title,
        description: previousTask.description,
        priority: previousTask.priority,
        status: "assigned" as TaskStatus,
        assignedInternId: newIntern._id,
        assignedInternSnapshot: {
          name: newIntern.name,
          email: newIntern.email,
          internId: newIntern.internId || "",
        },
        taskGroupId: previousTask.taskGroupId,
        projectId: previousTask.projectId,
        assignmentDate: new Date(),
        dueDate: previousTask.dueDate,
        isArchived: false,
        createdByAdminId: new mongoose.Types.ObjectId(actor.id),
      };

      const rawNewTask = session
        ? await Task.create([newTaskData], { session })
        : await Task.create(newTaskData);
      const newTask = Array.isArray(rawNewTask) ? rawNewTask[0] : rawNewTask;

      // 3. Record TaskEvent for previous task
      await TaskEvent.create(
        [
          {
            taskId: previousTask._id,
            eventType: "transferred",
            actorId: actor.id,
            actorRole: actor.role,
            actorName: actor.name,
            previousValue: {
              status: prevStatus,
              internName: previousInternSnapshot?.name,
            },
            newValue: {
              status: "transferred",
              transferredTo: newIntern.name,
              newTaskId: newTask._id.toString(),
              reason: data.reason,
            },
            note: `Assignment transferred to ${newIntern.name}. Reason: ${data.reason}`,
            timestamp: new Date(),
          },
        ],
        session ? { session } : undefined
      );

      // 4. Record TaskEvent for new task
      await TaskEvent.create(
        [
          {
            taskId: newTask._id,
            eventType: "created",
            actorId: actor.id,
            actorRole: actor.role,
            actorName: actor.name,
            newValue: {
              title: newTask.title,
              assignedTo: newIntern.name,
              transferredFrom: previousInternSnapshot?.name,
              previousTaskId: previousTask._id.toString(),
            },
            note: `Task assigned via transfer from ${previousInternSnapshot?.name || "previous intern"}`,
            timestamp: new Date(),
          },
        ],
        session ? { session } : undefined
      );

      // 5. Append-only AuditLog
      await AuditLog.create(
        [
          {
            action: "task_transferred",
            targetModel: "Task",
            targetId: previousTask._id,
            actorId: actor.id,
            actorName: actor.name,
            actorRole: actor.role,
            changes: {
              status: { from: prevStatus, to: "transferred" },
              assignedInternId: {
                from: previousTask.assignedInternId?.toString(),
                to: newIntern._id.toString(),
              },
            },
            metadata: {
              previousIntern: previousInternSnapshot,
              newIntern: {
                id: newIntern._id.toString(),
                name: newIntern.name,
                email: newIntern.email,
              },
              newTaskId: newTask._id.toString(),
              reason: data.reason,
            },
          },
        ],
        session ? { session } : undefined
      );

      if (session) {
        await session.commitTransaction();
      }

      await invalidateKpiCache();
      await invalidateReviewQueueCache();
      if (previousTask.projectId) {
        await invalidateProjectsCache(previousTask.projectId.toString());
      }

      // Notify replacement intern asynchronously
      NotificationService.notifyTaskTransferred(
        newTask,
        previousInternSnapshot?.name || "previous intern",
        actor
      ).catch((err) => {
        console.error(`[TaskService] Failed to notify intern for transferred task ${newTask._id}:`, err);
      });

      try {
        realtimeBus.emit(
          "task_updated",
          {
            previousTaskId: previousTask._id.toString(),
            newTaskId: newTask._id.toString(),
            title: newTask.title,
            newInternId: newIntern._id.toString(),
            previousInternId: previousTask.assignedInternId?.toString(),
          },
          { broadcast: true }
        );
      } catch (err) {
        console.error("[TaskService] Realtime emit error on transferTask:", err);
      }

      return { previousTask, newTask };
    } catch (err) {
      if (session) {
        await session.abortTransaction();
      }
      throw err;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
}
