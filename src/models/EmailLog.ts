import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmailLogDocument extends Document {
  batchId: string;
  recipientId?: mongoose.Types.ObjectId;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyPreview: string;
  provider: string; // e.g., "smtp", "sendgrid", "resend", "ses", "unconfigured"
  status: "queued" | "sent" | "delivered" | "failed";
  providerMessageId?: string;
  errorDetails?: string;
  retryCount: number;
  sentAt?: Date;
  deliveredAt?: Date;
  sentByAdminId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema = new Schema<IEmailLogDocument>(
  {
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      index: true,
    },
    recipientName: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    bodyPreview: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
      default: "smtp",
    },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "failed"],
      default: "queued",
      index: true,
    },
    providerMessageId: {
      type: String,
    },
    errorDetails: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    sentByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

EmailLogSchema.index({ batchId: 1, recipientEmail: 1 });
EmailLogSchema.index({ createdAt: -1 });

export const EmailLog: Model<IEmailLogDocument> =
  mongoose.models.EmailLog ||
  mongoose.model<IEmailLogDocument>("EmailLog", EmailLogSchema);
