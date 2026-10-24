import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, IUserDocument } from "@/models/User";
import { SessionUser } from "@/types";

export interface CreateInternInput {
  name: string;
  email: string;
  internId: string;
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

    const existingInternId = await User.findOne({ internId: data.internId });
    if (existingInternId) {
      throw new Error(`Intern ID ${data.internId} already exists`);
    }

    const { token, hashedToken } = this.generateSecureToken();
    const activationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const intern = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      role: "intern",
      status: "pending_setup",
      internId: data.internId,
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
}
