import * as XLSX from "xlsx";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { getOrSetCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export interface ReportFilter {
  internId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  includeArchived?: boolean;
}

export interface KPIStats {
  activeInterns: number;
  totalTasks: number;
  assigned: number;
  inProgress: number;
  submitted: number;
  approved: number;
  changesRequested: number;
  unassigned: number;
  transferred: number;
  overdue: number;
}

export class ReportService {
  static async getKPIStats(): Promise<KPIStats> {
    return getOrSetCache(
      CACHE_KEYS.adminKpis(),
      CACHE_TTL.ADMIN_KPIS,
      async () => {
        await connectDB();

        const activeInterns = await User.countDocuments({
          role: "intern",
          status: "active",
        });

        const now = new Date();

        const [
          totalTasks,
          assigned,
          inProgress,
          submitted,
          approved,
          changesRequested,
          unassigned,
          transferred,
          overdue,
        ] = await Promise.all([
          Task.countDocuments({ isArchived: false }),
          Task.countDocuments({ isArchived: false, status: "assigned" }),
          Task.countDocuments({ isArchived: false, status: "in_progress" }),
          Task.countDocuments({ isArchived: false, status: "submitted" }),
          Task.countDocuments({ isArchived: false, status: "approved" }),
          Task.countDocuments({ isArchived: false, status: "changes_requested" }),
          Task.countDocuments({ isArchived: false, status: "unassigned" }),
          Task.countDocuments({ isArchived: false, status: "transferred" }),
          Task.countDocuments({
            isArchived: false,
            status: { $nin: ["approved", "unassigned", "transferred"] },
            dueDate: { $lt: now },
          }),
        ]);

        return {
          activeInterns,
          totalTasks,
          assigned,
          inProgress,
          submitted,
          approved,
          changesRequested,
          unassigned,
          transferred,
          overdue,
        };
      }
    );
  }

  static async getFilteredTasks(filter: ReportFilter) {
    await connectDB();

    const query: Record<string, unknown> = {};

    if (!filter.includeArchived) {
      query.isArchived = false;
    }

    if (filter.internId && filter.internId !== "all") {
      query.assignedInternId = filter.internId;
    }

    if (filter.status && filter.status !== "all") {
      query.status = filter.status;
    }

    if (filter.startDate || filter.endDate) {
      query.createdAt = {};
      if (filter.startDate) {
        (query.createdAt as Record<string, unknown>)["$gte"] = new Date(filter.startDate);
      }
      if (filter.endDate) {
        (query.createdAt as Record<string, unknown>)["$lte"] = new Date(filter.endDate);
      }
    }

    const tasks = await Task.find(query)
      .populate("assignedInternId", "name email internId department")
      .sort({ createdAt: -1 })
      .lean();

    return tasks;
  }

  static async generateTasksCSV(filter: ReportFilter): Promise<Buffer> {
    const tasks = await this.getFilteredTasks(filter);

    const exportRows = tasks.map((t) => {
      const intern = t.assignedInternId as unknown as {
        name?: string;
        email?: string;
        internId?: string;
      };

      return {
        "Task ID": t._id.toString(),
        "Title": t.title,
        "Priority": t.priority,
        "Status": t.status,
        "Intern Name": intern?.name || t.assignedInternSnapshot?.name || "N/A",
        "Intern Email": intern?.email || t.assignedInternSnapshot?.email || "N/A",
        "Intern ID": intern?.internId || t.assignedInternSnapshot?.internId || "N/A",
        "Assignment Date": t.assignmentDate ? new Date(t.assignmentDate).toISOString().split("T")[0] : "",
        "Due Date": t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "",
        "Archived": t.isArchived ? "Yes" : "No",
        "Created At": new Date(t.createdAt).toISOString(),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const csvString = XLSX.utils.sheet_to_csv(worksheet);
    return Buffer.from(csvString, "utf-8");
  }
}
