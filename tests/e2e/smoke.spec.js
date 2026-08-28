import { expect, test } from "@playwright/test";

test("loads the Huajuan lab shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("花卷 AI 实验室 · Huajuan AI Lab");
  await expect(page.locator("main#main-content")).toBeVisible();
});
