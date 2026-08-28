import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
]) {
  test(`fits ${viewport.width}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
    expect(sizes.page).toBeLessThanOrEqual(sizes.viewport);
    await expect(page.locator("#hero-title")).toBeVisible();
  });
}

test("exposes the approved color tokens", async ({ page }) => {
  await page.goto("/");
  const tokens = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return ["--ink", "--paper", "--signal", "--experiment", "--note", "--muted"].map((name) => styles.getPropertyValue(name).trim());
  });
  expect(tokens).toEqual(["#071011", "#f3f0e8", "#24d8d2", "#ff5d8f", "#f5c451", "#8c9a98"]);
});

for (const width of [320, 390]) {
  test(`keeps the Huajuan wordmark intact at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const lineCount = await page.locator("#hero-title span:last-child").evaluate((wordmark) => {
      const range = document.createRange();
      range.selectNodeContents(wordmark);
      return range.getClientRects().length;
    });
    expect(lineCount).toBe(1);
  });
}

test("keeps inactive flow copy at WCAG AA contrast", async ({ page }) => {
  await page.goto("/");
  const result = await page.locator(".flow-stage:not(.is-active)").first().evaluate((stage) => {
    const parseColor = (value) => {
      const [red, green, blue, alpha = 1] = value.match(/[\d.]+/g).map(Number);
      return { red, green, blue, alpha };
    };
    const composite = (foreground, background, alpha = foreground.alpha) => ({
      red: foreground.red * alpha + background.red * (1 - alpha),
      green: foreground.green * alpha + background.green * (1 - alpha),
      blue: foreground.blue * alpha + background.blue * (1 - alpha),
      alpha: 1,
    });
    const luminance = ({ red, green, blue }) => {
      const channels = [red, green, blue].map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const body = parseColor(getComputedStyle(document.body).backgroundColor);
    const track = parseColor(getComputedStyle(stage.parentElement).backgroundColor);
    const background = composite(track, body);
    const text = parseColor(getComputedStyle(stage.querySelector("p")).color);
    const opacity = Number(getComputedStyle(stage).opacity);
    const renderedText = composite(text, background, text.alpha * opacity);
    const lighter = Math.max(luminance(renderedText), luminance(background));
    const darker = Math.min(luminance(renderedText), luminance(background));
    return { contrast: (lighter + 0.05) / (darker + 0.05), opacity };
  });
  expect(result.opacity).toBe(1);
  expect(result.contrast).toBeGreaterThanOrEqual(4.5);
});

test("keeps copy-failure feedback readable and contained at 320px", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    document.execCommand = () => { throw new Error("copy denied"); };
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "联系花卷" }).click();
  await page.getByRole("button", { name: "复制抖音名称" }).click();

  const toast = page.locator("#feedback-toast");
  await expect(toast).toContainText("无法复制，请手动搜索：花卷AI实验室");
  const layout = await toast.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      toastFits: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight,
      textFits: element.scrollWidth <= element.clientWidth + 1,
    };
  });
  expect(layout).toEqual({ pageWidth: 320, viewportWidth: 320, toastFits: true, textFits: true });
});
