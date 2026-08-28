import { expect, test } from "@playwright/test";

test("initializes the full motion system without hiding the hero", async ({ page }) => {
  await page.goto("/");

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.motion)).toBe("ready");
  await expect(page.locator("#hero-title")).toBeVisible();
  await expect(page.locator("#orbit-path")).toHaveCount(1);
  await expect(page.locator("#cat-orbiter")).toHaveCount(1);
});

test("shows final content and bypasses pinned or delayed motion when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.motion)).toBe("reduced");
  await expect(page.locator("#hero-title")).toBeVisible();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);

  const trigger = page.locator("[data-open-project]").first();
  await trigger.click();
  await expect(page.locator("#project-dialog")).toHaveAttribute("data-motion-phase", "open");
  await page.keyboard.press("Escape");
  await expect(page.locator("#project-dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("keeps overlays immediate and interactive when GSAP is unavailable", async ({ page }) => {
  await page.route(/\/vendor\/(?:gsap|ScrollTrigger|MotionPathPlugin)\.min\.js$/, (route) => route.abort());
  await page.goto("/");

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.motion)).toBe("unavailable");
  await expect(page.locator("#hero-title")).toBeVisible();

  const trigger = page.getByRole("button", { name: "联系花卷" });
  await trigger.click();
  await expect(page.locator("#contact-sheet")).toHaveAttribute("data-motion-phase", "open");
  await page.getByRole("button", { name: "取消" }).click();
  await expect(page.locator("#contact-sheet")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("animates dialog and ActionSheet entry and exit while preserving focus restoration", async ({ page }) => {
  await page.goto("/");
  const trigger = page.locator("[data-open-project]").first();

  await trigger.click();
  const dialog = page.locator("#project-dialog");
  await expect(dialog).toHaveAttribute("data-motion-phase", "open");
  await expect(page.getByRole("button", { name: "关闭项目详情" })).toBeFocused();

  await page.getByRole("button", { name: "关闭项目详情" }).click();
  await expect.poll(() => dialog.getAttribute("data-motion-phase")).toBe("closing");
  await expect(dialog).toBeHidden();
  await expect(dialog).toHaveAttribute("data-motion-phase", "closed");
  await expect(trigger).toBeFocused();

  const contactTrigger = page.getByRole("button", { name: "联系花卷" });
  await contactTrigger.click();
  const sheet = page.locator("#contact-sheet");
  await expect(sheet).toHaveAttribute("data-motion-phase", "open");
  await page.getByRole("button", { name: "取消" }).click();
  await expect.poll(() => sheet.getAttribute("data-motion-phase")).toBe("closing");
  await expect(sheet).toBeHidden();
  await expect(sheet).toHaveAttribute("data-motion-phase", "closed");
  await expect(contactTrigger).toBeFocused();
});

test("advances one synchronized idea-to-work stage while scrolling on desktop", async ({ page, isMobile }) => {
  test.skip(isMobile, "mobile uses natural vertical flow");
  await page.goto("/");
  const flow = page.locator("#flow");

  await flow.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 900);

  await expect.poll(() => flow.getAttribute("data-active-stage")).not.toBe("idea");
  await expect(page.locator(".flow-stage.is-active")).toHaveCount(1);
  await expect(page.locator('[data-section-link][href="#flow"]')).toHaveClass(/weui-bar__item_on/);
  await expect(page.locator('[data-section-link][href="#flow"]')).toHaveAttribute("aria-current", "location");
});

test("enables bounded desktop pointer motion and removes owned effects on pagehide", async ({ page, isMobile }) => {
  test.skip(isMobile, "pointer motion is desktop-only");
  await page.goto("/");
  const card = page.locator(".project-card").first();

  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => card.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  await card.hover({ position: { x: 24, y: 24 } });
  await expect.poll(() => card.getAttribute("data-motion-tilt")).toBe("active");
  await expect(page.locator(".pointer-spotlight")).toHaveAttribute("data-pointer-state", "active");
  const transform = await card.evaluate((element) => ({
    x: parseFloat(window.gsap.getProperty(element, "x")),
    y: parseFloat(window.gsap.getProperty(element, "y")),
    rotationX: parseFloat(window.gsap.getProperty(element, "rotationX")),
    rotationY: parseFloat(window.gsap.getProperty(element, "rotationY")),
  }));
  expect(Math.abs(transform.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(transform.y)).toBeLessThanOrEqual(4);
  expect(Math.abs(transform.rotationX)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(transform.rotationY)).toBeLessThanOrEqual(1.5);

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.motionLifecycle)).toBe("destroyed");
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await expect(card).toHaveAttribute("data-motion-tilt", "idle");
  await expect(page.locator(".pointer-spotlight")).toHaveAttribute("data-pointer-state", "idle");
  await expect(page.locator(".lab-hero__promise")).toBeVisible();
  await expect.poll(() => page.locator(".lab-hero__promise").evaluate((element) => ({
    opacity: getComputedStyle(element).opacity,
    transform: getComputedStyle(element).transform,
  }))).toEqual({ opacity: "1", transform: "none" });
});
