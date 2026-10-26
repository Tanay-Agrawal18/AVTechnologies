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
  address?: string;
  college?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  bio?: string;
  startDate?: string; // ISO date string
  endDate?: string;
  profilePicture?: string;
  profilePicturePublicId?: string;
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
  | "approved"
  | "unassigned"
  | "transferred";

export interface ITask {
  _id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedInternId?: string; // Mongo User ID ref (optional if unassigned)
  assignedInternSnapshot?: {
    name: string;
    email: string;
    internId: string;
  };
  taskGroupId?: string;
  projectId?: string; // Optional reference to collaborative Project
  assignmentDate: Date;
  dueDate: Date;
  isArchived: boolean;
  createdByAdminId: string; // Mongo User ID ref
  unassignedAt?: Date;
  unassignedReason?: string;
  unassignedByAdminId?: string;
  transferredAt?: Date;
  transferredToInternId?: string;
  transferredReason?: string;
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
  | "unarchived"
  | "unassigned"
  | "transferred"
  | "project_linked"
  | "project_unlinked";

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

export type ProjectStatus = "planning" | "in_progress" | "completed" | "on_hold";

export interface IProjectMember {
  internId: string;
  joinedAt: Date;
  addedByAdminId: string;
}

export interface IProjectRemovedMember {
  internId: string;
  removedAt: Date;
  reason?: string;
  removedByAdminId: string;
}

export interface IProject {
  _id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  startDate: Date;
  dueDate: Date;
  teamMembers: IProjectMember[];
  removedMembers: IProjectRemovedMember[];
  createdByAdminId: string;
  createdAt: Date;
  updatedAt: Date;
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
  profilePicture?: string;
  phone?: string;
  address?: string;
  college?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  bio?: string;
  department?: string;
  designation?: string;
}

export type NotificationType =
  | "task_assigned"
  | "task_submitted"
  | "submission_approved"
  | "submission_changes_requested"
  | "deadline_approaching"
  | "deadline_overdue"
  | "task_reassigned";

export interface INotification {
  _id: string;
  recipientId: string;
  actorId?: string;
  actorName?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: Date;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskTemplate {
  _id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  defaultDueDaysOffset?: number | null;
  tags?: string[];
  isActive: boolean;
  usageCount: number;
  createdByAdminId: string;
  createdAt: Date;
  updatedAt: Date;
}
