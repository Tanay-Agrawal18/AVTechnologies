import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as internUploadPhoto } from "@/app/api/intern/tasks/[id]/progress-images/route";
import { GET as adminGetTask } from "@/app/api/admin/tasks/[id]/route";
import { GET as progressImageView } from "@/app/api/progress-images/[id]/view/route";
import { POST as cleanupJobPost, GET as cleanupJobGet } from "@/app/api/cron/cleanup-expired-images/route";
import { DailyProgressImage } from "@/models/DailyProgressImage";
import { Task } from "@/models/Task";
import { requireAuth } from "@/lib/apiAuth";
import * as cloudinaryModule from "@/lib/cloudinary";

vi.mock("@/lib/apiAuth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/models/Task", () => ({
  Task: {
    findById: vi.fn(),
  },
}));

vi.mock("@/models/DailyProgressImage", () => {
  const mockDailyProgressImage = {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };
  return {
    DailyProgressImage: mockDailyProgressImage,
  };
});

vi.mock("@/models/Submission", () => ({
  Submission: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock("@/models/TaskEvent", () => ({
  TaskEvent: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock("@/lib/cloudinary", () => ({
  isCloudinaryConfigured: vi.fn().mockReturnValue(true),
  uploadToCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(),
  getCloudinaryClient: vi.fn(),
}));

describe("Vyorai IWMS — Progress Photos & 24-Hour Expiry Deletion Suite", () => {
  const originalEnv = { ...process.env };
  const mockTaskId = "507f1f77bcf86cd799439011";
  const mockInternId = "507f1f77bcf86cd799439022";
  const mockOtherInternId = "507f1f77bcf86cd799439033";
  const mockAdminId = "507f1f77bcf86cd799439044";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  describe("Phase 2: Intern Upload Experience & Validation", () => {
    it("1. Successfully uploads a valid progress photo and calculates 24h expiry", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        ok: true,
        user: { id: mockInternId, email: "intern@vyorai.com", role: "intern", name: "Alice Intern" },
      } as any);

      vi.mocked(Task.findById).mockResolvedValue({
        _id: mockTaskId,
        assignedInternId: mockInternId,
        status: "in_progress",
      } as any);

      vi.mocked(cloudinaryModule.uploadToCloudinary).mockResolvedValue({
        public_id: "iwms_daily_progress/img_12345",
        secure_url: "https://res.cloudinary.com/demo/image/upload/v1/iwms_daily_progress/img_12345.jpg",
        bytes: 2048,
        format: "jpg",
      });

      const mockCreatedDoc = {
        _id: "607f1f77bcf86cd799439099",
        taskId: mockTaskId,
        internId: mockInternId,
        cloudinaryPublicId: "iwms_daily_progress/img_12345",
        originalFileName: "progress_shot.jpg",
        caption: "Built responsive navbar",
        uploadedAt: new Date("2026-10-27T10:00:00Z"),
        expiresAt: new Date("2026-10-28T10:00:00Z"),
        status: "active",
        isDeleted: false,
      };

      vi.mocked(DailyProgressImage.create).mockResolvedValue(mockCreatedDoc as any);

      const formData = new FormData();
      const fakeFile = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "progress_shot.jpg", {
        type: "image/jpeg",
      });
      formData.append("file", fakeFile);
      formData.append("caption", "Built responsive navbar");

      const req = new NextRequest("http://localhost:3000/api/intern/tasks/123/progress-images", {
        method: "POST",
        body: formData,
      });

      const res = await internUploadPhoto(req, { params: Promise.resolve({ id: mockTaskId }) });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.image._id).toBe(mockCreatedDoc._id);
      expect(json.image.remainingMinutes).toBe(24 * 60);
      expect(json.image.status).toBe("active");
      expect(cloudinaryModule.uploadToCloudinary).toHaveBeenCalled();
      expect(DailyProgressImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "active",
          isDeleted: false,
          originalFileName: "progress_shot.jpg",
        })
      );
    });

    it("2. Rejects invalid image format (e.g. text or script disguised as image)", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        ok: true,
        user: { id: mockInternId, email: "intern@vyorai.com", role: "intern", name: "Alice Intern" },
      } as any);

      vi.mocked(Task.findById).mockResolvedValue({
        _id: mockTaskId,
        assignedInternId: mockInternId,
      } as any);

      const formData = new FormData();
      const fakeFile = new File(["malicious script"], "exploit.sh", {
        type: "text/x-shellscript",
      });
      formData.append("file", fakeFile);

      const req = new NextRequest("http://localhost:3000/api/intern/tasks/123/progress-images", {
        method: "POST",
        body: formData,
      });

      const res = await internUploadPhoto(req, { params: Promise.resolve({ id: mockTaskId }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("Invalid file type");
      expect(cloudinaryModule.uploadToCloudinary).not.toHaveBeenCalled();
    });

    it("3. Rejects oversized uploads exceeding 10MB limit", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        ok: true,
        user: { id: mockInternId, email: "intern@vyorai.com", role: "intern", name: "Alice Intern" },
      } as any);

      vi.mocked(Task.findById).mockResolvedValue({
        _id: mockTaskId,
        assignedInternId: mockInternId,
      } as any);

      const largeBuffer = new Uint8Array(11 * 1024 * 1024); // 11MB
      const fakeFile = new File([largeBuffer], "huge.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", fakeFile);

      const req = new NextRequest("http://localhost:3000/api/intern/tasks/123/progress-images", {
        method: "POST",
        body: formData,
      });

      const res = await internUploadPhoto(req, { params: Promise.resolve({ id: mockTaskId }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("exceeds maximum size limit");
    });
  });

  describe("Phase 3: Admin Immediate Visibility & Download Authorization", () => {
    it("4. Admin can see progress photos immediately while task is still in_progress", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        ok: true,
        user: { id: mockAdminId, email: "admin@vyorai.com", role: "admin", name: "Admin Lead" },
      } as any);

      vi.mocked(Task.findById).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: mockTaskId,
            title: "Homepage Redesign",
            status: "in_progress",
            assignedInternId: {
              _id: mockInternId,
              name: "Alice Intern",
              email: "alice@vyorai.com",
            },
          }),
        }),
      } as any);

      const futureDate = new Date(Date.now() + 18 * 60 * 60 * 1000);
      const mockImages = [
        {
          _id: "photo_1",
          originalFileName: "homepage_wip.png",
          caption: "Hero section complete",
          uploadedAt: new Date(),
          expiresAt: futureDate,
          status: "active",
          isDeleted: false,
          internId: {
            name: "Alice Intern",
            email: "alice@vyorai.com",
            internId: "INT-001",
          },
        },
      ];

      vi.mocked(DailyProgressImage.find).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockImages),
          }),
        }),
      } as any);

      const req = new NextRequest(`http://localhost:3000/api/admin/tasks/${mockTaskId}`);
      const res = await adminGetTask(req, { params: Promise.resolve({ id: mockTaskId }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.progressImages).toBeDefined();
      expect(json.progressImages.length).toBe(1);
      expect(json.progressImages[0]._id).toBe("photo_1");
      expect(json.progressImages[0].uploaderName).toBe("Alice Intern");
      expect(json.progressImages[0].downloadUrl).toContain("download=true");
    });

    it("5. Admin can preview active photo through signed Cloudinary URL", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        ok: true,
        user: { id: mockAdminId, email: "admin@vyorai.com", role: "admin" },
      } as any);

      const futureDate = new Date(Date.now() + 20 * 60 * 60 * 1000);
      vi.mocked(DailyProgressImage.findById).mockResolvedValue({
        _id: "photo_1",
        taskId: mockTaskId,
        cloudinaryPublicId: "iwms_daily_progress/img_12345",
        originalFileName: "preview.jpg",
        expiresAt: futureDate,
        isDeleted: false,
      } as any);

      const mockUrlGen = vi.fn().mockReturnValue("https://res.cloudinary.com/signed-url-for-preview");
      vi.mocked(cloudinaryModule.getCloudinaryClient).mockReturnValue({
        url: mockUrlGen,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/progress-images/photo_1/view");
      const res = await progressImageView(req, { params: Promise.resolve({ id: "photo_1" }) });

      expect(res.status).toBe(307); // NextResponse.redirect
      expect(res.headers.get("location")).toBe("https://res.cloudinary.com/signed-url-for-preview");
      expect(mockUrlGen).toHaveBeenCalledWith(
        "iwms_daily_progress/img_12345",
        expect.objectContaining({ sign_url: true, secure: true })
      );
    });

    it("6. Admin can download active photo with attachment flag in signed URL", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        ok: true,
        user: { id: mockAdminId, email: "admin@vyorai.com", role: "admin" },
      } as any);

      const futureDate = new Date(Date.now() + 20 * 60 * 60 * 1000);
      vi.mocked(DailyProgressImage.findById).mockResolvedValue({
        _id: "photo_1",
        taskId: mockTaskId,
        cloudinaryPublicId: "iwms_daily_progress/img_12345",
        originalFileName: "my_work.png",
        expiresAt: futureDate,
        isDeleted: false,
      } as any);

      const mockUrlGen = vi.fn().mockReturnValue("https://res.cloudinary.com/signed-download-url");
      vi.mocked(cloudinaryModule.getCloudinaryClient).mockReturnValue({
        url: mockUrlGen,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/progress-images/photo_1/view?download=true");
      const res = await progressImageView(req, { params: Promise.resolve({ id: "photo_1" }) });

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://res.cloudinary.com/signed-download-url");
      expect(mockUrlGen).toHaveBeenCalledWith(
        "iwms_daily_progress/img_12345",
        expect.objectContaining({
          sign_url: true,
          secure: true,
          flags: "attachment:my_work.png",
        })
      );
    });
  });

  describe("Phase 4 & 5: Security RBAC & Expiry Protection", () => {
    it("7. Intern cannot access or view another intern's task photos", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        ok: true,
        user: { id: mockOtherInternId, email: "other@vyorai.com", role: "intern" },
      } as any);

      vi.mocked(DailyProgressImage.findById).mockResolvedValue({
        _id: "photo_1",
        taskId: mockTaskId,
        expiresAt: new Date(Date.now() + 100000),
        isDeleted: false,
      } as any);

      // Task belongs to mockInternId, not mockOtherInternId
      vi.mocked(Task.findById).mockResolvedValue({
        _id: mockTaskId,
        assignedInternId: mockInternId,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/progress-images/photo_1/view");
      const res = await progressImageView(req, { params: Promise.resolve({ id: "photo_1" }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Access denied");
    });

    it("8. Expired image (past 24h) returns 410 Gone and does not redirect to Cloudinary", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        ok: true,
        user: { id: mockAdminId, role: "admin" },
      } as any);

      const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
      vi.mocked(DailyProgressImage.findById).mockResolvedValue({
        _id: "photo_expired",
        expiresAt: pastDate,
        isDeleted: false,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/progress-images/photo_expired/view");
      const res = await progressImageView(req, { params: Promise.resolve({ id: "photo_expired" }) });

      expect(res.status).toBe(410);
      const json = await res.json();
      expect(json.error).toContain("expired");
    });
  });

  describe("Phase 6: 24-Hour Cloudinary Deletion & Cleanup Job", () => {
    it("9. Cleanup job requires CRON_SECRET authorization", async () => {
      process.env.CRON_SECRET = "super_secret_cron_key_12345";

      const req = new NextRequest("http://localhost:3000/api/cron/cleanup-expired-images", {
        method: "POST",
        headers: {
          authorization: "Bearer wrong_token",
        },
      });

      const res = await cleanupJobPost(req);
      expect(res.status).toBe(401);
    });

    it("10. Cleanup job deletes expired assets from Cloudinary and updates DB status to deleted", async () => {
      process.env.CRON_SECRET = "super_secret_cron_key_12345";

      const mockImageDoc = {
        _id: "expired_img_1",
        cloudinaryPublicId: "iwms_daily_progress/img_old",
        expiresAt: new Date(Date.now() - 10000),
        isDeleted: false,
        status: "active",
        cleanupRetryCount: 0,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(DailyProgressImage.find).mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockImageDoc]),
      } as any);

      vi.mocked(cloudinaryModule.deleteFromCloudinary).mockResolvedValue({ result: "ok" });

      const req = new NextRequest("http://localhost:3000/api/cron/cleanup-expired-images", {
        method: "POST",
        headers: {
          authorization: "Bearer super_secret_cron_key_12345",
        },
      });

      const res = await cleanupJobPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.results.deletedCount).toBe(1);
      expect(cloudinaryModule.deleteFromCloudinary).toHaveBeenCalledWith("iwms_daily_progress/img_old");
      expect(mockImageDoc.isDeleted).toBe(true);
      expect(mockImageDoc.status).toBe("deleted");
      expect(mockImageDoc.save).toHaveBeenCalled();
    });

    it("11. Cleanup handles already-missing assets ('not found') idempotently", async () => {
      process.env.CRON_SECRET = "super_secret_cron_key_12345";

      const mockImageDoc = {
        _id: "already_deleted_img",
        cloudinaryPublicId: "iwms_daily_progress/img_missing",
        expiresAt: new Date(Date.now() - 10000),
        isDeleted: false,
        status: "active",
        cleanupRetryCount: 0,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(DailyProgressImage.find).mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockImageDoc]),
      } as any);

      vi.mocked(cloudinaryModule.deleteFromCloudinary).mockResolvedValue({ result: "not found" });

      const req = new NextRequest("http://localhost:3000/api/cron/cleanup-expired-images", {
        method: "GET",
        headers: {
          authorization: "Bearer super_secret_cron_key_12345",
        },
      });

      const res = await cleanupJobGet(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.results.deletedCount).toBe(1);
      expect(mockImageDoc.isDeleted).toBe(true);
      expect(mockImageDoc.status).toBe("deleted");
    });

    it("12. Cleanup safely marks delete_failed and increments retry count on transient network error", async () => {
      process.env.CRON_SECRET = "super_secret_cron_key_12345";

      const mockImageDoc = {
        _id: "retry_img",
        cloudinaryPublicId: "iwms_daily_progress/img_flaky",
        expiresAt: new Date(Date.now() - 10000),
        isDeleted: false,
        status: "active",
        cleanupRetryCount: 1,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(DailyProgressImage.find).mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockImageDoc]),
      } as any);

      vi.mocked(cloudinaryModule.deleteFromCloudinary).mockRejectedValue(new Error("Cloudinary rate limited"));

      const req = new NextRequest("http://localhost:3000/api/cron/cleanup-expired-images", {
        method: "POST",
        headers: {
          authorization: "Bearer super_secret_cron_key_12345",
        },
      });

      const res = await cleanupJobPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.results.failedCount).toBe(1);
      expect(mockImageDoc.isDeleted).toBe(false);
      expect(mockImageDoc.status).toBe("delete_failed");
      expect(mockImageDoc.cleanupRetryCount).toBe(2);
      expect(mockImageDoc.save).toHaveBeenCalled();
    });

    it("13. Safely handles legacy records lacking status or expiresAt without throwing errors or unauthorized exposure", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        ok: true,
        user: { id: mockAdminId, role: "admin" },
      } as any);

      // Legacy document uploaded 2 hours ago but missing expiresAt field
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      vi.mocked(DailyProgressImage.findById).mockResolvedValue({
        _id: "legacy_photo_1",
        taskId: mockTaskId,
        cloudinaryPublicId: "iwms_daily_progress/legacy_img",
        originalFileName: "legacy_upload.jpg",
        uploadedAt: twoHoursAgo,
        // expiresAt is undefined on legacy records
        isDeleted: false,
      } as any);

      const mockUrlGen = vi.fn().mockReturnValue("https://res.cloudinary.com/signed-legacy-url");
      vi.mocked(cloudinaryModule.getCloudinaryClient).mockReturnValue({
        url: mockUrlGen,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/progress-images/legacy_photo_1/view");
      const res = await progressImageView(req, { params: Promise.resolve({ id: "legacy_photo_1" }) });

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://res.cloudinary.com/signed-legacy-url");
      // Effective expiry should be uploadedAt + 24h
      const expectedEffectiveExpirySeconds = Math.floor((twoHoursAgo.getTime() + 24 * 60 * 60 * 1000) / 1000);
      expect(mockUrlGen).toHaveBeenCalledWith(
        "iwms_daily_progress/legacy_img",
        expect.objectContaining({
          sign_url: true,
          secure: true,
          expires_at: expectedEffectiveExpirySeconds,
        })
      );
    });

    it("14. Refreshes signed viewing URL upon repeated visits while asset is within 24h window", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        ok: true,
        user: { id: mockAdminId, role: "admin" },
      } as any);

      const futureDate = new Date(Date.now() + 10 * 60 * 60 * 1000);
      vi.mocked(DailyProgressImage.findById).mockResolvedValue({
        _id: "active_photo_refresh",
        taskId: mockTaskId,
        cloudinaryPublicId: "iwms_daily_progress/img_refresh",
        originalFileName: "active_work.png",
        expiresAt: futureDate,
        isDeleted: false,
      } as any);

      const mockUrlGen = vi.fn().mockReturnValue("https://res.cloudinary.com/newly-signed-fresh-url");
      vi.mocked(cloudinaryModule.getCloudinaryClient).mockReturnValue({
        url: mockUrlGen,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/progress-images/active_photo_refresh/view");
      const res = await progressImageView(req, { params: Promise.resolve({ id: "active_photo_refresh" }) });

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://res.cloudinary.com/newly-signed-fresh-url");
      expect(mockUrlGen).toHaveBeenCalled();
    });
  });
});
