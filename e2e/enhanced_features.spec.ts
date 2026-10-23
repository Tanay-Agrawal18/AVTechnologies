import { test, expect } from "@playwright/test";

test.describe("IWMS Enhanced Features — Access Boundaries & Workflows", () => {
  test("redirects unauthenticated users from bulk email portal to login", async ({ page }) => {
    await page.goto("/admin/emails");
    await expect(page).toHaveURL(/.*login/);
  });

  test("redirects unauthenticated users from documents & certificates portal to login", async ({ page }) => {
    await page.goto("/admin/documents");
    await expect(page).toHaveURL(/.*login/);
  });

  test("rejects unauthorized cron cleanup invocation without valid CRON_SECRET", async ({ request }) => {
    const response = await request.post("/api/cron/cleanup-expired-images", {
      headers: {
        authorization: "Bearer wrong_secret_value",
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("blocks unauthenticated access to image streaming and download APIs", async ({ request }) => {
    const imageResponse = await request.get("/api/progress-images/650f1234567890abcdef1234/view");
    expect(imageResponse.status()).toBe(401);

    const docResponse = await request.get("/api/documents/650f1234567890abcdef1234/download");
    expect(docResponse.status()).toBe(401);
  });

  test("blocks unauthenticated access to admin bulk email and document APIs", async ({ request }) => {
    const emailResponse = await request.post("/api/admin/emails", {
      data: {
        subject: "Test Subject",
        message: "Test Message",
      },
    });
    expect(emailResponse.status()).toBe(401);

    const docIssueResponse = await request.post("/api/admin/documents", {
      data: {
        action: "issue",
        templateId: "650f1234567890abcdef1234",
        internId: "650f1234567890abcdef5678",
      },
    });
    expect(docIssueResponse.status()).toBe(401);
  });

  test("redirects unauthenticated users from collaborative project portals to login", async ({ page }) => {
    await page.goto("/admin/projects");
    await expect(page).toHaveURL(/.*login/);

    await page.goto("/intern/projects");
    await expect(page).toHaveURL(/.*login/);
  });

  test("blocks unauthenticated access to unassign and transfer task APIs", async ({ request }) => {
    const unassignResponse = await request.post("/api/admin/tasks/650f1234567890abcdef1234/unassign", {
      data: { reason: "E2E unassign test" },
    });
    expect(unassignResponse.status()).toBe(401);

    const transferResponse = await request.post("/api/admin/tasks/650f1234567890abcdef1234/transfer", {
      data: {
        newInternId: "650f1234567890abcdef5678",
        reason: "E2E transfer test",
      },
    });
    expect(transferResponse.status()).toBe(401);
  });

  test("blocks unauthenticated access to collaborative project APIs", async ({ request }) => {
    const adminProjectsRes = await request.get("/api/admin/projects");
    expect(adminProjectsRes.status()).toBe(401);

    const internProjectsRes = await request.get("/api/intern/projects");
    expect(internProjectsRes.status()).toBe(401);
  });
});
