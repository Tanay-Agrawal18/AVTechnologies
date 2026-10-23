import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Project, IProjectDocument } from "@/models/Project";
import { Task, ITaskDocument } from "@/models/Task";
import { TaskEvent } from "@/models/TaskEvent";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { SessionUser, ProjectStatus, TaskPriority } from "@/types";

export interface CreateProjectInput {
  title: string;
  description: string;
  teamMemberIds: string[];
  status?: ProjectStatus;
  startDate: string;
  dueDate: string;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  dueDate?: string;
}

export interface ManageMemberInput {
  action: "add" | "remove";
  internId: string;
  reason?: string;
}

export interface CreateProjectTaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  assignedInternId: string;
  assignmentDate: string;
  dueDate: string;
}

export interface ProjectProgressSummary {
  totalTasks: number;
  assigned: number;
  inProgress: number;
  submitted: number;
  changesRequested: number;
  approved: number;
  unassigned: number;
  transferred: number;
  completionPercentage: number;
}

export class ProjectService {
  static async createProject(
    data: CreateProjectInput,
    actor: SessionUser
  ): Promise<IProjectDocument> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can create team projects");
    }

    await connectDB();

    const uniqueMemberIds = Array.from(new Set(data.teamMemberIds));
    if (uniqueMemberIds.length < 2) {
      throw new Error("Collaborative projects require at least 2 team members");
    }

    const interns = await User.find({
      _id: { $in: uniqueMemberIds },
      role: "intern",
    });

    if (interns.length !== uniqueMemberIds.length) {
      throw new Error("One or more team members were not found or are not interns");
    }

    const teamMembers = uniqueMemberIds.map((id) => ({
      internId: new mongoose.Types.ObjectId(id),
      joinedAt: new Date(),
      addedByAdminId: new mongoose.Types.ObjectId(actor.id),
    }));

    const project = await Project.create({
      title: data.title,
      description: data.description,
      status: data.status || "planning",
      startDate: new Date(data.startDate),
      dueDate: new Date(data.dueDate),
      teamMembers,
      removedMembers: [],
      createdByAdminId: new mongoose.Types.ObjectId(actor.id),
    });

    await AuditLog.create({
      action: "project_created",
      targetModel: "Project",
      targetId: project._id,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      metadata: {
        title: project.title,
        membersCount: teamMembers.length,
        memberNames: interns.map((i) => i.name),
      },
    });

    return project;
  }

  static async getProjects(
    actor: SessionUser,
    statusFilter?: string
  ): Promise<IProjectDocument[]> {
    await connectDB();

    const query: Record<string, unknown> = {};

    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }

    // Role-based filtering:
    // Admin sees all projects
    // Intern only sees projects where they are currently a team member or a past member
    if (actor.role === "intern") {
      query.$or = [
        { "teamMembers.internId": new mongoose.Types.ObjectId(actor.id) },
        { "removedMembers.internId": new mongoose.Types.ObjectId(actor.id) },
      ];
    }

    const projects = await Project.find(query)
      .populate("teamMembers.internId", "name email internId department status")
      .populate("removedMembers.internId", "name email internId department")
      .sort({ createdAt: -1 });

    return projects;
  }

  static async getProjectById(
    projectId: string,
    actor: SessionUser
  ): Promise<{
    project: IProjectDocument;
    tasks: ITaskDocument[];
    progress: ProjectProgressSummary;
  }> {
    await connectDB();

    const project = await Project.findById(projectId)
      .populate("teamMembers.internId", "name email internId department status")
      .populate("removedMembers.internId", "name email internId department")
      .populate("createdByAdminId", "name email");

    if (!project) {
      throw new Error("Project not found");
    }

    // Authorization guard
    if (actor.role === "intern") {
      const isMember = project.teamMembers.some(
        (m) => m.internId && m.internId._id.toString() === actor.id
      );
      const isPastMember = project.removedMembers.some(
        (m) => m.internId && m.internId._id.toString() === actor.id
      );

      if (!isMember && !isPastMember) {
        throw new Error("Access denied: You are not authorized to view this project");
      }
    }

    // Fetch tasks linked to this project
    const tasks = await Task.find({ projectId: project._id })
      .populate("assignedInternId", "name email internId department")
      .sort({ createdAt: -1 });

    // Compute progress stats
    let assigned = 0;
    let inProgress = 0;
    let submitted = 0;
    let changesRequested = 0;
    let approved = 0;
    let unassigned = 0;
    let transferred = 0;

    tasks.forEach((t) => {
      switch (t.status) {
        case "assigned":
          assigned++;
          break;
        case "in_progress":
          inProgress++;
          break;
        case "submitted":
          submitted++;
          break;
        case "changes_requested":
          changesRequested++;
          break;
        case "approved":
          approved++;
          break;
        case "unassigned":
          unassigned++;
          break;
        case "transferred":
          transferred++;
          break;
      }
    });

    const activeTasksCount = assigned + inProgress + submitted + changesRequested + approved;
    const completionPercentage =
      activeTasksCount > 0 ? Math.round((approved / activeTasksCount) * 100) : 0;

    const progress: ProjectProgressSummary = {
      totalTasks: tasks.length,
      assigned,
      inProgress,
      submitted,
      changesRequested,
      approved,
      unassigned,
      transferred,
      completionPercentage,
    };

    return { project, tasks, progress };
  }

  static async updateProject(
    projectId: string,
    data: UpdateProjectInput,
    actor: SessionUser
  ): Promise<IProjectDocument> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can update project details");
    }

    await connectDB();
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (data.title && data.title !== project.title) {
      changes.title = { from: project.title, to: data.title };
      project.title = data.title;
    }

    if (data.description && data.description !== project.description) {
      changes.description = { from: project.description, to: data.description };
      project.description = data.description;
    }

    if (data.status && data.status !== project.status) {
      changes.status = { from: project.status, to: data.status };
      project.status = data.status;
    }

    if (data.startDate) {
      project.startDate = new Date(data.startDate);
    }

    if (data.dueDate) {
      project.dueDate = new Date(data.dueDate);
    }

    await project.save();

    if (Object.keys(changes).length > 0) {
      await AuditLog.create({
        action: "project_updated",
        targetModel: "Project",
        targetId: project._id,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        changes,
      });
    }

    return project;
  }

  static async manageTeamMember(
    projectId: string,
    data: ManageMemberInput,
    actor: SessionUser
  ): Promise<IProjectDocument> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can modify project team members");
    }

    await connectDB();
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const targetUser = await User.findOne({ _id: data.internId, role: "intern" });
    if (!targetUser) {
      throw new Error("Target intern does not exist");
    }

    if (data.action === "add") {
      // Check if already an active member
      const exists = project.teamMembers.some(
        (m) => m.internId.toString() === targetUser._id.toString()
      );
      if (exists) {
        throw new Error(`Intern '${targetUser.name}' is already an active member of this project`);
      }

      project.teamMembers.push({
        internId: targetUser._id as mongoose.Types.ObjectId,
        joinedAt: new Date(),
        addedByAdminId: new mongoose.Types.ObjectId(actor.id),
      });

      await project.save();

      await AuditLog.create({
        action: "project_member_added",
        targetModel: "Project",
        targetId: project._id,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        metadata: {
          internId: targetUser._id.toString(),
          internName: targetUser.name,
          reason: data.reason || "Added to project team",
        },
      });
    } else if (data.action === "remove") {
      const memberIndex = project.teamMembers.findIndex(
        (m) => m.internId.toString() === targetUser._id.toString()
      );
      if (memberIndex === -1) {
        throw new Error(`Intern '${targetUser.name}' is not currently in this project team`);
      }

      // Remove from teamMembers
      project.teamMembers.splice(memberIndex, 1);

      // Record in removedMembers without deleting past work or task history
      project.removedMembers.push({
        internId: targetUser._id as mongoose.Types.ObjectId,
        removedAt: new Date(),
        reason: data.reason?.trim() || "Removed by administrator",
        removedByAdminId: new mongoose.Types.ObjectId(actor.id),
      });

      await project.save();

      await AuditLog.create({
        action: "project_member_removed",
        targetModel: "Project",
        targetId: project._id,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        metadata: {
          internId: targetUser._id.toString(),
          internName: targetUser.name,
          reason: data.reason || "Removed from project team",
        },
      });
    }

    return project;
  }

  static async createProjectTask(
    projectId: string,
    data: CreateProjectTaskInput,
    actor: SessionUser
  ): Promise<ITaskDocument> {
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can assign project tasks");
    }

    await connectDB();
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Verify assigned intern is part of project team
    const isMember = project.teamMembers.some(
      (m) => m.internId.toString() === data.assignedInternId
    );
    if (!isMember) {
      throw new Error("The assigned intern must be an active member of this project team");
    }

    const intern = await User.findOne({ _id: data.assignedInternId, role: "intern" });
    if (!intern) {
      throw new Error("Assigned intern was not found");
    }

    const task = await Task.create({
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: "assigned",
      assignedInternId: intern._id,
      assignedInternSnapshot: {
        name: intern.name,
        email: intern.email,
        internId: intern.internId || "",
      },
      projectId: project._id,
      assignmentDate: new Date(data.assignmentDate),
      dueDate: new Date(data.dueDate),
      isArchived: false,
      createdByAdminId: new mongoose.Types.ObjectId(actor.id),
    });

    await TaskEvent.create({
      taskId: task._id,
      eventType: "created",
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name,
      newValue: {
        title: task.title,
        priority: task.priority,
        status: task.status,
        assignedTo: intern.name,
        projectId: project._id.toString(),
      },
      note: `Project task created and assigned to ${intern.name}`,
      timestamp: new Date(),
    });

    await TaskEvent.create({
      taskId: task._id,
      eventType: "project_linked",
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name,
      newValue: project._id.toString(),
      note: `Linked to project: ${project.title}`,
      timestamp: new Date(),
    });

    return task;
  }
}
