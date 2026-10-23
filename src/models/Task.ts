import mongoose, { Schema, Document, Model } from "mongoose";
import { TaskPriority, TaskStatus } from "@/types";

export interface ITaskDocument extends Document {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedInternId: mongoose.Types.ObjectId;
  assignedInternSnapshot?: {
    name: string;
    email: string;
    internId: string;
  };
  assignmentDate: Date;
  dueDate: Date;
  isArchived: boolean;
  createdByAdminId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "assigned",
        "in_progress",
        "submitted",
        "changes_requested",
        "approved",
      ],
      default: "assigned",
      index: true,
    },
    assignedInternId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedInternSnapshot: {
      name: String,
      email: String,
      internId: String,
    },
    assignmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound queries optimization for intern views and reports
TaskSchema.index({ assignedInternId: 1, isArchived: 1, status: 1 });
TaskSchema.index({ isArchived: 1, dueDate: 1 });

export const Task: Model<ITaskDocument> =
  mongoose.models.Task || mongoose.model<ITaskDocument>("Task", TaskSchema);
