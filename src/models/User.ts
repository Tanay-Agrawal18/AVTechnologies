import mongoose, { Schema, Document, Model } from "mongoose";
import { UserRole, UserStatus } from "@/types";

export interface IUserDocument extends Document {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  internId?: string;
  department?: string;
  designation?: string;
  phone?: string;
  address?: string;
  college?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  bio?: string;
  startDate?: string;
  endDate?: string;
  certificateUrl?: string; // Google Drive link or verified document URL
  profilePicture?: string;
  profilePicturePublicId?: string;
  passwordHash?: string;
  activationToken?: string;
  activationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLoginAt?: Date;
  onboardingCompleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "intern"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending_setup"],
      default: "pending_setup",
      index: true,
    },
    internId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      index: true,
    },
    department: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    college: {
      type: String,
      trim: true,
    },
    githubUrl: {
      type: String,
      trim: true,
    },
    linkedinUrl: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    startDate: {
      type: String,
    },
    endDate: {
      type: String,
    },
    certificateUrl: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String,
      trim: true,
    },
    profilePicturePublicId: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      select: false, // excluded by default for security
    },
    activationToken: {
      type: String,
      select: false,
      index: true,
    },
    activationExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
      index: true,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Explicit compound index for fast active intern filtering
UserSchema.index({ role: 1, status: 1 });

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);
