import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Notification, INotificationDocument, NotificationType } from "@/models/Notification";
import { User } from "@/models/User";
import { ITaskDocument } from "@/models/Task";
import { ISubmissionDocument } from "@/models/Submission";
import { SessionUser } from "@/types";

export interface CreateNotificationInput {
  recipientId: string;
  actorId?: string;
  actorName?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationListResult {
  notifications: INotificationDocument[];
  unreadCount: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class NotificationService {
  /**
   * Safe URL validator to prevent open redirects or unsafe schemes.
   * Only relative internal routes starting with '/' (e.g. /intern/tasks/123) are permitted.
   */
  static sanitizeInternalLink(link?: string): string | undefined {
    if (!link) return undefined;
    const trimmed = link.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://") || trimmed.includes("\\")) {
      return undefined;
    }
    return trimmed;
  }

  /**
   * Safely create a single notification with idempotency support and DB error isolation.
   * Returns an object indicating whether a new document was created or an existing idempotent one was found.
   */
  static async createNotification(
    input: CreateNotificationInput
  ): Promise<{ notification: INotificationDocument | null; created: boolean }> {
    try {
      await connectDB();

      const sanitizedLink = this.sanitizeInternalLink(input.link);

      // If an idempotency key is supplied, check whether this notification was already recorded
      if (input.idempotencyKey) {
        const existing = await Notification.findOne({ idempotencyKey: input.idempotencyKey });
        if (existing) {
          return { notification: existing, created: false };
        }
      }

      const notification = await Notification.create({
        recipientId: new mongoose.Types.ObjectId(input.recipientId),
        actorId: input.actorId ? new mongoose.Types.ObjectId(input.actorId) : undefined,
        actorName: input.actorName?.trim(),
        type: input.type,
        title: input.title.trim(),
        message: input.message.trim(),
        link: sanitizedLink,
        idempotencyKey: input.idempotencyKey?.trim(),
        metadata: input.metadata || {},
        isRead: false,
      });

      return { notification, created: true };
    } catch (err: unknown) {
      // E11000 duplicate key error means concurrent request with same idempotencyKey already succeeded
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
        if (input.idempotencyKey) {
          const existing = await Notification.findOne({ idempotencyKey: input.idempotencyKey });
          return { notification: existing, created: false };
        }
      }
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[NotificationService] Failed to create notification for user ${input.recipientId}: ${errorMsg}`);
      return { notification: null, created: false };
    }
  }

  /**
   * Fetch paginated notifications scoped strictly to the authenticated user.
   */
  static async getUserNotifications(
    userId: string,
    page = 1,
    limit = 15,
    unreadOnly = false
  ): Promise<NotificationListResult> {
    await connectDB();
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const query: Record<string, unknown> = {
      recipientId: userObjectId,
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipientId: userObjectId, isRead: false }),
    ]);

    const totalPages = Math.ceil(total / safeLimit) || 1;

    return {
      notifications: notifications as INotificationDocument[],
      unreadCount,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages,
      },
    };
  }

  /**
   * Mark a single notification or all user notifications as read.
   * Strictly scopes update to recipientId to prevent cross-user IDOR.
   */
  static async markAsRead(
    userId: string,
    options: { notificationId?: string; markAllAsRead?: boolean; isRead?: boolean }
  ): Promise<{ updatedCount: number }> {
    await connectDB();
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const isRead = options.isRead !== false;
    const now = new Date();

    if (options.markAllAsRead) {
      const res = await Notification.updateMany(
        { recipientId: userObjectId, isRead: !isRead },
        { $set: { isRead, readAt: isRead ? now : undefined } }
      );
      return { updatedCount: res.modifiedCount };
    }

    if (options.notificationId && mongoose.Types.ObjectId.isValid(options.notificationId)) {
      const res = await Notification.updateOne(
        { _id: new mongoose.Types.ObjectId(options.notificationId), recipientId: userObjectId },
        { $set: { isRead, readAt: isRead ? now : undefined } }
      );
      return { updatedCount: res.modifiedCount };
    }

    return { updatedCount: 0 };
  }

  /**
   * A. Task Assigned Event
   * Triggered after Admin assigns a task to an Intern.
   */
  static async notifyTaskAssigned(
    task: ITaskDocument,
    actor: SessionUser
  ): Promise<void> {
    if (!task.assignedInternId) return;

    const internIdStr = task.assignedInternId.toString();
    const idempotencyKey = `task_assigned:${task._id}:${internIdStr}`;

    await this.createNotification({
      recipientId: internIdStr,
      actorId: actor.id,
      actorName: actor.name,
      type: "task_assigned",
      title: "New Task Assigned",
      message: `You have been assigned to "${task.title}". Priority: ${task.priority.toUpperCase()}. Due by ${new Date(task.dueDate).toLocaleDateString()}.`,
      link: `/intern/tasks/${task._id}`,
      idempotencyKey,
      metadata: {
        taskId: task._id.toString(),
        taskTitle: task.title,
        dueDate: task.dueDate.toISOString(),
      },
    });
  }

  /**
   * B. Task Submitted Event
   * Triggered when an Intern submits deliverables.
   * Notifies active administrators so they can review the submission.
   */
  static async notifyTaskSubmitted(
    task: ITaskDocument,
    submission: ISubmissionDocument,
    actor: SessionUser
  ): Promise<void> {
    await connectDB();

    // Query active administrators
    const adminRecipients = await User.find({ role: "admin", status: "active" }).select("_id").lean();
    if (!adminRecipients || adminRecipients.length === 0) return;

    const internName = actor.name || task.assignedInternSnapshot?.name || "An intern";
    const idempotencyKeyPrefix = `task_submitted:${task._id}:v${submission.version}`;

    for (const admin of adminRecipients) {
      const adminIdStr = admin._id.toString();
      const idempotencyKey = `${idempotencyKeyPrefix}:${adminIdStr}`;

      await this.createNotification({
        recipientId: adminIdStr,
        actorId: actor.id,
        actorName: internName,
        type: "task_submitted",
        title: "Task Submission Received",
        message: `${internName} submitted version ${submission.version} for "${task.title}". Ready for review.`,
        link: `/admin/review-queue`,
        idempotencyKey,
        metadata: {
          taskId: task._id.toString(),
          submissionId: submission._id.toString(),
          version: submission.version,
          taskTitle: task.title,
        },
      });
    }
  }

  /**
   * C. Submission Reviewed Event
   * Triggered when an Admin approves a submission or requests changes.
   * Notifies the assigned intern.
   */
  static async notifySubmissionReviewed(
    task: ITaskDocument,
    submission: ISubmissionDocument,
    decision: "approve" | "request_changes",
    feedback: string,
    actor: SessionUser
  ): Promise<void> {
    if (!task.assignedInternId) return;

    const internIdStr = task.assignedInternId.toString();
    const isApproved = decision === "approve";
    const type: NotificationType = isApproved ? "submission_approved" : "submission_changes_requested";
    const title = isApproved ? "Submission Approved" : "Changes Requested";
    const message = isApproved
      ? `Your submission for "${task.title}" has been approved by ${actor.name}!`
      : `${actor.name} requested changes on "${task.title}". Feedback: ${feedback}`;

    const idempotencyKey = `review:${submission._id}:${decision}`;

    await this.createNotification({
      recipientId: internIdStr,
      actorId: actor.id,
      actorName: actor.name,
      type,
      title,
      message,
      link: `/intern/tasks/${task._id}`,
      idempotencyKey,
      metadata: {
        taskId: task._id.toString(),
        submissionId: submission._id.toString(),
        decision,
        feedback,
      },
    });
  }

  /**
   * Reassignment / Transfer Event
   * Notifies the new intern that they received a transferred task.
   */
  static async notifyTaskTransferred(
    newTask: ITaskDocument,
    previousInternName: string,
    actor: SessionUser
  ): Promise<void> {
    if (!newTask.assignedInternId) return;

    const internIdStr = newTask.assignedInternId.toString();
    const idempotencyKey = `task_transferred:${newTask._id}:${internIdStr}`;

    await this.createNotification({
      recipientId: internIdStr,
      actorId: actor.id,
      actorName: actor.name,
      type: "task_reassigned",
      title: "Task Transferred To You",
      message: `You have been assigned to "${newTask.title}" transferred from ${previousInternName || "previous intern"}.`,
      link: `/intern/tasks/${newTask._id}`,
      idempotencyKey,
      metadata: {
        taskId: newTask._id.toString(),
        taskTitle: newTask.title,
      },
    });
  }
}
