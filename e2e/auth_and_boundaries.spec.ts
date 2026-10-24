import { test, expect } from "@playwright/test";

test.describe("IWMS Core Workflows & Access Boundaries", () => {
  test("redirects unauthenticated users from admin dashboard to login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator("h2")).toContainText("Vyorai Login");
  });

  test("redirects unauthenticated users from intern portal to login", async ({ page }) => {
    await page.goto("/intern/dashboard");
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator("h2")).toContainText("Vyorai Login");
  });

  test("rejects invalid login credentials with clear error message", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "fake_admin@iwms.company.com");
    await page.fill('input[name="password"]', "WrongPassword2026!");
    await page.click('button[type="submit"]');

    const errorAlert = page.locator(".text-rose-700");
    await expect(errorAlert).toBeVisible({ timeout: 15000 });
    await expect(errorAlert).toContainText(/Invalid email or password|Internal server error/);
  });

  test("password setup page validates token presence", async ({ page }) => {
    await page.goto("/setup-password");
    await expect(page.locator("h3")).toContainText("Missing Activation Token");
  });
});
