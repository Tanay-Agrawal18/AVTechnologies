import mongoose, { Schema, Document, Model } from "mongoose";
import { TaskPriority, TaskStatus } from "@/types";

export interface ITaskDocument extends Document {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedInternId?: mongoose.Types.ObjectId;
  assignedInternSnapshot?: {
    name: string;
    email: string;
    internId: string;
  };
  taskGroupId?: string;
  projectId?: mongoose.Types.ObjectId;
  assignmentDate: Date;
  dueDate: Date;
  isArchived: boolean;
  createdByAdminId: mongoose.Types.ObjectId;
  unassignedAt?: Date;
  unassignedReason?: string;
  unassignedByAdminId?: mongoose.Types.ObjectId;
  transferredAt?: Date;
  transferredToInternId?: mongoose.Types.ObjectId;
  transferredReason?: string;
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
        "unassigned",
        "transferred",
      ],
      default: "assigned",
      index: true,
    },
    assignedInternId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    assignedInternSnapshot: {
      name: String,
      email: String,
      internId: String,
    },
    taskGroupId: {
      type: String,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
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
    unassignedAt: {
      type: Date,
    },
    unassignedReason: {
      type: String,
      trim: true,
    },
    unassignedByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    transferredAt: {
      type: Date,
    },
    transferredToInternId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    transferredReason: {
      type: String,
      trim: true,
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
