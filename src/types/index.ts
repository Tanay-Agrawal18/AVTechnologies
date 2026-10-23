export type UserRole = "admin" | "intern";

export type UserStatus = "active" | "inactive" | "pending_setup";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  internId?: string; // e.g. AV-2026-001 (required for interns)
  department?: string;
  designation?: string;
  phone?: string;
  startDate?: string; // ISO date string
  endDate?: string;
  passwordHash?: string;
  activationToken?: string;
  activationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "changes_requested"
  | "approved";

export interface ITask {
  _id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedInternId: string; // Mongo User ID ref
  assignedInternSnapshot?: {
    name: string;
    email: string;
    internId: string;
  };
  taskGroupId?: string;
  assignmentDate: Date;
  dueDate: Date;
  isArchived: boolean;
  createdByAdminId: string; // Mongo User ID ref
  createdAt: Date;
  updatedAt: Date;
}

export type TaskEventType =
  | "created"
  | "status_changed"
  | "reassigned"
  | "deadline_changed"
  | "submitted"
  | "review_requested_changes"
  | "review_approved"
  | "archived"
  | "unarchived";

export interface ITaskEvent {
  _id: string;
  taskId: string;
  eventType: TaskEventType;
  actorId: string;
  actorRole: UserRole;
  actorName: string;
  previousValue?: string | Record<string, unknown>;
  newValue?: string | Record<string, unknown>;
  note?: string;
  timestamp: Date;
}

export interface ISubmissionAttachment {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ISubmission {
  _id: string;
  taskId: string;
  internId: string;
  version: number;
  workDescription: string;
  externalLinks: string[];
  attachments: ISubmissionAttachment[];
  reviewStatus: "pending" | "changes_requested" | "approved";
  adminFeedback?: string;
  reviewedByAdminId?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  internId?: string;
  status: UserStatus;
}
