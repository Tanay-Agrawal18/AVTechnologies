import mongoose, { Schema, Document, Model } from "mongoose";
import { ProjectStatus } from "@/types";

export interface IProjectMemberSubdoc {
  internId: mongoose.Types.ObjectId;
  joinedAt: Date;
  addedByAdminId: mongoose.Types.ObjectId;
}

export interface IProjectRemovedMemberSubdoc {
  internId: mongoose.Types.ObjectId;
  removedAt: Date;
  reason?: string;
  removedByAdminId: mongoose.Types.ObjectId;
}

export interface IProjectDocument extends Document {
  title: string;
  description: string;
  status: ProjectStatus;
  startDate: Date;
  dueDate: Date;
  teamMembers: IProjectMemberSubdoc[];
  removedMembers: IProjectRemovedMemberSubdoc[];
  createdByAdminId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectMemberSchema = new Schema(
  {
    internId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    addedByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false }
);

const ProjectRemovedMemberSchema = new Schema(
  {
    internId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    removedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    removedByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false }
);

const ProjectSchema = new Schema<IProjectDocument>(
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
    status: {
      type: String,
      enum: ["planning", "in_progress", "completed", "on_hold"],
      default: "planning",
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    teamMembers: [ProjectMemberSchema],
    removedMembers: [ProjectRemovedMemberSchema],
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

// Indexes
ProjectSchema.index({ "teamMembers.internId": 1, status: 1 });
ProjectSchema.index({ dueDate: 1, status: 1 });

export const Project: Model<IProjectDocument> =
  mongoose.models.Project ||
  mongoose.model<IProjectDocument>("Project", ProjectSchema);
