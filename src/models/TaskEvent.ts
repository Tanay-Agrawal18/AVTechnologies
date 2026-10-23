import mongoose, { Schema, Document, Model } from "mongoose";
import { TaskEventType, UserRole } from "@/types";

export interface ITaskEventDocument extends Document {
  taskId: mongoose.Types.ObjectId;
  eventType: TaskEventType;
  actorId: mongoose.Types.ObjectId;
  actorRole: UserRole;
  actorName: string;
  previousValue?: unknown;
  newValue?: unknown;
  note?: string;
  timestamp: Date;
}

const TaskEventSchema = new Schema<ITaskEventDocument>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "created",
        "status_changed",
        "reassigned",
        "deadline_changed",
        "submitted",
        "review_requested_changes",
        "review_approved",
        "archived",
        "unarchived",
        "unassigned",
        "transferred",
        "project_linked",
        "project_unlinked",
      ],
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ["admin", "intern"],
      required: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    previousValue: {
      type: Schema.Types.Mixed,
    },
    newValue: {
      type: Schema.Types.Mixed,
    },
    note: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Append-only audit events use immutable timestamp
  }
);

TaskEventSchema.index({ taskId: 1, timestamp: -1 });

export const TaskEvent: Model<ITaskEventDocument> =
  mongoose.models.TaskEvent ||
  mongoose.model<ITaskEventDocument>("TaskEvent", TaskEventSchema);
