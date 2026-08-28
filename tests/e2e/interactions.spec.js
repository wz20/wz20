import { expect, test } from "@playwright/test";

test("keeps overlays hidden and unavailable before they are opened", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#project-dialog")).toHaveCount(1);
  await expect(page.locator("#contact-sheet")).toHaveCount(1);
  await expect(page.locator("#project-dialog")).toBeHidden();
  await expect(page.locator("#contact-sheet")).toBeHidden();
  await expect(page.locator("#project-dialog-link")).toBeHidden();
  await expect(page.getByRole("button", { name: "复制抖音名称" })).toBeHidden();
});

test("opens project details, closes with Escape, and restores focus", async ({ page }) => {
  await page.goto("/");
  const trigger = page.locator("[data-open-project]").first();
  await trigger.click();
  const dialog = page.locator("#project-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("uses the selected project's safe URL and descriptive accessible name", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "查看 Huajuan Illustrations 详情" }).click();

  await expect(page.locator("#project-dialog-title")).toHaveText("Huajuan Illustrations");
  await expect(page.locator("#project-dialog-outcome")).toHaveText("为文章配图、视觉隐喻、故事板与动画生产提供统一角色资产。");
  const link = page.locator("#project-dialog").getByRole("link", { name: "查看 Huajuan Illustrations 的 GitHub 项目" });
  await expect(link).toHaveAttribute("href", "https://github.com/wz20/ian-huajuan-illustrations");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(link).toHaveAttribute("rel", /noreferrer/);
});

test("traps forward and reverse focus inside the project dialog", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-open-project]").first().click();
  const close = page.getByRole("button", { name: "关闭项目详情" });
  const link = page.locator("#project-dialog-link");

  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(link).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
});

test("the project close control restores focus to its opener", async ({ page }) => {
  await page.goto("/");
  const trigger = page.locator("[data-open-project]").nth(2);
  await trigger.click();
  await page.getByRole("button", { name: "关闭项目详情" }).click();

  await expect(page.locator("#project-dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("opens contact sheet and reports a copy action", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => undefined }, configurable: true });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "联系花卷" }).click();
  await expect(page.locator("#contact-sheet")).toBeVisible();
  await page.getByRole("button", { name: "复制抖音名称" }).click();
  const toast = page.locator("#feedback-toast");
  await expect(toast).toContainText("已复制：花卷AI实验室");
  await expect(toast).toHaveAttribute("role", "status");
  await expect(toast).toHaveAttribute("aria-live", "polite");
});

test("traps contact-sheet focus, closes with Escape, and restores focus", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "联系花卷" });
  await trigger.click();
  const sheet = page.locator("#contact-sheet");
  const first = sheet.getByRole("link", { name: "GitHub · wz20" });
  const last = sheet.getByRole("button", { name: "取消" });

  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#contact-sheet")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("the contact cancel control restores focus to its opener", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "联系花卷" });
  await trigger.click();
  await page.getByRole("button", { name: "取消" }).click();

  await expect(page.locator("#contact-sheet")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("clipboard fallback removes its helper and preserves focus", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    document.execCommand = () => true;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "联系花卷" }).click();
  const copy = page.getByRole("button", { name: "复制抖音名称" });
  await copy.click();

  await expect(page.locator("#feedback-toast")).toContainText("已复制：花卷AI实验室");
  await expect(page.locator("[data-clipboard-helper]")).toHaveCount(0);
  await expect(copy).toBeFocused();
});

test("clipboard fallback reports denial without leaking or losing focus", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    document.execCommand = () => { throw new Error("copy denied"); };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "联系花卷" }).click();
  const copy = page.getByRole("button", { name: "复制抖音名称" });
  await copy.click();

  await expect(page.locator("#feedback-toast")).toContainText("无法复制，请手动搜索：花卷AI实验室");
  await expect(page.locator("[data-clipboard-helper]")).toHaveCount(0);
  await expect(copy).toBeFocused();
});

test("keeps safe contact links when JavaScript is disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");

  const fallback = page.locator(".no-script-contact");
  await expect(fallback.getByRole("link", { name: "GitHub · wz20" })).toHaveAttribute("href", "https://github.com/wz20");
  const douyin = fallback.getByRole("link", { name: "在抖音搜索花卷AI实验室" });
  await expect(douyin).toHaveAttribute("href", /^https:\/\/www\.douyin\.com\/search\//);
  await expect(douyin).toHaveAttribute("target", "_blank");
  await expect(douyin).toHaveAttribute("rel", /noopener/);
  await expect(douyin).toHaveAttribute("rel", /noreferrer/);
  await context.close();
});

test("section navigation uses links to real page sections", async ({ page }) => {
  await page.goto("/");
  const links = page.locator("[data-section-link]");
  await expect(links).toHaveCount(5);

  const destinations = await links.evaluateAll((items) => items.map((item) => ({ tag: item.tagName, href: item.getAttribute("href") })));
  expect(destinations).toEqual([
    { tag: "A", href: "#home" },
    { tag: "A", href: "#experiments" },
    { tag: "A", href: "#flow" },
    { tag: "A", href: "#toolkit" },
    { tag: "A", href: "#contact" },
  ]);
  for (const { href } of destinations) {
    await expect(page.locator(href)).toHaveCount(1);
  }
});
