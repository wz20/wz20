import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../../site/index.html", import.meta.url), "utf8");

test("loads runtime assets locally and includes no tracking", () => {
  assert.doesNotMatch(html, /<(script|link)[^>]+(?:src|href)="https?:\/\//i);
  assert.doesNotMatch(html, /google-analytics|googletagmanager|plausible|umami|segment/i);
});

test("hardens new-tab links", () => {
  const links = html.match(/<a\b[^>]*target="_blank"[^>]*>/g) ?? [];
  assert.ok(links.length >= 4);
  for (const link of links) assert.match(link, /rel="noopener noreferrer"/);
});

test("keeps optional local runtimes off the render-blocking path", () => {
  assert.match(html, /<link rel="preload" href="\.\/vendor\/weui\.min\.css" as="style" \/>/);
  assert.match(html, /<link rel="stylesheet" href="\.\/vendor\/weui\.min\.css" media="print" onload="this\.media='all'" \/>/);
  for (const name of ["gsap", "ScrollTrigger", "MotionPathPlugin"]) {
    assert.match(html, new RegExp(`<script defer src="\\.\\/vendor\\/${name}\\.min\\.js"><\\/script>`));
  }
});

test("declares a repository-local favicon instead of an implicit failing request", () => {
  assert.match(html, /<link rel="icon" href="\.\/assets\/huajuan-mark\.svg" type="image\/svg\+xml" \/>/);
});
