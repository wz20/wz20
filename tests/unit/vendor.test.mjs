import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const read = (name) => readFile(new URL(`../../site/vendor/${name}`, import.meta.url), "utf8");

test("vendors exact WeUI and GSAP releases", async () => {
  const [weui, gsap, scrollTrigger, motionPath, licenses] = await Promise.all([
    read("weui.min.css"),
    read("gsap.min.js"),
    read("ScrollTrigger.min.js"),
    read("MotionPathPlugin.min.js"),
    read("LICENSES.md"),
  ]);
  assert.ok(weui.length > 180_000);
  assert.match(gsap, /3\.13\.0/);
  assert.match(scrollTrigger, /ScrollTrigger/);
  assert.match(motionPath, /MotionPathPlugin/);
  assert.match(licenses, /Tencent\/weui.*2\.6\.26/s);
  assert.match(licenses, /GSAP.*3\.13\.0/s);
  assert.match(licenses, /IBM Plex Mono.*2\.5\.0/s);
  const font = await stat(new URL("../../site/assets/fonts/IBMPlexMono-SemiBold.woff2", import.meta.url));
  assert.ok(font.size > 49_000);
});
