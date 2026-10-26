import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { Submission } from "@/models/Submission";
import { User } from "@/models/User";
import { TaskStatus } from "@/types";
import { getOrSetCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export interface AdminAnalyticsFilter {
  startDate?: string;
  endDate?: string;
  department?: string;
  internId?: string;
}

export interface StatusCounts {
  assigned: number;
  inProgress: number;
  submitted: number;
  changesRequested: number;
  approved: number;
  unassigned: number;
  transferred: number;
  total: number;
}

export interface InternWorkloadItem {
  internId: string;
  name: string;
  email: string;
  department: string;
  assignedCount: number;
  inProgressCount: number;
  submittedCount: number;
  changesRequestedCount: number;
  approvedCount: number;
  overdueCount: number;
  totalAssigned: number;
  completionRate: number; // percentage (0 - 100)
}

export interface DepartmentMetricItem {
  department: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
  completionRate: number; // percentage (0 - 100)
}

export interface DeadlineTaskItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: string;
  assignedIntern?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
}

export interface AdminAnalyticsData {
  statusCounts: StatusCounts;
  rates: {
    completionRate: number; // approved / (total - unassigned - transferred) * 100
    approvalRate: number; // approved / (approved + changesRequested) * 100 (review decisions)
  };
  deadlines: {
    overdueCount: number;
    upcomingDeadlinesCount: number; // due in next 7 days and not approved
    overdueTasks: DeadlineTaskItem[];
    upcomingTasks: DeadlineTaskItem[];
  };
  reviewBacklog: {
    pendingReviewsCount: number; // status === "submitted"
    changesRequestedCount: number;
    approvedCount: number;
  };
  workloadDistribution: InternWorkloadItem[];
  departmentBreakdown: DepartmentMetricItem[];
}

export interface InternAnalyticsData {
  intern: {
    id: string;
    name: string;
    email: string;
    internId?: string;
    department?: string;
  };
  statusCounts: StatusCounts;
  completionRate: number; // approved / (total active assigned to this intern) * 100
  deadlines: {
    overdueCount: number;
    upcomingDeadlinesCount: number; // due in next 7 days
    overdueTasks: DeadlineTaskItem[];
    upcomingTasks: DeadlineTaskItem[];
  };
  recentActivity: Array<{
    id: string;
    taskId: string;
    taskTitle: string;
    version: number;
    reviewStatus: "pending" | "changes_requested" | "approved";
    adminFeedback?: string;
    submittedAt: string;
    reviewedAt?: string;
  }>;
}

