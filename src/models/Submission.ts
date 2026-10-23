import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubmissionAttachment {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ISubmissionDocument extends Document {
  taskId: mongoose.Types.ObjectId;
  internId: mongoose.Types.ObjectId;
  version: number;
  workDescription: string;
  externalLinks: string[];
  attachments: ISubmissionAttachment[];
  reviewStatus: "pending" | "changes_requested" | "approved";
  adminFeedback?: string;
  reviewedByAdminId?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmissionDocument>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    internId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    workDescription: {
      type: String,
      required: true,
      trim: true,
    },
    externalLinks: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [
      {
        fileKey: { type: String, required: true },
        fileName: { type: String, required: true },
        fileSize: { type: Number, required: true },
        mimeType: { type: String, required: true },
      },
    ],
    reviewStatus: {
      type: String,
      enum: ["pending", "changes_requested", "approved"],
      default: "pending",
      index: true,
    },
    adminFeedback: {
      type: String,
      trim: true,
    },
    reviewedByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

SubmissionSchema.index({ taskId: 1, version: -1 });

export const Submission: Model<ISubmissionDocument> =
  mongoose.models.Submission ||
  mongoose.model<ISubmissionDocument>("Submission", SubmissionSchema);
