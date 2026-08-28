import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../../site/index.html", import.meta.url), "utf8");
const remoteRuntimeAsset = /<(?:script|link)\b[^>]*\b(?:src|href)\s*=\s*(?:"(?:https?:)?\/\/[^\"]*"|'(?:https?:)?\/\/[^']*')/i;

test("loads runtime assets locally and includes no tracking", () => {
  assert.doesNotMatch(html, remoteRuntimeAsset);
  assert.doesNotMatch(html, /google-analytics|googletagmanager|plausible|umami|segment/i);
});

test("recognizes remote runtime URLs with either quote style and protocol-relative URLs", () => {
  for (const markup of [
    '<script src="https://cdn.example/app.js"></script>',
    "<script src='http://cdn.example/app.js'></script>",
    '<link href="//cdn.example/app.css" rel="stylesheet">',
    "<link href='//cdn.example/app.css' rel='stylesheet'>",
  ]) assert.match(markup, remoteRuntimeAsset);
});

test("hardens literal new-tab links with rel tokens", () => {
  const links = [...html.matchAll(/<a\b[^>]*\btarget\s*=\s*(["'])_blank\1[^>]*>/gi)].map(([link]) => link);
  assert.ok(links.length >= 4);
  for (const link of links) {
    const rel = link.match(/\brel\s*=\s*(["'])([^"']*)\1/i)?.[2] ?? "";
    const tokens = new Set(rel.toLowerCase().split(/\s+/).filter(Boolean));
    assert.ok(tokens.has("noopener"), link);
    assert.ok(tokens.has("noreferrer"), link);
  }
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
