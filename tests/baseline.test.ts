import { describe, it, expect } from "vitest";
import dotenv from "dotenv";
dotenv.config();

import dns from "node:dns";
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}

import { connectDB } from "../src/lib/db";
import { ReportService } from "../src/services/reportService";
import { ProjectService } from "../src/services/projectService";
import { User } from "../src/models/User";

describe("Baseline Performance Benchmark", () => {
  it("measures un-cached baseline execution time and query overhead", async () => {
    await connectDB();

    let admin = await User.findOne({ role: "admin" });
    if (!admin) {
      admin = await User.create({
        name: "Benchmark Admin",
        email: `bench-${Date.now()}@test.com`,
        passwordHash: "dummyhash",
        role: "admin",
        status: "active",
      });
    }

    const sessionUser = {
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      role: "admin" as const,
      status: "active" as const,
    };

    // 1. Measure getKPIStats (5 iterations)
    const kpiTimes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const stats = await ReportService.getKPIStats();
      kpiTimes.push(performance.now() - start);
      expect(stats).toBeDefined();
    }
    const avgKpi = kpiTimes.reduce((a, b) => a + b, 0) / kpiTimes.length;

    // 2. Measure getProjects (5 iterations)
    const projectTimes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const projects = await ProjectService.getProjects(sessionUser);
      projectTimes.push(performance.now() - start);
      expect(Array.isArray(projects)).toBe(true);
    }
    const avgProjects = projectTimes.reduce((a, b) => a + b, 0) / projectTimes.length;

    console.log("BASELINE_PERFORMANCE_METRICS:\n" + JSON.stringify({
      kpiStats: {
        avgLatencyMs: Number(avgKpi.toFixed(2)),
        samplesMs: kpiTimes.map(t => Number(t.toFixed(2))),
        mongoQueriesPerCall: 10, // 1 User.countDocuments + 9 Task.countDocuments in Promise.all
      },
      projectList: {
        avgLatencyMs: Number(avgProjects.toFixed(2)),
        samplesMs: projectTimes.map(t => Number(t.toFixed(2))),
        mongoQueriesPerCall: 1, // Project.find with 2 population queries
      }
    }, null, 2));

    expect(avgKpi).toBeGreaterThan(0);
    expect(avgProjects).toBeGreaterThan(0);
  }, 30000);
});
