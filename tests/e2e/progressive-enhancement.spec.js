import { expect, test } from "@playwright/test";

test("keeps static projects and contact links when the core app fails to load", async ({ page }) => {
  await page.route("**/app.js", (route) => route.abort("failed"));
  await page.goto("/");

  const staticProjects = page.locator("[data-static-fallback] [data-static-project]");
  await expect(staticProjects).toHaveCount(4);
  await expect(staticProjects.first()).toBeVisible();
  await expect(staticProjects.first().getByRole("link", { name: /查看项目/ })).toHaveAttribute(
    "href",
    "https://github.com/wz20/create-vox-paper-collage-video",
  );

  const staticContact = page.locator("[data-static-contact-fallback]");
  await expect(staticContact.getByRole("link", { name: "GitHub · wz20" })).toBeVisible();
  await expect(staticContact.getByRole("link", { name: "GitHub · wz20" })).toHaveAttribute("href", "https://github.com/wz20");
  await expect(staticContact.getByRole("link", { name: "在抖音搜索花卷AI实验室" })).toHaveAttribute(
    "href",
    /^https:\/\/www\.douyin\.com\/search\//,
  );
  await expect(page.locator("html")).not.toHaveAttribute("data-enhanced", "true");
});

test("keeps enhanced content and immediate interactions when motion fails", async ({ page }) => {
  await page.route("**/motion.js", (route) => route.abort("failed"));
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-enhanced", "true");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "unavailable");
  await expect(page.locator("[data-project-card]")).toHaveCount(4);
  await expect(page.locator("[data-static-fallback]")).toBeHidden();

  await page.locator("[data-open-project]").first().click();
  await expect(page.locator("#project-dialog")).toBeVisible();
  await expect(page.locator("#project-dialog")).toHaveAttribute("data-motion-phase", "open");
  await page.getByRole("button", { name: "关闭项目详情" }).click();
  await expect(page.locator("#project-dialog")).toBeHidden();

  await page.getByRole("button", { name: "联系花卷" }).click();
  await expect(page.locator("#contact-sheet")).toBeVisible();
  await expect(page.locator("#contact-sheet")).toHaveAttribute("data-motion-phase", "open");
  await expect(page.locator("#main-content")).toBeVisible();
});

test("removes fallback duplicates from the accessible page after enhancement", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-enhanced", "true");
  await expect(page.locator("[data-static-fallback]")).toBeHidden();
  await expect(page.locator("[data-static-contact-fallback]")).toBeHidden();

  for (const title of [
    "VOX Paper Collage Video",
    "Huajuan Illustrations",
    "Jinjing Skill",
    "OAuth2 SSO Demo",
  ]) await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(1);
});