export class AnalyticsService {
  /**
   * Team-wide analytics for Admin users.
   * Leverages aggregation pipelines for high performance without in-memory looping.
   */
  static async getAdminAnalytics(filter: AdminAnalyticsFilter = {}): Promise<AdminAnalyticsData> {
    const cacheKey = CACHE_KEYS.adminAnalytics(
      filter.startDate,
      filter.endDate,
      filter.department,
      filter.internId
    );

    return getOrSetCache(
      cacheKey,
      CACHE_TTL.ADMIN_ANALYTICS,
      async () => {
        await connectDB();

        const now = new Date();
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // 1. Base Task Match query
        const baseTaskMatch: Record<string, unknown> = {
          isArchived: false,
        };

        if (filter.internId && filter.internId !== "all" && mongoose.Types.ObjectId.isValid(filter.internId)) {
          baseTaskMatch.assignedInternId = new mongoose.Types.ObjectId(filter.internId);
        }

        if (filter.startDate || filter.endDate) {
          const dateFilter: Record<string, unknown> = {};
          if (filter.startDate) {
            dateFilter.$gte = new Date(filter.startDate);
          }
          if (filter.endDate) {
            dateFilter.$lte = new Date(filter.endDate);
          }
          baseTaskMatch.createdAt = dateFilter;
        }

        // If department filter is supplied, resolve intern IDs belonging to that department
        if (filter.department && filter.department !== "all") {
          const deptInterns = await User.find(
            { role: "intern", department: filter.department },
            { _id: 1 }
          ).lean();
          const deptInternIds = deptInterns.map((u) => u._id);
          baseTaskMatch.assignedInternId = {
            ...(baseTaskMatch.assignedInternId ? { $eq: baseTaskMatch.assignedInternId } : {}),
            $in: deptInternIds,
          };
        }

        // 2. Aggregate Status Counts
        const statusAggregation = await Task.aggregate<{ _id: string; count: number }>([
          { $match: baseTaskMatch },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const statusMap: Record<string, number> = {};
        for (const item of statusAggregation) {
          statusMap[item._id] = item.count;
        }

        const assigned = statusMap["assigned"] || 0;
        const inProgress = statusMap["in_progress"] || 0;
        const submitted = statusMap["submitted"] || 0;
        const changesRequested = statusMap["changes_requested"] || 0;
        const approved = statusMap["approved"] || 0;
        const unassigned = statusMap["unassigned"] || 0;
        const transferred = statusMap["transferred"] || 0;
        const total = assigned + inProgress + submitted + changesRequested + approved + unassigned + transferred;

        const statusCounts: StatusCounts = {
          assigned,
          inProgress,
          submitted,
          changesRequested,
          approved,
          unassigned,
          transferred,
          total,
        };

        // 3. Calculation Rules:
        // completionRate: approved / actionableTasks (total - unassigned - transferred)
        const actionableTasks = total - unassigned - transferred;
        const completionRate =
          actionableTasks > 0 ? Math.round((approved / actionableTasks) * 100) : 0;

        // approvalRate: approved / (approved + changesRequested) (of all decisions rendered)
        const totalEvaluated = approved + changesRequested;
        const approvalRate =
          totalEvaluated > 0 ? Math.round((approved / totalEvaluated) * 100) : 0;

        // 4. Overdue and Upcoming Deadlines
        const excludedStatuses: TaskStatus[] = ["approved", "unassigned", "transferred"];
        const overdueQuery: Record<string, unknown> = {
          ...baseTaskMatch,
          status: { $nin: excludedStatuses },
          dueDate: { $lt: now },
        };

        const upcomingQuery: Record<string, unknown> = {
          ...baseTaskMatch,
          status: { $nin: excludedStatuses },
          dueDate: { $gte: now, $lte: next7Days },
        };

        const [overdueCount, upcomingCount, overdueTasksRaw, upcomingTasksRaw] =
          await Promise.all([
            Task.countDocuments(overdueQuery),
            Task.countDocuments(upcomingQuery),
            Task.find(overdueQuery)
              .populate("assignedInternId", "name email department")
              .sort({ dueDate: 1 })
              .limit(8)
              .lean(),
            Task.find(upcomingQuery)
              .populate("assignedInternId", "name email department")
              .sort({ dueDate: 1 })
              .limit(8)
              .lean(),
          ]);

        interface PopulatedTaskDoc {
          _id: mongoose.Types.ObjectId;
          title: string;
          priority: string;
          status: string;
          dueDate?: Date;
          assignedInternId?: {
            _id?: mongoose.Types.ObjectId;
            name?: string;
            email?: string;
            department?: string;
          };
          assignedInternSnapshot?: {
            name?: string;
            email?: string;
          };
        }

        const formatDeadlineTask = (t: PopulatedTaskDoc): DeadlineTaskItem => ({
          id: t._id.toString(),
          title: t.title,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : "",
          assignedIntern: t.assignedInternId
            ? {
                id: t.assignedInternId._id ? t.assignedInternId._id.toString() : String(t.assignedInternId),
                name: t.assignedInternId.name || t.assignedInternSnapshot?.name || "Unassigned",
                email: t.assignedInternId.email || t.assignedInternSnapshot?.email || "",
                department: t.assignedInternId.department || "General",
              }
            : undefined,
        });

        const overdueTasks = overdueTasksRaw.map(formatDeadlineTask);
        const upcomingTasks = upcomingTasksRaw.map(formatDeadlineTask);

        // 5. Workload Distribution across active Interns
        const workloadAggregation = await Task.aggregate<{
          _id: mongoose.Types.ObjectId;
          assignedCount: number;
          inProgressCount: number;
          submittedCount: number;
          changesRequestedCount: number;
          approvedCount: number;
          overdueCount: number;
          totalCount: number;
        }>([
          {
            $match: {
              ...baseTaskMatch,
              assignedInternId: { $ne: null },
              status: { $nin: ["unassigned", "transferred"] },
            },
          },
          {
            $group: {
              _id: "$assignedInternId",
              assignedCount: {
                $sum: { $cond: [{ $eq: ["$status", "assigned"] }, 1, 0] },
              },
              inProgressCount: {
                $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
              },
              submittedCount: {
                $sum: { $cond: [{ $eq: ["$status", "submitted"] }, 1, 0] },
              },
              changesRequestedCount: {
                $sum: { $cond: [{ $eq: ["$status", "changes_requested"] }, 1, 0] },
              },
              approvedCount: {
                $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
              },
              overdueCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "approved"] },
                        { $lt: ["$dueDate", now] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalCount: { $sum: 1 },
            },
          },
        ]);

        // Fetch users corresponding to workload
        const internIds = workloadAggregation.map((w) => w._id);
        const usersList = await User.find(
          { _id: { $in: internIds } },
          { name: 1, email: 1, department: 1, internId: 1 }
        ).lean();

        const userMap = new Map<string, { name: string; email: string; department?: string; internId?: string }>();
        for (const u of usersList) {
          userMap.set(u._id.toString(), {
            name: u.name,
            email: u.email,
            department: u.department,
            internId: u.internId,
          });
        }

        const workloadDistribution: InternWorkloadItem[] = workloadAggregation.map((w) => {
          const u = userMap.get(w._id.toString());
          const totalAssigned = w.totalCount;
          const compRate = totalAssigned > 0 ? Math.round((w.approvedCount / totalAssigned) * 100) : 0;

          return {
            internId: w._id.toString(),
            name: u?.name || "Intern",
            email: u?.email || "",
            department: u?.department || "General",
            assignedCount: w.assignedCount,
            inProgressCount: w.inProgressCount,
            submittedCount: w.submittedCount,
            changesRequestedCount: w.changesRequestedCount,
            approvedCount: w.approvedCount,
            overdueCount: w.overdueCount,
            totalAssigned,
            completionRate: compRate,
          };
        }).sort((a, b) => b.totalAssigned - a.totalAssigned);

        // 6. Department-level Breakdown (only grouping interns with actual department values)
        const departmentAggregation = await Task.aggregate<{
          _id: string;
          totalTasks: number;
          completedTasks: number;
          overdueTasks: number;
          inProgressTasks: number;
        }>([
          {
            $match: {
              ...baseTaskMatch,
              assignedInternId: { $ne: null },
              status: { $nin: ["unassigned", "transferred"] },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "assignedInternId",
              foreignField: "_id",
              as: "internDoc",
            },
          },
          { $unwind: "$internDoc" },
          {
            $match: {
              "internDoc.department": { $exists: true, $ne: "" },
            },
          },
          {
            $group: {
              _id: "$internDoc.department",
              totalTasks: { $sum: 1 },
              completedTasks: {
                $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
              },
              inProgressTasks: {
                $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
              },
              overdueTasks: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$status", "approved"] },
                        { $lt: ["$dueDate", now] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          { $sort: { totalTasks: -1 } },
        ]);

        const departmentBreakdown: DepartmentMetricItem[] = departmentAggregation.map((d) => ({
          department: d._id,
          totalTasks: d.totalTasks,
          completedTasks: d.completedTasks,
          overdueTasks: d.overdueTasks,
          inProgressTasks: d.inProgressTasks,
          completionRate:
            d.totalTasks > 0 ? Math.round((d.completedTasks / d.totalTasks) * 100) : 0,
        }));

        return {
          statusCounts,
          rates: {
            completionRate,
            approvalRate,
          },
          deadlines: {
            overdueCount,
            upcomingDeadlinesCount: upcomingCount,
            overdueTasks,
            upcomingTasks,
          },
          reviewBacklog: {
            pendingReviewsCount: submitted,
            changesRequestedCount: changesRequested,
            approvedCount: approved,
          },
          workloadDistribution,
          departmentBreakdown,
        };
      },
      CACHE_KEYS.allAnalyticsKeys()
    );
  }

  /**
   * Intern-scoped analytics for the authenticated intern.
   * Strictly scopes all metrics to authenticated intern's userId.
   */
  static async getInternAnalytics(authenticatedInternId: string): Promise<InternAnalyticsData> {
    const cacheKey = CACHE_KEYS.internAnalytics(authenticatedInternId);

    return getOrSetCache(
      cacheKey,
      CACHE_TTL.INTERN_ANALYTICS,
      async () => {
        await connectDB();

        const userDoc = await User.findById(authenticatedInternId)
          .select("name email internId department")
          .lean();

        if (!userDoc) {
          throw new Error("Intern not found");
        }

        const now = new Date();
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const internObjectId = new mongoose.Types.ObjectId(authenticatedInternId);

        // 1. Status count aggregation for this intern
        const statusAggregation = await Task.aggregate<{ _id: string; count: number }>([
          {
            $match: {
              assignedInternId: internObjectId,
              isArchived: false,
              status: { $nin: ["unassigned", "transferred"] },
            },
          },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const statusMap: Record<string, number> = {};
        for (const item of statusAggregation) {
          statusMap[item._id] = item.count;
        }

        const assigned = statusMap["assigned"] || 0;
        const inProgress = statusMap["in_progress"] || 0;
        const submitted = statusMap["submitted"] || 0;
        const changesRequested = statusMap["changes_requested"] || 0;
        const approved = statusMap["approved"] || 0;
        const total = assigned + inProgress + submitted + changesRequested + approved;

        const statusCounts: StatusCounts = {
          assigned,
          inProgress,
          submitted,
          changesRequested,
          approved,
          unassigned: 0,
          transferred: 0,
          total,
        };

        const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

        // 2. Deadlines
        const excludedStatuses: TaskStatus[] = ["approved", "unassigned", "transferred"];
        const overdueQuery: Record<string, unknown> = {
          assignedInternId: internObjectId,
          isArchived: false,
          status: { $nin: excludedStatuses },
          dueDate: { $lt: now },
        };

        const upcomingQuery: Record<string, unknown> = {
          assignedInternId: internObjectId,
          isArchived: false,
          status: { $nin: excludedStatuses },
          dueDate: { $gte: now, $lte: next7Days },
        };

        const [overdueCount, upcomingCount, overdueTasksRaw, upcomingTasksRaw] =
          await Promise.all([
            Task.countDocuments(overdueQuery),
            Task.countDocuments(upcomingQuery),
            Task.find(overdueQuery).sort({ dueDate: 1 }).limit(6).lean(),
            Task.find(upcomingQuery).sort({ dueDate: 1 }).limit(6).lean(),
          ]);

        interface RawInternTaskDoc {
          _id: mongoose.Types.ObjectId;
          title: string;
          priority: string;
          status: string;
          dueDate?: Date;
        }

        const formatDeadlineTask = (t: RawInternTaskDoc): DeadlineTaskItem => ({
          id: t._id.toString(),
          title: t.title,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : "",
        });

        // 3. Recent Submission / Review Activity (Feedback Visibility)
        const recentSubmissions = await Submission.find({ internId: internObjectId })
          .populate("taskId", "title")
          .sort({ createdAt: -1 })
          .limit(6)
          .lean();

        interface RawSubmissionDoc {
          _id: mongoose.Types.ObjectId;
          taskId?: {
            _id?: mongoose.Types.ObjectId;
            title?: string;
          } | mongoose.Types.ObjectId | string;
          version: number;
          reviewStatus: "pending" | "changes_requested" | "approved";
          adminFeedback?: string;
          createdAt: Date;
          reviewedAt?: Date;
        }

        const recentActivity = (recentSubmissions as unknown as RawSubmissionDoc[]).map((sub) => {
          const populatedTask = sub.taskId && typeof sub.taskId === "object" && "_id" in sub.taskId
            ? (sub.taskId as { _id?: mongoose.Types.ObjectId; title?: string })
            : undefined;

          return {
            id: sub._id.toString(),
            taskId: populatedTask?._id ? populatedTask._id.toString() : String(sub.taskId || ""),
            taskTitle: populatedTask?.title || "Task deliverable",
            version: sub.version,
            reviewStatus: sub.reviewStatus,
            adminFeedback: sub.adminFeedback,
            submittedAt: new Date(sub.createdAt).toISOString(),
            reviewedAt: sub.reviewedAt ? new Date(sub.reviewedAt).toISOString() : undefined,
          };
        });

        return {
          intern: {
            id: userDoc._id.toString(),
            name: userDoc.name,
            email: userDoc.email,
            internId: userDoc.internId,
            department: userDoc.department,
          },
          statusCounts,
          completionRate,
          deadlines: {
            overdueCount,
            upcomingDeadlinesCount: upcomingCount,
            overdueTasks: overdueTasksRaw.map(formatDeadlineTask),
            upcomingTasks: upcomingTasksRaw.map(formatDeadlineTask),
          },
          recentActivity,
        };
      },
      CACHE_KEYS.allAnalyticsKeys()
    );
  }
}
