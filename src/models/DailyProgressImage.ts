import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDailyProgressImageDocument extends Document {
  taskId: mongoose.Types.ObjectId;
  internId: mongoose.Types.ObjectId;
  cloudinaryPublicId: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  caption?: string;
  uploadedAt: Date;
  expiresAt: Date; // Exactly 24 hours after uploadedAt
  isDeleted: boolean; // Set to true after verified deletion from Cloudinary
  deletedAt?: Date;
  cleanupRetryCount: number;
  lastCleanupError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyProgressImageSchema = new Schema<IDailyProgressImageDocument>(
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
    cloudinaryPublicId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    cleanupRetryCount: {
      type: Number,
      default: 0,
    },
    lastCleanupError: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for active image lookup and cleanup queries
DailyProgressImageSchema.index({ taskId: 1, isDeleted: 1, expiresAt: 1 });
DailyProgressImageSchema.index({ isDeleted: 1, expiresAt: 1 });

export const DailyProgressImage: Model<IDailyProgressImageDocument> =
  mongoose.models.DailyProgressImage ||
  mongoose.model<IDailyProgressImageDocument>("DailyProgressImage", DailyProgressImageSchema);
