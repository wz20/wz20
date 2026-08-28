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
  const vox = page.locator("[data-static-project]").filter({ hasText: "VOX Paper Collage Video" });
  await expect(vox).toContainText("ACTIVE · 视频生产系统");
  await expect(vox).toContainText("自动生成 VOX 风格纸张拼贴视频的 Codex Skill。");
  await expect(vox).toContainText("把素材准备、镜头编排与视频生产流程串成一条可复用管线。");
  await expect(vox).toContainText("Codex Skill · Video · Automation");
  const voxLink = vox.getByRole("link", { name: "查看项目：VOX Paper Collage Video（GitHub）" });
  await expect(voxLink).toHaveAttribute("href", "https://github.com/wz20/create-vox-paper-collage-video");
  await expect(voxLink).toHaveAttribute("target", "_blank");
  await expect(voxLink).toHaveAttribute("rel", /noopener/);
  await expect(page.locator("[data-static-project]").filter({ hasText: "OAuth2 SSO Demo" })).toContainText("REFERENCE · 后端工程实践");
  await expect(page.locator("[data-static-project]").filter({ hasText: "OAuth2 SSO Demo" })).toContainText("Java · Spring · OAuth2");
  await context.close();
});

test("shows recognizable fallback project links without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  const link = page.locator("[data-static-project] a").first();
  const base = await link.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { borderStyle: styles.borderStyle, cursor: styles.cursor, display: styles.display };
  });
  expect(base).toEqual({ borderStyle: "solid", cursor: "pointer", display: "inline-flex" });
  const supportsHover = await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
  if (supportsHover) {
    await link.hover();
    await expect.poll(() => link.evaluate((element) => getComputedStyle(element).transform)).not.toBe("none");
  }
  await link.focus();
  await expect.poll(() => link.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await context.close();
});
