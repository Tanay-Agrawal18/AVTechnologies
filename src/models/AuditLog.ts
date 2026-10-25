import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLogDocument extends Document {
  action: string;
  targetModel: "User" | "Task" | "Submission" | "DocumentTemplate" | "IssuedDocument" | "Project" | "TaskTemplate";
  targetId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  actorRole: "admin" | "intern";
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetModel: {
      type: String,
      required: true,
      enum: ["User", "Task", "Submission", "DocumentTemplate", "IssuedDocument", "Project", "TaskTemplate"],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    actorRole: {
      type: String,
      enum: ["admin", "intern"],
      required: true,
    },
    changes: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-only
  }
);

AuditLogSchema.index({ targetModel: 1, targetId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLogDocument> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLogDocument>("AuditLog", AuditLogSchema);
