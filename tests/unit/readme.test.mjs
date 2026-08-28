import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const readmeUrl = new URL("../../README.md", import.meta.url);
const heroUrls = [
  new URL("../../assets/readme-hero-dark.svg", import.meta.url),
  new URL("../../assets/readme-hero-light.svg", import.meta.url),
];
const liveLabUrl = "https://wz20.github.io/wz20/";
const approvedRepos = [
  "create-vox-paper-collage-video",
  "ian-huajuan-illustrations",
  "jinjing-skill",
  "OAuth2-sso-demo",
];

const occurrences = (source, literal) => source.split(literal).length - 1;

test("uses one theme-aware repository-owned hero with a dark fallback", async () => {
  const readme = await readFile(readmeUrl, "utf8");
  const pictures = [...readme.matchAll(/<picture>([\s\S]*?)<\/picture>/g)];

  assert.equal(pictures.length, 1);
  assert.match(
    pictures[0][1],
    /^\s*<source media="\(prefers-color-scheme: dark\)" srcset="\.\/assets\/readme-hero-dark\.svg">\s*<source media="\(prefers-color-scheme: light\)" srcset="\.\/assets\/readme-hero-light\.svg">\s*<img src="\.\/assets\/readme-hero-dark\.svg" width="100%" alt="花卷 AI 实验室：把 AI 想法做成看得见、能运行的作品">\s*$/,
  );
});

test("keeps one primary live-lab entrance and the approved contact entrance", async () => {
  const readme = await readFile(readmeUrl, "utf8");
  const primary = `<a href="${liveLabUrl}"><strong>进入动态实验室 →</strong></a>`;

  assert.equal(occurrences(readme, primary), 1);
  assert.equal(occurrences(readme, `href="${liveLabUrl}"`), 1);
  assert.equal(occurrences(readme, `](${liveLabUrl})`), 1);
});

test("keeps the exact identity-first section order and primary copy", async () => {
  const readme = await readFile(readmeUrl, "utf8");
  const sections = [...readme.matchAll(/^## (.+)$/gm)].map(([, heading]) => heading);

  assert.deepEqual(sections, ["你好，我是花卷", "精选实验", "当前研究", "代码活动", "找到花卷"]);
  assert.match(readme, /\*\*Java 后端 · AI Agent · Creative Technology\*\*/);
  assert.match(readme, /把抽象的 AI 概念，做成看得见、能运行、可以继续迭代的产品、工具与视觉作品。/);
  assert.ok(readme.indexOf("## 你好，我是花卷") < readme.indexOf("github-readme-stats.vercel.app"));
});

test("links each approved project exactly once and no other project destination", async () => {
  const readme = await readFile(readmeUrl, "utf8");
  const selectedWork = readme.slice(readme.indexOf("## 精选实验"), readme.indexOf("## 当前研究"));
  const destinations = [...selectedWork.matchAll(/href="(https:\/\/github\.com\/wz20\/[^\"]+)"/g)].map(([, href]) => href);

  assert.deepEqual(destinations, approvedRepos.map((repo) => `https://github.com/wz20/${repo}`));
  for (const repo of approvedRepos) assert.equal(occurrences(readme, `https://github.com/wz20/${repo}`), 1);
});

test("keeps one Douyin destination and the approved activity images", async () => {
  const readme = await readFile(readmeUrl, "utf8");

  assert.equal(occurrences(readme, "https://www.douyin.com/search/"), 1);
  assert.equal(occurrences(readme, "github-readme-stats.vercel.app/api?username=wz20"), 1);
  assert.equal(occurrences(readme, "github-readme-activity-graph.vercel.app/graph?username=wz20"), 1);
});

test("removes the old external template and duplicated profile clutter", async () => {
  const readme = await readFile(readmeUrl, "utf8");

  assert.doesNotMatch(
    readme,
    /capsule-render|readme-typing-svg|streak-stats|github-contribution-grid-snake|skillicons\.dev|komarev\.com|img\.shields\.io/i,
  );
  assert.doesNotMatch(readme, /^## (?:👋 关于花卷|🚀 正在构建|🧰 技术栈|🐍 贡献动画|📮 找到我)$/m);
});

test("ships XML-safe static dark and light SVG heroes", async () => {
  const allowedElements = new Set(["svg", "title", "desc", "rect", "g", "path", "circle", "line", "polyline", "polygon", "text"]);

  for (const [index, url] of heroUrls.entries()) {
    const info = await stat(url);
    const svg = await readFile(url, "utf8");
    const theme = index === 0 ? "dark" : "light";

    assert.ok(info.isFile(), `${theme} hero must be a file`);
    assert.match(svg, /^<svg\b[^>]*\bwidth="1200"[^>]*\bheight="360"[^>]*\bviewBox="0 0 1200 360"[^>]*>/);
    assert.match(svg, /<title\b[^>]*>花卷 AI 实验室<\/title>/);
    assert.match(svg, /<desc\b[^>]*>[^<]*IDEA[^<]*VISIBLE WORK[^<]*<\/desc>/);
    assert.match(svg, /<text\b[^>]*>HUAJUAN AI LAB<\/text>/);
    assert.match(svg, /<text\b[^>]*>花卷 AI 实验室<\/text>/);
    assert.match(svg, /<text\b[^>]*>把 AI 想法做成看得见、能运行的作品<\/text>/);
    assert.match(svg, /<text\b[^>]*>IDEA<\/text>[\s\S]*<text\b[^>]*>AGENT<\/text>[\s\S]*<text\b[^>]*>TOOLS<\/text>[\s\S]*<text\b[^>]*>VISIBLE WORK<\/text>/);
    assert.match(svg, /<text\b[^>]*>LAB STATUS · BUILDING<\/text>/);
    assert.match(svg, /M96 116 80 64l58 34/);
    assert.match(svg, /m224 116 16-52-58 34/);
    assert.match(svg, /#24D8D2/i);
    assert.match(svg, /#FF5D8F/i);
    assert.match(svg, theme === "dark" ? /fill="#071011"/i : /fill="#F3F0E8"/i);
    assert.match(svg, theme === "dark" ? /fill="#F3F0E8"/i : /fill="#071011"/i);
    assert.doesNotMatch(svg, /&(?!amp;|lt;|gt;|quot;|apos;)/);
    assert.doesNotMatch(svg, /<(?:script|style|foreignObject|filter|animate|animateMotion|animateTransform|set)\b/i);
    assert.doesNotMatch(svg, /\b(?:href|xlink:href|on[a-z]+)\s*=|data:|base64|url\s*\(|@keyframes|\banimation\s*:/i);
    assert.doesNotMatch(svg.replace('xmlns="http://www.w3.org/2000/svg"', ""), /https?:\/\/|\/\//i);

    const elementNames = [...svg.matchAll(/<([A-Za-z][\w:-]*)\b/g)].map(([, name]) => name);
    assert.ok(elementNames.every((name) => allowedElements.has(name)), `${theme} hero uses only static SVG elements`);
    assert.match(svg, /<\/svg>\s*$/);
  }
});
