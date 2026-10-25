import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType =
  | "task_assigned"
  | "task_submitted"
  | "submission_approved"
  | "submission_changes_requested"
  | "deadline_approaching"
  | "deadline_overdue"
  | "task_reassigned";

export interface INotificationDocument extends Document {
  recipientId: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  actorName?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: Date;
  idempotencyKey?: string;
  metadata?: {
    taskId?: string;
    submissionId?: string;
    taskTitle?: string;
    dueDate?: string;
    reviewStatus?: string;
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    actorName: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "task_assigned",
        "task_submitted",
        "submission_approved",
        "submission_changes_requested",
        "deadline_approaching",
        "deadline_overdue",
        "task_reassigned",
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    link: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user access patterns:
// 1. Fetching user's latest notifications paginated: { recipientId: 1, createdAt: -1 }
// 2. Fetching user's unread count: { recipientId: 1, isRead: 1 }
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1 });

export const Notification: Model<INotificationDocument> =
  mongoose.models.Notification ||
  mongoose.model<INotificationDocument>("Notification", NotificationSchema);
