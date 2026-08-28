import { expect, test } from "@playwright/test";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function expectVisibleLabelInAccessibleName(link) {
  const visibleLabel = (await link.innerText()).trim();
  await expect(link).toHaveAccessibleName(new RegExp(escapeRegExp(visibleLabel)));
}

async function unsafeBlankLinks(page) {
  return page.locator('a[target="_blank"]').evaluateAll((links) => links
    .filter((link) => {
      const tokens = new Set(link.rel.toLowerCase().split(/\s+/).filter(Boolean));
      return !tokens.has("noopener") || !tokens.has("noreferrer");
    })
    .map((link) => ({ href: link.href, rel: link.rel })));
}

test("has one visible h1, named controls, and no console errors", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page.locator("h1:visible")).toHaveCount(1);
  for (const button of await page.getByRole("button").all()) await expect(button).toHaveAccessibleName(/.+/);
  expect(errors).toEqual([]);
});

test("supports keyboard navigation and Escape dismissal", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "跳到主要内容" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.getByRole("button", { name: /查看.*详情/ }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#project-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#project-dialog")).toBeHidden();
});

test("exposes the idea-to-work indicator as a real progressbar", async ({ page }) => {
  await page.goto("/");
  const progress = page.getByRole("progressbar", { name: "作品流程进度" });
  await expect(progress).toHaveCount(1);
  await expect(progress).toHaveAttribute("aria-valuemin", "1");
  await expect(progress).toHaveAttribute("aria-valuemax", "4");
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
});

test("keeps every visible project-link label in its accessible name", async ({ page }) => {
  await page.goto("/");
  const links = page.locator(".project-card .weui-panel__ft a");
  for (const link of await links.all()) await expectVisibleLabelInAccessibleName(link);

  await page.getByRole("button", { name: /查看.*详情/ }).first().click();
  await expectVisibleLabelInAccessibleName(page.locator("#project-dialog-link"));
});

test("keeps no-JavaScript project labels inside their accessible names", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  const links = page.locator("[data-static-project] a");
  await expect(links).toHaveCount(4);
  for (const link of await links.all()) await expectVisibleLabelInAccessibleName(link);
  await context.close();
});

test("hardens every rendered new-tab link", async ({ page }) => {
  await page.goto("/");
  expect(await unsafeBlankLinks(page)).toEqual([]);
});

test("hardens every no-JavaScript new-tab link", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  expect(await unsafeBlankLinks(page)).toEqual([]);
  await context.close();
});

test("keeps the core hero message readable from the first rendered state", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const hidden = await page.locator("#hero-title > span, .lab-hero__promise, .lab-hero__actions > *").evaluateAll((elements) => (
    elements
      .filter((element) => {
        const styles = getComputedStyle(element);
        return styles.visibility !== "visible" || Number(styles.opacity) < 1;
      })
      .map((element) => element.className || element.tagName)
  ));
  expect(hidden).toEqual([]);
});

test("keeps the mobile ActionSheet title and controls unclipped", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "联系花卷" }).click();
  const sheet = page.locator("#contact-sheet");
  await expect(sheet).toHaveAttribute("data-motion-phase", "open");
  const layout = await sheet.evaluate((element) => {
    const parseColor = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const luminance = (value) => parseColor(value)
      .map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const sheetBox = element.getBoundingClientRect();
    const heading = element.querySelector("h2");
    const title = element.querySelector(".weui-actionsheet__title");
    const cells = [...element.querySelectorAll(".weui-actionsheet__cell")];
    const boxes = cells.map((cell) => cell.getBoundingClientRect());
    const light = Math.max(luminance(getComputedStyle(heading).color), luminance(getComputedStyle(title).backgroundColor));
    const dark = Math.min(luminance(getComputedStyle(heading).color), luminance(getComputedStyle(title).backgroundColor));
    return {
      headingFits: heading.scrollHeight <= heading.clientHeight + 1,
      headingHasAAContrast: (light + 0.05) / (dark + 0.05) >= 4.5,
      controlsAreRows: new Set(boxes.map((box) => Math.round(box.top))).size === cells.length,
      controlsAreLargeEnough: boxes.every((box) => box.height >= 44),
      sheetFitsViewport: sheetBox.top >= 0 && sheetBox.bottom <= innerHeight + 1,
    };
  });
  expect(layout).toEqual({
    headingFits: true,
    headingHasAAContrast: true,
    controlsAreRows: true,
    controlsAreLargeEnough: true,
    sheetFitsViewport: true,
  });
});

test("keeps mobile Toast feedback fully inside the viewport", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => undefined }, configurable: true });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "联系花卷" }).click();
  await page.getByRole("button", { name: "复制抖音名称" }).click();
  const toast = page.locator("#feedback-toast");
  await expect(toast).toBeVisible();
  const fits = await toast.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight && box.left >= 0;
  });
  expect(fits).toBe(true);
});

test("stacks the desktop chapter navigation without overlap", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const layout = await page.locator(".weui-tabbar__item").evaluateAll((items) => {
    const boxes = items.map((item) => item.getBoundingClientRect());
    return {
      rows: new Set(boxes.map((box) => Math.round(box.top))).size,
      allLargeEnough: boxes.every((box) => box.height >= 44),
      noOverlap: boxes.every((box, index) => index === 0 || box.top >= boxes[index - 1].bottom),
    };
  });
  expect(layout).toEqual({ rows: 5, allLargeEnough: true, noOverlap: true });
});
