import { z } from "zod";

export const UserRoleSchema = z.enum(["admin", "intern"]);
export const UserStatusSchema = z.enum(["active", "inactive", "pending_setup"]);
export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const TaskStatusSchema = z.enum([
  "assigned",
  "in_progress",
  "submitted",
  "changes_requested",
  "approved",
  "unassigned",
  "transferred",
]);

export const LoginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const PasswordSetupSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/[a-z]/, "Password must include at least one lowercase letter")
    .regex(/[0-9]/, "Password must include at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const CreateInternSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  internId: z
    .string()
    .trim()
    .regex(/^(?:VYOR|AV)/i, "Intern ID must start with 'VYOR' or 'AV' (e.g. VYOR-26-01)")
    .optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export const UpdateInternSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().trim().email("Invalid email address").optional(),
  internId: z
    .string()
    .trim()
    .regex(/^(?:VYOR|AV)/i, "Intern ID must start with 'VYOR' or 'AV' (e.g. VYOR-26-01)")
    .optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  status: UserStatusSchema.optional(),
});

export const CreateTaskSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
    description: z.string().trim().min(10, "Description must be at least 10 characters"),
    priority: TaskPrioritySchema.default("medium"),
    assignedInternId: z.string().optional(),
    assignedInternIds: z.array(z.string().min(1)).optional(),
    projectId: z.string().optional(),
    assignmentDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid assignment date"),
    dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid due date"),
  })
  .refine(
    (data) => Boolean(data.assignedInternId || (data.assignedInternIds && data.assignedInternIds.length > 0)),
    {
      message: "At least one intern must be assigned",
      path: ["assignedInternId"],
    }
  )
  .refine(
    (data) => new Date(data.dueDate) >= new Date(data.assignmentDate),
    {
      message: "Due date cannot be before assignment date",
      path: ["dueDate"],
    }
  );

export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).optional(),
  priority: TaskPrioritySchema.optional(),
  assignedInternId: z.string().optional(),
  projectId: z.string().nullable().optional(),
  assignmentDate: z.string().optional(),
  dueDate: z.string().optional(),
  isArchived: z.boolean().optional(),
});

export const UnassignTaskSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const TransferTaskSchema = z.object({
  newInternId: z.string().trim().min(1, "New intern must be selected"),
  reason: z.string().trim().min(3, "Transfer reason must be at least 3 characters").max(500),
});

export const ProjectStatusSchema = z.enum(["planning", "in_progress", "completed", "on_hold"]);

export const CreateProjectSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
    description: z.string().trim().min(10, "Description must be at least 10 characters"),
    teamMemberIds: z
      .array(z.string().min(1))
      .min(2, "Collaborative projects require at least 2 team members"),
    status: ProjectStatusSchema.default("planning"),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
    dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid due date"),
  })
  .refine(
    (data) => new Date(data.dueDate) >= new Date(data.startDate),
    {
      message: "Due date cannot be before start date",
      path: ["dueDate"],
    }
  );

export const UpdateProjectSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).optional(),
  status: ProjectStatusSchema.optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export const ManageProjectMemberSchema = z.object({
  action: z.enum(["add", "remove"]),
  internId: z.string().trim().min(1, "Intern ID is required"),
  reason: z.string().trim().max(500).optional(),
});

export const InternStatusUpdateSchema = z.object({
  status: z.enum(["in_progress"]),
});

export const CreateSubmissionSchema = z.object({
  workDescription: z
    .string()
    .trim()
    .min(10, "Work description must be at least 10 characters"),
  externalLinks: z
    .array(z.string().trim().url("Invalid URL format"))
    .default([]),
  attachments: z
    .array(
      z.object({
        fileKey: z.string(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      })
    )
    .default([]),
});

export const ReviewSubmissionSchema = z.object({
  decision: z.enum(["approve", "request_changes"]),
  feedback: z.string().trim().min(3, "Feedback must be provided"),
});
