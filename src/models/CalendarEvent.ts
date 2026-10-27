import mongoose, { Schema, Document, Model } from "mongoose";
import {
  CalendarEventType,
  CalendarAudienceType,
  CalendarEventStatus,
} from "@/types";

export interface ICalendarEventDocument extends Document {
  title: string;
  description?: string;
  type: CalendarEventType;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  location?: string;
  meetingUrl?: string;
  audienceType: CalendarAudienceType;
  targetInternIds?: mongoose.Types.ObjectId[];
  targetDepartment?: string;
  status: CalendarEventStatus;
  publishedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdByAdminId: mongoose.Types.ObjectId;
  lastModifiedByAdminId: mongoose.Types.ObjectId;
  notificationSentVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema = new Schema<ICalendarEventDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      required: true,
      enum: ["holiday", "meeting", "event", "notice"],
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    isAllDay: {
      type: Boolean,
      default: false,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    meetingUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    audienceType: {
      type: String,
      required: true,
      enum: ["all", "individual", "department"],
      default: "all",
      index: true,
    },
    targetInternIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    targetDepartment: {
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["draft", "published", "cancelled"],
      default: "draft",
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    createdByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lastModifiedByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notificationSentVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for rapid date-range & audience lookups
CalendarEventSchema.index({ status: 1, startDate: 1, endDate: 1 });
CalendarEventSchema.index({ status: 1, audienceType: 1, targetDepartment: 1 });
CalendarEventSchema.index({ status: 1, audienceType: 1, targetInternIds: 1 });

export const CalendarEvent: Model<ICalendarEventDocument> =
  mongoose.models.CalendarEvent ||
  mongoose.model<ICalendarEventDocument>("CalendarEvent", CalendarEventSchema);
