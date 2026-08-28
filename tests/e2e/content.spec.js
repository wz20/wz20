import { expect, test } from "@playwright/test";

test("renders all selected experiments", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-project-card]")).toHaveCount(4);
  await expect(page.getByRole("link", { name: /VOX Paper Collage Video/ })).toHaveAttribute("href", /create-vox-paper-collage-video/);
});

test("keeps selected experiments when JavaScript is disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("[data-static-project]")).toHaveCount(4);
  await context.close();
});
