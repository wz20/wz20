import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";
import playwrightConfig from "../../playwright.config.js";

test("Playwright always owns a fresh local web server", () => {
  assert.equal(playwrightConfig.webServer.reuseExistingServer, false);
});

test("keeps the bundled font license as a non-executable data file", async () => {
  const license = await stat(new URL("../../site/assets/fonts/OFL.txt", import.meta.url));
  assert.equal(license.mode & 0o777, 0o644);
});
