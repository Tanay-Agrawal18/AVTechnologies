import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, IUserDocument } from "@/models/User";
import { SessionUser } from "@/types";

export interface CreateInternInput {
  name: string;
  email: string;
  internId?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
}

export class UserService {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateSecureToken(): { token: string; hashedToken: string } {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    return { token: rawToken, hashedToken };
  }

  static async generateNextInternId(): Promise<string> {
    await connectDB();
    const currentYear = new Date().getFullYear();
    const shortYear = String(currentYear).slice(-2); // e.g. "26" for 2026
    const prefix = `VYOR-${shortYear}-`;

    // Fetch all interns who have an internId
    const interns = await User.find(
      { role: "intern", internId: { $exists: true, $ne: "" } },
      { internId: 1 }
    ).lean();

    let maxNum = 0;
    for (const intern of interns) {
      if (!intern.internId) continue;
      // Match VYOR-YY-NN (or VYOR-YYYY-NN, or legacy prefixes)
      const matchVyor = intern.internId.match(new RegExp(`^VYOR-(?:${shortYear}|${currentYear})-(\\d+)$`, "i"));
      if (matchVyor) {
        const num = parseInt(matchVyor[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      } else {
        const matchAnyVyor = intern.internId.match(/^VYOR-\d+-(\d+)$/i);
        if (matchAnyVyor) {
          const num = parseInt(matchAnyVyor[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    let nextNum = maxNum + 1;
    // Format as 2-digit padded number (01, 02, ... 10, etc.)
    let candidate = `${prefix}${String(nextNum).padStart(2, "0")}`;

    // Ensure uniqueness in case of race condition or custom formatted ids
    while (await User.exists({ internId: candidate })) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(2, "0")}`;
    }

    return candidate;
  }

  static async authenticateUser(email: string, password: string): Promise<SessionUser | null> {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");

    if (!user || !user.passwordHash) {
      return null;
    }

    if (user.status !== "active") {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    user.lastLoginAt = new Date();
    await user.save();

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      internId: user.internId,
      status: user.status,
    };
  }

  static async createIntern(
    data: CreateInternInput
  ): Promise<{ intern: IUserDocument; activationToken: string }> {
    await connectDB();

    const existingEmail = await User.findOne({ email: data.email.toLowerCase() });
    if (existingEmail) {
      throw new Error(`Email ${data.email} is already in use`);
    }

    const assignedInternId = data.internId?.trim() || (await this.generateNextInternId());

    const existingInternId = await User.findOne({ internId: assignedInternId });
    if (existingInternId) {
      throw new Error(`Intern ID ${assignedInternId} already exists`);
    }

    const { token, hashedToken } = this.generateSecureToken();
    const activationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const intern = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      role: "intern",
      status: "pending_setup",
      internId: assignedInternId,
      department: data.department,
      startDate: data.startDate,
      endDate: data.endDate,
      activationToken: hashedToken,
      activationExpires,
    });

    return { intern, activationToken: token };
  }

  static async activateAccount(token: string, password: string): Promise<IUserDocument> {
    await connectDB();
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      $or: [
        {
          activationToken: hashedToken,
          activationExpires: { $gt: new Date() },
        },
        {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: { $gt: new Date() },
        },
      ],
    }).select("+activationToken +activationExpires +resetPasswordToken +resetPasswordExpires");

    if (!user) {
      throw new Error("Invalid or expired setup token");
    }

    const passwordHash = await this.hashPassword(password);
    user.passwordHash = passwordHash;
    user.status = "active";
    user.activationToken = undefined;
    user.activationExpires = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    return user;
  }

  static async generatePasswordResetLink(userId: string): Promise<string> {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const { token, hashedToken } = this.generateSecureToken();
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    return token;
  }

  static async toggleInternStatus(
    userId: string,
    targetStatus: "active" | "inactive"
  ): Promise<IUserDocument> {
    await connectDB();
    const user = await User.findById(userId);
    if (!user || user.role !== "intern") {
      throw new Error("Intern not found");
    }

    user.status = targetStatus;
    await user.save();
    return user;
  }

  static async deleteIntern(
    internId: string,
    actorAdmin: { id: string; name: string; role: "admin" }
  ): Promise<{
    deletedIntern: { id: string; name: string; email: string; internId?: string };
    deletedTasksCount: number;
    deletedSubmissionsCount: number;
    deletedFilesCount: number;
    deletedImagesCount: number;
    deletedDocsCount: number;
  }> {
    await connectDB();
    const { Task } = await import("@/models/Task");
    const { TaskEvent } = await import("@/models/TaskEvent");
    const { Submission } = await import("@/models/Submission");
    const { DailyProgressImage } = await import("@/models/DailyProgressImage");
    const { IssuedDocument } = await import("@/models/IssuedDocument");
    const { EmailLog } = await import("@/models/EmailLog");
    const { Project } = await import("@/models/Project");
    const { AuditLog } = await import("@/models/AuditLog");
    const { getStorageAdapter } = await import("@/lib/storage");
    const { deleteFromCloudinary, isCloudinaryConfigured } = await import("@/lib/cloudinary");

    const intern = await User.findOne({ _id: internId, role: "intern" });
    if (!intern) {
      throw new Error("Intern not found");
    }

    const storage = getStorageAdapter();
    let deletedFilesCount = 0;
    let deletedImagesCount = 0;

    // 1. Find all submissions by this intern or linked to their tasks to clean up files
    const internTasks = await Task.find({
      $or: [{ assignedInternId: intern._id }, { transferredToInternId: intern._id }],
    }).select("_id");
    const taskIds = internTasks.map((t) => t._id);

    const submissions = await Submission.find({
      $or: [{ internId: intern._id }, { taskId: { $in: taskIds } }],
    });

    for (const sub of submissions) {
      if (sub.attachments && sub.attachments.length > 0) {
        for (const att of sub.attachments) {
          if (att.fileKey) {
            try {
              await storage.deleteFile(att.fileKey);
              deletedFilesCount++;
            } catch (err) {
              console.error(`Failed to delete storage file ${att.fileKey}:`, err);
            }
          }
        }
      }
    }

    // 2. Find and delete daily progress images from Cloudinary & DB
    const progressImages = await DailyProgressImage.find({
      $or: [{ internId: intern._id }, { taskId: { $in: taskIds } }],
    });

    const hasCloudinary = isCloudinaryConfigured();
    for (const img of progressImages) {
      if (hasCloudinary && img.cloudinaryPublicId) {
        try {
          await deleteFromCloudinary(img.cloudinaryPublicId);
        } catch (err) {
          console.error(`Failed to delete Cloudinary image ${img.cloudinaryPublicId}:`, err);
        }
      }
      deletedImagesCount++;
    }
    await DailyProgressImage.deleteMany({
      $or: [{ internId: intern._id }, { taskId: { $in: taskIds } }],
    });

    // 3. Delete Submissions
    const subRes = await Submission.deleteMany({
      $or: [{ internId: intern._id }, { taskId: { $in: taskIds } }],
    });

    // 4. Delete TaskEvents for these tasks or where intern was actor
    await TaskEvent.deleteMany({
      $or: [{ taskId: { $in: taskIds } }, { actorId: intern._id }],
    });

    // 5. Delete Tasks
    const taskRes = await Task.deleteMany({
      $or: [{ assignedInternId: intern._id }, { transferredToInternId: intern._id }],
    });

    // 6. Delete IssuedDocuments (Offer letters, certificates, etc.)
    const docRes = await IssuedDocument.deleteMany({ recipientInternId: intern._id });

    // 7. Delete Email Logs
    await EmailLog.deleteMany({
      $or: [{ recipientId: intern._id }, { recipientEmail: intern.email.toLowerCase() }],
    });

    // 8. Remove intern from Project teamMembers and removedMembers arrays
    await Project.updateMany(
      {
        $or: [
          { "teamMembers.internId": intern._id },
          { "removedMembers.internId": intern._id },
        ],
      },
      {
        $pull: {
          teamMembers: { internId: intern._id },
          removedMembers: { internId: intern._id },
        },
      }
    );

    // 9. Delete the User record
    await User.findByIdAndDelete(intern._id);

    // 10. Audit Log
    await AuditLog.create({
      action: "intern_deleted",
      targetModel: "User",
      targetId: intern._id,
      actorId: actorAdmin.id,
      actorName: actorAdmin.name,
      actorRole: actorAdmin.role,
      metadata: {
        deletedInternName: intern.name,
        deletedInternEmail: intern.email,
        deletedInternId: intern.internId,
        tasksDeleted: taskRes.deletedCount,
        submissionsDeleted: subRes.deletedCount,
        docsDeleted: docRes.deletedCount,
        filesDeleted: deletedFilesCount,
      },
    });

    return {
      deletedIntern: {
        id: intern._id.toString(),
        name: intern.name,
        email: intern.email,
        internId: intern.internId,
      },
      deletedTasksCount: taskRes.deletedCount,
      deletedSubmissionsCount: subRes.deletedCount,
      deletedFilesCount,
      deletedImagesCount,
      deletedDocsCount: docRes.deletedCount,
    };
  }

  static async deleteAllInterns(
    actorAdmin: { id: string; name: string; role: "admin" }
  ): Promise<{
    deletedInternsCount: number;
    deletedTasksCount: number;
    deletedSubmissionsCount: number;
    deletedFilesCount: number;
    deletedImagesCount: number;
    deletedDocsCount: number;
  }> {
    await connectDB();
    const interns = await User.find({ role: "intern" }).select("_id");
    let totalTasks = 0;
    let totalSubmissions = 0;
    let totalFiles = 0;
    let totalImages = 0;
    let totalDocs = 0;

    for (const intern of interns) {
      const res = await this.deleteIntern(intern._id.toString(), actorAdmin);
      totalTasks += res.deletedTasksCount;
      totalSubmissions += res.deletedSubmissionsCount;
      totalFiles += res.deletedFilesCount;
      totalImages += res.deletedImagesCount;
      totalDocs += res.deletedDocsCount;
    }

    return {
      deletedInternsCount: interns.length,
      deletedTasksCount: totalTasks,
      deletedSubmissionsCount: totalSubmissions,
      deletedFilesCount: totalFiles,
      deletedImagesCount: totalImages,
      deletedDocsCount: totalDocs,
    };
  }
}
