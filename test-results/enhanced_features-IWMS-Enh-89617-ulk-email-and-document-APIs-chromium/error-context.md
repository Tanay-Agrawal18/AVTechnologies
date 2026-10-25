# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: enhanced_features.spec.ts >> IWMS Enhanced Features — Access Boundaries & Workflows >> blocks unauthenticated access to admin bulk email and document APIs
- Location: e2e\enhanced_features.spec.ts:34:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 401
Received: 500
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("IWMS Enhanced Features — Access Boundaries & Workflows", () => {
  4  |   test("redirects unauthenticated users from bulk email portal to login", async ({ page }) => {
  5  |     await page.goto("/admin/emails");
  6  |     await expect(page).toHaveURL(/.*login/);
  7  |   });
  8  | 
  9  |   test("redirects unauthenticated users from documents & certificates portal to login", async ({ page }) => {
  10 |     await page.goto("/admin/documents");
  11 |     await expect(page).toHaveURL(/.*login/);
  12 |   });
  13 | 
  14 |   test("rejects unauthorized cron cleanup invocation without valid CRON_SECRET", async ({ request }) => {
  15 |     const response = await request.post("/api/cron/cleanup-expired-images", {
  16 |       headers: {
  17 |         authorization: "Bearer wrong_secret_value",
  18 |       },
  19 |     });
  20 | 
  21 |     expect(response.status()).toBe(401);
  22 |     const body = await response.json();
  23 |     expect(body.error).toContain("Unauthorized");
  24 |   });
  25 | 
  26 |   test("blocks unauthenticated access to image streaming and download APIs", async ({ request }) => {
  27 |     const imageResponse = await request.get("/api/progress-images/650f1234567890abcdef1234/view");
  28 |     expect(imageResponse.status()).toBe(401);
  29 | 
  30 |     const docResponse = await request.get("/api/documents/650f1234567890abcdef1234/download");
  31 |     expect(docResponse.status()).toBe(401);
  32 |   });
  33 | 
  34 |   test("blocks unauthenticated access to admin bulk email and document APIs", async ({ request }) => {
  35 |     const emailResponse = await request.post("/api/admin/emails", {
  36 |       data: {
  37 |         subject: "Test Subject",
  38 |         message: "Test Message",
  39 |       },
  40 |     });
> 41 |     expect(emailResponse.status()).toBe(401);
     |                                    ^ Error: expect(received).toBe(expected) // Object.is equality
  42 | 
  43 |     const docIssueResponse = await request.post("/api/admin/documents", {
  44 |       data: {
  45 |         action: "issue",
  46 |         templateId: "650f1234567890abcdef1234",
  47 |         internId: "650f1234567890abcdef5678",
  48 |       },
  49 |     });
  50 |     expect(docIssueResponse.status()).toBe(401);
  51 |   });
  52 | 
  53 |   test("redirects unauthenticated users from collaborative project portals to login", async ({ page }) => {
  54 |     await page.goto("/admin/projects");
  55 |     await expect(page).toHaveURL(/.*login/);
  56 | 
  57 |     await page.goto("/intern/projects");
  58 |     await expect(page).toHaveURL(/.*login/);
  59 |   });
  60 | 
  61 |   test("blocks unauthenticated access to unassign and transfer task APIs", async ({ request }) => {
  62 |     const unassignResponse = await request.post("/api/admin/tasks/650f1234567890abcdef1234/unassign", {
  63 |       data: { reason: "E2E unassign test" },
  64 |     });
  65 |     expect(unassignResponse.status()).toBe(401);
  66 | 
  67 |     const transferResponse = await request.post("/api/admin/tasks/650f1234567890abcdef1234/transfer", {
  68 |       data: {
  69 |         newInternId: "650f1234567890abcdef5678",
  70 |         reason: "E2E transfer test",
  71 |       },
  72 |     });
  73 |     expect(transferResponse.status()).toBe(401);
  74 |   });
  75 | 
  76 |   test("blocks unauthenticated access to collaborative project APIs", async ({ request }) => {
  77 |     const adminProjectsRes = await request.get("/api/admin/projects");
  78 |     expect(adminProjectsRes.status()).toBe(401);
  79 | 
  80 |     const internProjectsRes = await request.get("/api/intern/projects");
  81 |     expect(internProjectsRes.status()).toBe(401);
  82 |   });
  83 | });
  84 | 
```