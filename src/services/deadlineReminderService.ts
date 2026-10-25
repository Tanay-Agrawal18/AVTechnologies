import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { NotificationService } from "@/services/notificationService";

export interface ReminderJobSummary {
  timestamp: string;
  scannedCount: number;
  approachingCount: number;
  overdueCount: number;
  details: Array<{
    taskId: string;
    internId: string;
    type: "deadline_approaching" | "deadline_overdue";
    title: string;
    status: "created" | "already_notified" | "failed";
    error?: string;
  }>;
}

export class DeadlineReminderService {
  /**
   * Process deadline reminders for all eligible active tasks.
   * Eligible states: 'assigned', 'in_progress', 'changes_requested'.
   * Excluded: 'submitted' (pending review), 'approved', 'unassigned', 'transferred', or archived.
   *
   * @param hoursAhead Default 24 hours. Tasks due within now and now + hoursAhead receive 'deadline_approaching'.
   * Tasks whose dueDate < now receive 'deadline_overdue'.
   */
  static async processDeadlineReminders(
    hoursAhead = 24
  ): Promise<ReminderJobSummary> {
    await connectDB();

    const now = new Date();
    const thresholdDate = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    const todayDateString = now.toISOString().split("T")[0]; // YYYY-MM-DD for day-level idempotency

    // Query eligible unarchived tasks assigned to an intern
    const eligibleTasks = await Task.find({
      isArchived: false,
      assignedInternId: { $ne: null },
      status: { $in: ["assigned", "in_progress", "changes_requested"] },
      dueDate: { $lte: thresholdDate },
    }).lean();

    const summary: ReminderJobSummary = {
      timestamp: now.toISOString(),
      scannedCount: eligibleTasks.length,
      approachingCount: 0,
      overdueCount: 0,
      details: [],
    };

    for (const task of eligibleTasks) {
      if (!task.assignedInternId) continue;
      const internIdStr = task.assignedInternId.toString();
      const taskDueDate = new Date(task.dueDate);
      const isOverdue = taskDueDate < now;

      if (isOverdue) {
        // Idempotency key scoped per task, intern, and day: prevents spamming multiple times on same day
        const idempotencyKey = `deadline_overdue:${task._id}:${internIdStr}:${todayDateString}`;

        try {
          const res = await NotificationService.createNotification({
            recipientId: internIdStr,
            type: "deadline_overdue",
            title: "Task Overdue Reminder",
            message: `The deadline for "${task.title}" passed on ${taskDueDate.toLocaleDateString()}. Please update your progress or submit your work.`,
            link: `/intern/tasks/${task._id}`,
            idempotencyKey,
            metadata: {
              taskId: task._id.toString(),
              taskTitle: task.title,
              dueDate: taskDueDate.toISOString(),
              daysOverdue: Math.floor((now.getTime() - taskDueDate.getTime()) / (1000 * 60 * 60 * 24)),
            },
          });

          if (res.created) {
            summary.overdueCount++;
            summary.details.push({
              taskId: task._id.toString(),
              internId: internIdStr,
              type: "deadline_overdue",
              title: task.title,
              status: "created",
            });
          } else {
            summary.details.push({
              taskId: task._id.toString(),
              internId: internIdStr,
              type: "deadline_overdue",
              title: task.title,
              status: "already_notified",
            });
          }
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : "Notification creation failed";
          summary.details.push({
            taskId: task._id.toString(),
            internId: internIdStr,
            type: "deadline_overdue",
            title: task.title,
            status: "failed",
            error: errorMsg,
          });
        }
      } else {
        // Approaching deadline (within hoursAhead)
        // Scoped to specific task and due date string so intern receives warning once for this deadline
        const idempotencyKey = `deadline_approaching:${task._id}:${internIdStr}:${todayDateString}`;

        try {
          const res = await NotificationService.createNotification({
            recipientId: internIdStr,
            type: "deadline_approaching",
            title: "Upcoming Task Deadline",
            message: `"${task.title}" is due soon on ${taskDueDate.toLocaleString()}. Priority: ${task.priority.toUpperCase()}.`,
            link: `/intern/tasks/${task._id}`,
            idempotencyKey,
            metadata: {
              taskId: task._id.toString(),
              taskTitle: task.title,
              dueDate: taskDueDate.toISOString(),
            },
          });

          if (res.created) {
            summary.approachingCount++;
            summary.details.push({
              taskId: task._id.toString(),
              internId: internIdStr,
              type: "deadline_approaching",
              title: task.title,
              status: "created",
            });
          } else {
            summary.details.push({
              taskId: task._id.toString(),
              internId: internIdStr,
              type: "deadline_approaching",
              title: task.title,
              status: "already_notified",
            });
          }
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : "Notification creation failed";
          summary.details.push({
            taskId: task._id.toString(),
            internId: internIdStr,
            type: "deadline_approaching",
            title: task.title,
            status: "failed",
            error: errorMsg,
          });
        }
      }
    }

    return summary;
  }
}
