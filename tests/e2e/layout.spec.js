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
