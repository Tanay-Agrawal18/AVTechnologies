import mongoose, { Schema, Document, Model } from "mongoose";
import { TaskPriority } from "@/types";

export interface ITaskTemplateDocument extends Document {
  title: string;
  description: string;
  priority: TaskPriority;
  defaultDueDaysOffset?: number | null; // e.g. 7 days from assignment date
  tags?: string[];
  isActive: boolean;
  usageCount: number;
  createdByAdminId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskTemplateSchema = new Schema<ITaskTemplateDocument>(
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
    defaultDueDaysOffset: {
      type: Number,
      min: 0,
      max: 365,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

TaskTemplateSchema.index({ isActive: 1, createdAt: -1 });

export const TaskTemplate: Model<ITaskTemplateDocument> =
  mongoose.models.TaskTemplate ||
  mongoose.model<ITaskTemplateDocument>("TaskTemplate", TaskTemplateSchema);
