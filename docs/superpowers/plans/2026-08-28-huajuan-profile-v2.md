# Huajuan GitHub Dual-Layer Profile V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a distinctive Huajuan AI Lab GitHub Pages experience, verify it live, then replace the GitHub Profile README with a matching static brand entrance.

**Architecture:** Keep the public runtime as a framework-free static site under `site/`. WeUI supplies accessible interaction structures, GSAP supplies orchestrated motion, and repository-local assets remove runtime CDN dependencies. Release in two pull requests: the site and Pages workflow first, then the README after the live URL is verified.

**Tech Stack:** Semantic HTML5, CSS custom properties, ES modules, WeUI 2.6.26, GSAP 3.13.0 with ScrollTrigger and MotionPathPlugin, Node.js 24, Playwright Test 1.62.1, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-28-huajuan-profile-v2-design.md`

## Global Constraints

- The runtime is pure static content: no backend, database, login, analytics, tracking script, or GitHub API request.
- Pin WeUI to `2.6.26`, GSAP to `3.13.0`, and IBM Plex Mono to `2.5.0`; vendor runtime files and font licenses in the repository.
- Register ScrollTrigger and MotionPathPlugin explicitly before creating animations.
- README must remain fully static and must not claim that GSAP or WeUI runs inside GitHub Markdown.
- The four selected projects are `create-vox-paper-collage-video`, `ian-huajuan-illustrations`, `jinjing-skill`, and `OAuth2-sso-demo`.
- Preserve complete content and navigation when JavaScript is disabled.
- Respect `prefers-reduced-motion: reduce`: no pinned scrolling, scrub, pointer parallax, orbit loop, or delayed content visibility.
- Verify the site at widths `390px`, `768px`, and `1440px`; horizontal overflow is a release blocker.
- Accessibility target: Lighthouse Accessibility at least 95 and keyboard-operable dialogs, sheets, links, and buttons.
- Performance target: Lighthouse Performance at least 90 on the production site; accessibility and immediate content visibility take priority over motion.
- Runtime scripts, styles, fonts, and SVGs load from repository-local paths; only user-initiated external links leave the site.
- GitHub Pages tests with Node 24, deploys only `site/`, and uses `actions/checkout@v6`, `actions/setup-node@v6`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, and `actions/deploy-pages@v4`.
- GitHub connector reads are allowed, but repository writes use the authenticated local `wz20` Git/`gh` session because the connector returned 403 on branch creation.
- Do not merge either release pull request until the user approves the corresponding production gate.

## File Responsibility Map

- `package.json`: development and verification commands only; no production build.
- `package-lock.json`: reproducible Playwright installation.
- `.gitignore`: excludes Node modules and generated Playwright reports.
- `playwright.config.js`: desktop/mobile browser projects and local server lifecycle.
- `scripts/serve.mjs`: dependency-free local static server rooted at `site/`.
- `site/index.html`: semantic document, WeUI structures, progressive-enhancement fallback, dialogs, sheet, and toast containers.
- `site/data.js`: the selected-project content contract.
- `site/app.js`: project rendering, focus management, dialog/sheet/toast behavior, copy action, and chapter navigation.
- `site/motion.js`: GSAP setup, master/section timelines, media-query branches, and cleanup.
- `site/styles.css`: brand tokens, WeUI skin overrides, responsive layout, focus states, and reduced-motion fallbacks.
- `site/assets/huajuan-mark.svg`: reusable cat/lab brand mark used by the live site.
- `site/assets/lab-grid.svg`: quiet grid/track background asset.
- `site/vendor/*`: pinned WeUI/GSAP runtime assets plus provenance and license notes.
- `assets/readme-hero-dark.svg`: README hero for GitHub dark mode.
- `assets/readme-hero-light.svg`: README hero for GitHub light mode.
- `README.md`: static GitHub profile entrance, selected work, focus areas, activity, and contact links.
- `.github/workflows/pages.yml`: test, package, and deploy the `site/` directory.
- `tests/unit/*.test.mjs`: dependency, data, source-policy, README, and workflow assertions.
- `tests/e2e/*.spec.js`: browser behavior, responsive layout, progressive enhancement, interactions, motion, and accessibility smoke checks.
- `docs/verification/2026-08-28-huajuan-profile-v2.md`: actual commands, results, production URLs, and observed limitations after verification.

---

### Task 1: Static Runtime Shell and Browser Test Harness

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `.gitignore`
- Create: `playwright.config.js`
- Create: `scripts/serve.mjs`
- Create: `tests/e2e/smoke.spec.js`
- Create: `site/index.html`

**Interfaces:**
- Produces: local server at `http://127.0.0.1:4173/` rooted at `site/`.
- Produces: `npm run test:unit`, `npm run test:e2e`, and `npm test` commands used by every later task.
- Produces: `main#main-content` and the document title `花卷 AI 实验室 · Huajuan AI Lab`.

- [ ] **Step 1: Create the development manifest and test configuration**

Use this exact `package.json`:

```json
{
  "name": "huajuan-profile",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "serve": "node scripts/serve.mjs",
    "test:unit": "node --test tests/unit/*.test.mjs",
    "test:e2e": "playwright test",
    "test": "npm run test:unit && npm run test:e2e"
  },
  "devDependencies": {
    "@playwright/test": "1.62.1",
    "lighthouse": "13.4.1"
  }
}
```

Use this exact `.gitignore`:

```gitignore
node_modules/
playwright-report/
test-results/
.DS_Store
```

Use this exact `playwright.config.js`:

```js
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
```

- [ ] **Step 2: Create the dependency-free static server**

Implement `scripts/serve.mjs` with a fixed root and traversal protection:

```js
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";

const root = resolve("site");
const port = 4173;
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let filePath = resolve(root, `.${pathname}`);
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if ((await stat(filePath)).isDirectory()) filePath = join(filePath, "index.html");
    response.writeHead(200, { "Content-Type": contentTypes.get(extname(filePath)) ?? "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}).listen(port, "127.0.0.1");
```

- [ ] **Step 3: Write the failing browser smoke test**

Create `tests/e2e/smoke.spec.js`:

```js
import { expect, test } from "@playwright/test";

test("loads the Huajuan lab shell", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("花卷 AI 实验室 · Huajuan AI Lab");
  await expect(page.locator("main#main-content")).toBeVisible();
});
```

- [ ] **Step 4: Install the locked test dependency and verify failure**

Run:

```bash
npm install
npx playwright install chromium
npm run test:e2e -- tests/e2e/smoke.spec.js
```

Expected: FAIL because `site/index.html` does not yet exist or does not contain the required title and main element.

- [ ] **Step 5: Add the minimal semantic shell**

Create `site/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="花卷 AI 实验室：把 AI 想法做成看得见、能运行的作品。" />
    <title>花卷 AI 实验室 · Huajuan AI Lab</title>
  </head>
  <body>
    <a href="#main-content">跳到主要内容</a>
    <main id="main-content">
      <h1>花卷 AI 实验室</h1>
    </main>
  </body>
</html>
```

- [ ] **Step 6: Run the smoke test and commit**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.js`  
Expected: PASS in both `desktop` and `mobile` projects.

Commit:

```bash
git add package.json package-lock.json .gitignore playwright.config.js scripts/serve.mjs tests/e2e/smoke.spec.js site/index.html
git commit -m "test: bootstrap profile site harness"
```

### Task 2: Pinned WeUI and GSAP Runtime Assets

**Files:**
- Create: `tests/unit/vendor.test.mjs`
- Create: `site/vendor/weui.min.css`
- Create: `site/vendor/gsap.min.js`
- Create: `site/vendor/ScrollTrigger.min.js`
- Create: `site/vendor/MotionPathPlugin.min.js`
- Create: `site/vendor/LICENSES.md`
- Create: `site/assets/fonts/IBMPlexMono-SemiBold.woff2`
- Create: `site/assets/fonts/OFL.txt`

**Interfaces:**
- Produces: `window.gsap`, `window.ScrollTrigger`, and `window.MotionPathPlugin` globals.
- Produces: WeUI class definitions for `weui-cell`, `weui-panel`, `weui-media-box`, `weui-btn`, `weui-progress`, `weui-half-screen-dialog`, `weui-actionsheet`, `weui-toast`, and `weui-tabbar`.

- [ ] **Step 1: Write the failing vendor integrity test**

Create `tests/unit/vendor.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify missing assets fail**

Run: `npm run test:unit`  
Expected: FAIL with `ENOENT` for `site/vendor/weui.min.css`.

- [ ] **Step 3: Download exact upstream artifacts into a temporary directory and copy them into the repository**

Run:

```bash
vendor_tmp=$(mktemp -d /private/tmp/huajuan-vendor.XXXXXX)
curl -L https://raw.githubusercontent.com/Tencent/weui/v2.6.26/dist/style/weui.min.css -o "$vendor_tmp/weui.min.css"
npm pack gsap@3.13.0 --pack-destination "$vendor_tmp"
npm pack @ibm/plex-mono@2.5.0 --pack-destination "$vendor_tmp"
mkdir -p "$vendor_tmp/gsap" "$vendor_tmp/plex"
tar -xzf "$vendor_tmp/gsap-3.13.0.tgz" -C "$vendor_tmp/gsap"
tar -xzf "$vendor_tmp/ibm-plex-mono-2.5.0.tgz" -C "$vendor_tmp/plex"
mkdir -p site/vendor
mkdir -p site/assets/fonts
cp "$vendor_tmp/weui.min.css" site/vendor/weui.min.css
cp "$vendor_tmp/gsap/package/dist/gsap.min.js" site/vendor/gsap.min.js
cp "$vendor_tmp/gsap/package/dist/ScrollTrigger.min.js" site/vendor/ScrollTrigger.min.js
cp "$vendor_tmp/gsap/package/dist/MotionPathPlugin.min.js" site/vendor/MotionPathPlugin.min.js
cp "$vendor_tmp/plex/package/fonts/complete/woff2/IBMPlexMono-SemiBold.woff2" site/assets/fonts/IBMPlexMono-SemiBold.woff2
cp "$vendor_tmp/plex/package/LICENSE.txt" site/assets/fonts/OFL.txt
```

Create `site/vendor/LICENSES.md` with the exact version, source URL, and license file URL for each library:

```markdown
# Vendored runtime licenses

- Tencent/weui 2.6.26 — source: https://github.com/Tencent/weui/tree/v2.6.26 — MIT license: https://github.com/Tencent/weui/blob/v2.6.26/LICENSE.txt
- GSAP 3.13.0 — source: https://www.npmjs.com/package/gsap/v/3.13.0 — license: https://gsap.com/standard-license/
- IBM Plex Mono 2.5.0 — source: https://www.npmjs.com/package/@ibm/plex-mono/v/2.5.0 — SIL Open Font License 1.1: `site/assets/fonts/OFL.txt`

These files are vendored so the public page does not depend on a runtime CDN. Review the linked upstream licenses before changing versions.
```

- [ ] **Step 4: Run integrity tests and commit**

Run: `npm run test:unit`  
Expected: PASS.

Commit:

```bash
git add tests/unit/vendor.test.mjs site/vendor site/assets/fonts
git commit -m "chore: vendor WeUI and GSAP runtimes"
```

### Task 3: Project Content Contract and Progressive-Enhancement Page

**Files:**
- Create: `tests/unit/data.test.mjs`
- Create: `tests/e2e/content.spec.js`
- Create: `site/data.js`
- Create: `site/app.js`
- Modify: `site/index.html`

**Interfaces:**
- Produces: `PROJECTS: ReadonlyArray<Project>` where each `Project` has `id`, `title`, `category`, `description`, `outcome`, `status`, `repo`, `accent`, and `tags`.
- Produces: `renderProjects(projects, target): void` exported from `site/app.js`.
- Produces: four enhanced `[data-project-card]` elements and four no-script `[data-static-project]` elements.

- [ ] **Step 1: Write failing data-contract and content tests**

Create `tests/unit/data.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { PROJECTS } from "../../site/data.js";

test("exports the four approved projects with safe GitHub URLs", () => {
  assert.deepEqual(PROJECTS.map(({ id }) => id), ["vox", "illustrations", "jinjing", "oauth2"]);
  assert.equal(PROJECTS.length, 4);
  for (const project of PROJECTS) {
    assert.match(project.repo, /^https:\/\/github\.com\/wz20\//);
    assert.ok(project.description.length >= 24);
    assert.ok(project.tags.length >= 2);
  }
});
```

Create `tests/e2e/content.spec.js`:

```js
import { expect, test } from "@playwright/test";

test("renders all selected experiments", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-project-card]")).toHaveCount(4);
  await expect(page.getByRole("link", { name: /VOX Paper Collage Video/ })).toHaveAttribute("href", /create-vox-paper-collage-video/);
});

test("keeps selected experiments when JavaScript is disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("[data-static-project]")).toHaveCount(4);
  await context.close();
});
```

- [ ] **Step 2: Run tests to verify the content contract is absent**

Run: `npm run test:unit && npm run test:e2e -- tests/e2e/content.spec.js`  
Expected: unit FAIL because `site/data.js` is missing; browser tests FAIL because no project cards exist.

- [ ] **Step 3: Implement the exact project data**

Create `site/data.js`:

```js
export const PROJECTS = Object.freeze([
  {
    id: "vox",
    title: "VOX Paper Collage Video",
    category: "视频生产系统",
    description: "自动生成 VOX 风格纸张拼贴视频的 Codex Skill。",
    outcome: "把素材准备、镜头编排与视频生产流程串成一条可复用管线。",
    status: "ACTIVE",
    repo: "https://github.com/wz20/create-vox-paper-collage-video",
    accent: "pink",
    tags: ["Codex Skill", "Video", "Automation"],
  },
  {
    id: "illustrations",
    title: "Huajuan Illustrations",
    category: "视觉素材系统",
    description: "花卷猫咪极简插画素材库，用图像解释抽象技术概念。",
    outcome: "为文章配图、视觉隐喻、故事板与动画生产提供统一角色资产。",
    status: "GROWING",
    repo: "https://github.com/wz20/ian-huajuan-illustrations",
    accent: "yellow",
    tags: ["Illustration", "Storytelling", "SVG"],
  },
  {
    id: "jinjing",
    title: "Jinjing Skill",
    category: "Agent 工具调用",
    description: "基于 Python 的路线规划 Skill，探索 AI 工具调用与自动化任务执行。",
    outcome: "把自然语言意图转成可检查的路线与工具执行结果。",
    status: "EXPERIMENT",
    repo: "https://github.com/wz20/jinjing-skill",
    accent: "cyan",
    tags: ["Python", "Agent", "Maps"],
  },
  {
    id: "oauth2",
    title: "OAuth2 SSO Demo",
    category: "后端工程实践",
    description: "围绕 OAuth2、统一认证与 Spring 生态构建的后端实践项目。",
    outcome: "用可运行示例拆解 GitHub 登录、授权与单点登录流程。",
    status: "REFERENCE",
    repo: "https://github.com/wz20/OAuth2-sso-demo",
    accent: "paper",
    tags: ["Java", "Spring", "OAuth2"],
  },
]);
```

- [ ] **Step 4: Expand the semantic document**

Update `site/index.html` to contain these landmark IDs in this order:

```html
<header id="home" class="lab-hero" aria-labelledby="hero-title">
  <div class="lab-shell lab-hero__grid">
    <p class="lab-kicker">LAB STATUS · BUILDING</p>
    <img class="lab-hero__mark" src="./assets/huajuan-mark.svg" alt="" width="320" height="320">
    <h1 id="hero-title"><span>花卷</span><span>AI 实验室</span></h1>
    <p class="lab-hero__promise">把 AI 想法做成看得见、能运行、可以继续迭代的作品。</p>
    <div class="lab-hero__actions">
      <a class="weui-btn weui-btn_primary" href="#experiments">查看精选实验</a>
      <a class="weui-btn weui-btn_default" href="https://github.com/wz20" target="_blank" rel="noopener noreferrer">返回 GitHub</a>
    </div>
  </div>
</header>
<main id="main-content">
  <section id="console" class="lab-shell" aria-labelledby="console-title">
    <p class="section-index">01 / LAB CONSOLE</p>
    <h2 id="console-title">实验室正在运行</h2>
    <div class="weui-cells lab-console">
      <div class="weui-cell"><div class="weui-cell__bd"><p>BUILD</p><p>Java · Spring · AI Application</p></div><div class="weui-cell__ft"><span class="weui-badge">ACTIVE</span></div></div>
      <div class="weui-cell"><div class="weui-cell__bd"><p>INTELLIGENCE</p><p>Agent · LangGraph · MCP</p></div><div class="weui-cell__ft"><span class="weui-badge">LEARNING</span></div></div>
      <div class="weui-cell"><div class="weui-cell__bd"><p>EXPRESSION</p><p>Vibe Coding · Video · Visual Storytelling</p></div><div class="weui-cell__ft"><span class="weui-badge">MAKING</span></div></div>
    </div>
  </section>
  <section id="experiments" aria-labelledby="experiments-title">
    <div class="lab-shell">
      <p class="section-index">02 / SELECTED EXPERIMENTS</p>
      <h2 id="experiments-title">正在构建的作品</h2>
    </div>
    <div id="project-grid" class="project-grid lab-shell" aria-live="polite"></div>
    <noscript>
      <div class="static-projects">
        <article data-static-project><h3>VOX Paper Collage Video</h3><a href="https://github.com/wz20/create-vox-paper-collage-video" target="_blank" rel="noopener noreferrer">查看项目</a></article>
        <article data-static-project><h3>Huajuan Illustrations</h3><a href="https://github.com/wz20/ian-huajuan-illustrations" target="_blank" rel="noopener noreferrer">查看项目</a></article>
        <article data-static-project><h3>Jinjing Skill</h3><a href="https://github.com/wz20/jinjing-skill" target="_blank" rel="noopener noreferrer">查看项目</a></article>
        <article data-static-project><h3>OAuth2 SSO Demo</h3><a href="https://github.com/wz20/OAuth2-sso-demo" target="_blank" rel="noopener noreferrer">查看项目</a></article>
      </div>
    </noscript>
  </section>
  <section id="flow" class="lab-flow" aria-labelledby="flow-title">
    <div class="lab-shell">
      <p class="section-index">03 / HOW IDEAS SHIP</p>
      <h2 id="flow-title">一个想法如何变成可见作品</h2>
      <div class="weui-progress" aria-label="作品流程进度"><div class="weui-progress__bar"><div class="weui-progress__inner-bar" style="width:100%;transform:scaleX(.25);transform-origin:left center"></div></div></div>
      <div class="flow-track">
        <article class="flow-stage is-active" data-flow-stage="idea"><span>01</span><h3>想法</h3><p>先锁定真实问题、目标观众和可验证结果。</p></article>
        <article class="flow-stage" data-flow-stage="agent"><span>02</span><h3>Agent</h3><p>把推理、记忆与步骤编排成可执行工作流。</p></article>
        <article class="flow-stage" data-flow-stage="tools"><span>03</span><h3>工具</h3><p>连接代码、模型、MCP 与自动化生产能力。</p></article>
        <article class="flow-stage" data-flow-stage="work"><span>04</span><h3>可见作品</h3><p>交付可以运行、演示、复用并继续迭代的结果。</p></article>
      </div>
    </div>
  </section>
  <section id="toolkit" class="lab-shell" aria-labelledby="toolkit-title">
    <p class="section-index">04 / TOOLKIT</p>
    <h2 id="toolkit-title">用工程构建，用智能连接，用视觉表达</h2>
    <div class="toolkit-grid">
      <article><p>BUILD</p><h3>Java Engineering</h3><p>Java · Spring Boot · MySQL · Redis · Docker</p></article>
      <article><p>INTELLIGENCE</p><h3>Agent Systems</h3><p>LangChain · LangGraph · MCP · Prompt Engineering</p></article>
      <article><p>EXPRESSION</p><h3>Creative Technology</h3><p>Vibe Coding · SVG · Motion · Video Automation</p></article>
    </div>
  </section>
  <section id="contact" class="lab-shell lab-contact" aria-labelledby="contact-title">
    <p class="section-index">05 / FIND HUAJUAN</p>
    <h2 id="contact-title">一起把想法做出来</h2>
    <p>GitHub 看项目，抖音看作品从想法到成片的过程。</p>
    <button class="weui-btn weui-btn_primary" type="button" data-open-contact>联系花卷</button>
  </section>
</main>
<footer class="weui-footer">
  <p class="weui-footer__links"><a class="weui-footer__link" href="https://github.com/wz20" target="_blank" rel="noopener noreferrer">GitHub · wz20</a></p>
  <p class="weui-footer__text">Huajuan AI Lab · Ideas made visible</p>
</footer>
```

- [ ] **Step 5: Implement project rendering**

Create `site/app.js` with this public renderer and safe text-node assignment:

```js
import { PROJECTS } from "./data.js";

export function renderProjects(projects, target) {
  const fragment = document.createDocumentFragment();
  for (const project of projects) {
    const article = document.createElement("article");
    article.className = `weui-panel project-card project-card--${project.accent}`;
    article.dataset.projectCard = project.id;
    article.innerHTML = `
      <div class="weui-panel__hd"></div>
      <div class="weui-panel__bd">
        <div class="weui-media-box weui-media-box_text">
          <h3 class="weui-media-box__title"></h3>
          <p class="weui-media-box__desc"></p>
          <ul class="weui-media-box__info" aria-label="技术标签"></ul>
        </div>
      </div>
      <div class="weui-panel__ft">
        <a class="weui-cell weui-cell_access" target="_blank" rel="noopener noreferrer"><span class="weui-cell__bd">查看 GitHub 项目</span><span class="weui-cell__ft"></span></a>
      </div>`;
    article.querySelector(".weui-panel__hd").textContent = `${project.status} · ${project.category}`;
    article.querySelector("h3").textContent = project.title;
    article.querySelector("p").textContent = project.description;
    article.querySelector("a").href = project.repo;
    article.querySelector("a").ariaLabel = `查看 ${project.title} 的 GitHub 项目`;
    const tags = article.querySelector("ul");
    for (const tag of project.tags) {
      const item = document.createElement("li");
      item.textContent = tag;
      tags.append(item);
    }
    fragment.append(article);
  }
  target.replaceChildren(fragment);
}

renderProjects(PROJECTS, document.querySelector("#project-grid"));
document.documentElement.dataset.enhanced = "true";
```

Load `site/app.js` as a module at the end of `site/index.html`.

- [ ] **Step 6: Run content tests and commit**

Run: `npm run test:unit && npm run test:e2e -- tests/e2e/content.spec.js`  
Expected: PASS.

Commit:

```bash
git add site/index.html site/data.js site/app.js tests/unit/data.test.mjs tests/e2e/content.spec.js
git commit -m "feat: add Huajuan lab content model"
```

### Task 4: Brand Visual System, WeUI Skin, and Site SVG Assets

**Files:**
- Create: `tests/e2e/layout.spec.js`
- Create: `site/styles.css`
- Create: `site/assets/huajuan-mark.svg`
- Create: `site/assets/lab-grid.svg`
- Modify: `site/index.html`

**Interfaces:**
- Produces: CSS tokens `--ink`, `--paper`, `--signal`, `--experiment`, `--note`, and `--muted`.
- Produces: `.lab-shell`, `.lab-hero`, `.project-grid`, `.flow-stage`, `.toolkit-grid`, and branded WeUI overrides.
- Produces: SVG motion targets `#cat-orbiter`, `.cat-line`, and `#orbit-path`.

- [ ] **Step 1: Write failing responsive-layout tests**

Create `tests/e2e/layout.spec.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify missing brand styles fail**

Run: `npm run test:e2e -- tests/e2e/layout.spec.js`  
Expected: FAIL because the token values and final responsive layout are absent.

- [ ] **Step 3: Create the two SVG assets**

Build `site/assets/huajuan-mark.svg` as a `320 × 320` viewBox containing:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-labelledby="mark-title mark-desc">
  <title id="mark-title">花卷猫咪实验室标志</title>
  <desc id="mark-desc">由猫耳、圆形花卷和实验轨道组成的线性标志</desc>
  <path id="orbit-path" d="M38 182C66 78 242 54 282 158S212 286 94 250 18 126 38 182Z" fill="none" stroke="#24D8D2" stroke-width="2" stroke-dasharray="8 12"/>
  <g id="cat-orbiter"><circle r="7" fill="#FF5D8F"/></g>
  <g fill="none" stroke="#F3F0E8" stroke-linecap="round" stroke-linejoin="round" stroke-width="8">
    <path class="cat-line" d="M96 116 80 64l58 34"/>
    <path class="cat-line" d="m224 116 16-52-58 34"/>
    <path class="cat-line" d="M92 142c4-54 132-54 136 0v44c0 60-132 60-136 0Z"/>
    <path class="cat-line" d="M124 160h1m70 0h1M146 190c9 8 19 8 28 0"/>
  </g>
</svg>
```

Build `site/assets/lab-grid.svg` as a repeatable `160 × 160` low-opacity grid with one cyan node and one pink registration mark; keep all strokes at opacity `0.14` or lower.

- [ ] **Step 4: Implement the visual system and WeUI overrides**

Start `site/styles.css` with these exact tokens and base rules:

```css
@font-face {
  font-family: "IBM Plex Mono";
  src: url("./assets/fonts/IBMPlexMono-SemiBold.woff2") format("woff2");
  font-style: normal;
  font-weight: 600;
  font-display: swap;
}

:root {
  color-scheme: dark;
  --ink: #071011;
  --paper: #f3f0e8;
  --signal: #24d8d2;
  --experiment: #ff5d8f;
  --note: #f5c451;
  --muted: #8c9a98;
  --panel: rgba(13, 28, 29, 0.86);
  --line: rgba(243, 240, 232, 0.16);
  --radius: 22px;
  --shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
}

* { box-sizing: border-box; }
html { background: var(--ink); scroll-padding-top: 72px; }
body { margin: 0; min-width: 320px; overflow-x: clip; background: var(--ink) url("./assets/lab-grid.svg") repeat; color: var(--paper); }
h1, h2, h3, .lab-kicker, .section-index { font-family: "IBM Plex Mono", ui-monospace, monospace; }
a { color: inherit; }
:focus-visible { outline: 3px solid var(--note); outline-offset: 4px; }
.lab-shell { width: min(1180px, calc(100% - 32px)); margin-inline: auto; }
.project-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 18px; }
.project-card { grid-column: span 6; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); overflow: hidden; }
.weui-btn_primary { background: var(--signal); color: var(--ink); }
.weui-cell, .weui-panel, .weui-media-box__title { color: var(--paper); }
.weui-panel, .weui-cells { background: transparent; }
@media (max-width: 720px) { .project-card { grid-column: 1 / -1; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; } }
```

Complete the stylesheet with the hero, console, asymmetric desktop project spans, flow stages, toolkit cards, tabbar/side-nav transformation, dialog, ActionSheet, Toast, footer, hover, and mobile rules specified in the design. Animate only transform and opacity; do not animate width, height, top, or left.

Add these local assets in `site/index.html` before application code:

```html
<link rel="stylesheet" href="./vendor/weui.min.css" />
<link rel="stylesheet" href="./styles.css" />
<script src="./vendor/gsap.min.js"></script>
<script src="./vendor/ScrollTrigger.min.js"></script>
<script src="./vendor/MotionPathPlugin.min.js"></script>
```

- [ ] **Step 5: Run layout tests and commit**

Run: `npm run test:e2e -- tests/e2e/layout.spec.js`  
Expected: PASS at all three widths with no horizontal overflow.

Commit:

```bash
git add site/index.html site/styles.css site/assets tests/e2e/layout.spec.js
git commit -m "feat: establish Huajuan lab visual system"
```

### Task 5: WeUI Dialog, ActionSheet, Toast, and Navigation Behavior

**Files:**
- Create: `tests/e2e/interactions.spec.js`
- Modify: `site/index.html`
- Modify: `site/app.js`
- Modify: `site/styles.css`

**Interfaces:**
- Consumes: `PROJECTS` from `site/data.js` and project cards from `renderProjects()`.
- Produces: `openProjectDialog(id, trigger): void`, `closeProjectDialog(): void`, `openContactSheet(trigger): void`, `closeContactSheet(): void`, and `showToast(message): void`.
- Produces: `[data-open-project]`, `#project-dialog`, `#contact-sheet`, `#feedback-toast`, and `[data-section-link]` selectors.

- [ ] **Step 1: Write failing interaction tests**

Create `tests/e2e/interactions.spec.js`:

```js
import { expect, test } from "@playwright/test";

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

test("opens contact sheet and reports a copy action", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => undefined }, configurable: true });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "联系花卷" }).click();
  await expect(page.locator("#contact-sheet")).toBeVisible();
  await page.getByRole("button", { name: "复制抖音名称" }).click();
  await expect(page.locator("#feedback-toast")).toContainText("已复制：花卷AI实验室");
});
```

- [ ] **Step 2: Run tests to verify controls are absent**

Run: `npm run test:e2e -- tests/e2e/interactions.spec.js`  
Expected: FAIL because the detail triggers and overlays do not exist.

- [ ] **Step 3: Add accessible WeUI overlay structures**

Add to `site/index.html` after `main`:

```html
<div id="project-dialog" class="weui-half-screen-dialog" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title" hidden>
  <div class="weui-half-screen-dialog__hd"><button type="button" data-close-project aria-label="关闭项目详情">×</button></div>
  <div class="weui-half-screen-dialog__bd"><h2 id="project-dialog-title"></h2><p id="project-dialog-outcome"></p><a id="project-dialog-link" class="weui-btn weui-btn_primary" target="_blank" rel="noopener noreferrer">查看 GitHub 项目</a></div>
</div>
<div id="contact-sheet" class="weui-actionsheet" role="dialog" aria-modal="true" aria-labelledby="contact-sheet-title" hidden>
  <h2 id="contact-sheet-title">找到花卷</h2>
  <a class="weui-actionsheet__cell" href="https://github.com/wz20" target="_blank" rel="noopener noreferrer">GitHub · wz20</a>
  <a class="weui-actionsheet__cell" href="https://www.douyin.com/search/%E8%8A%B1%E5%8D%B7AI%E5%AE%9E%E9%AA%8C%E5%AE%A4" target="_blank" rel="noopener noreferrer">在抖音搜索花卷AI实验室</a>
  <button class="weui-actionsheet__cell" type="button" data-copy-douyin>复制抖音名称</button>
  <button class="weui-actionsheet__cell" type="button" data-close-contact>取消</button>
</div>
<div id="feedback-toast" class="weui-toast" role="status" aria-live="polite" hidden></div>
```

Add a button named `联系花卷`, project-detail buttons using `[data-open-project]`, and chapter anchors using `[data-section-link]`.

- [ ] **Step 4: Implement focus-safe interaction functions**

Add this button immediately after populating each rendered project card:

```js
const detailButton = document.createElement("button");
detailButton.type = "button";
detailButton.className = "weui-btn weui-btn_mini weui-btn_default";
detailButton.dataset.openProject = project.id;
detailButton.textContent = `查看 ${project.title} 详情`;
article.querySelector(".weui-media-box").append(detailButton);
```

Then add these exact exports and event bindings to `site/app.js`:

```js
const projectDialog = document.querySelector("#project-dialog");
const contactSheet = document.querySelector("#contact-sheet");
const feedbackToast = document.querySelector("#feedback-toast");
let lastTrigger = null;
let toastTimer = 0;

function focusableElements(container) {
  return [...container.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
}

function activeOverlay() {
  if (!projectDialog.hidden) return projectDialog;
  if (!contactSheet.hidden) return contactSheet;
  return null;
}

export function openProjectDialog(id, trigger) {
  const project = PROJECTS.find((item) => item.id === id);
  if (!project) return;
  lastTrigger = trigger;
  projectDialog.querySelector("#project-dialog-title").textContent = project.title;
  projectDialog.querySelector("#project-dialog-outcome").textContent = project.outcome;
  projectDialog.querySelector("#project-dialog-link").href = project.repo;
  projectDialog.hidden = false;
  projectDialog.classList.add("is-open");
  projectDialog.querySelector("[data-close-project]").focus();
}

export function closeProjectDialog() {
  if (projectDialog.hidden) return;
  projectDialog.classList.remove("is-open");
  projectDialog.hidden = true;
  lastTrigger?.focus();
  lastTrigger = null;
}

export function openContactSheet(trigger) {
  lastTrigger = trigger;
  contactSheet.hidden = false;
  contactSheet.classList.add("is-open");
  contactSheet.querySelector("[data-copy-douyin]").focus();
}

export function closeContactSheet() {
  if (contactSheet.hidden) return;
  contactSheet.classList.remove("is-open");
  contactSheet.hidden = true;
  lastTrigger?.focus();
  lastTrigger = null;
}

export function showToast(message) {
  window.clearTimeout(toastTimer);
  feedbackToast.textContent = message;
  feedbackToast.hidden = false;
  toastTimer = window.setTimeout(() => { feedbackToast.hidden = true; }, 1800);
}

async function copyDouyin() {
  try {
    await navigator.clipboard.writeText("花卷AI实验室");
  } catch {
    const input = document.createElement("input");
    input.value = "花卷AI实验室";
    input.readOnly = true;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  showToast("已复制：花卷AI实验室");
}

document.addEventListener("click", (event) => {
  const projectTrigger = event.target.closest("[data-open-project]");
  if (projectTrigger) openProjectDialog(projectTrigger.dataset.openProject, projectTrigger);
  if (event.target.closest("[data-close-project]")) closeProjectDialog();
  const contactTrigger = event.target.closest("[data-open-contact]");
  if (contactTrigger) openContactSheet(contactTrigger);
  if (event.target.closest("[data-close-contact]")) closeContactSheet();
  if (event.target.closest("[data-copy-douyin]")) copyDouyin();
});

document.addEventListener("keydown", (event) => {
  const overlay = activeOverlay();
  if (!overlay) return;
  if (event.key === "Escape") {
    event.preventDefault();
    overlay === projectDialog ? closeProjectDialog() : closeContactSheet();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = focusableElements(overlay);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
```

- [ ] **Step 5: Run interaction tests and commit**

Run: `npm run test:e2e -- tests/e2e/interactions.spec.js`  
Expected: PASS in desktop and mobile projects.

Commit:

```bash
git add site/index.html site/app.js site/styles.css tests/e2e/interactions.spec.js
git commit -m "feat: add WeUI project and contact interactions"
```

### Task 6: GSAP Motion Controller and Reduced-Motion Branch

**Files:**
- Create: `tests/e2e/motion.spec.js`
- Create: `site/motion.js`
- Modify: `site/app.js`
- Modify: `site/index.html`
- Modify: `site/styles.css`

**Interfaces:**
- Consumes: `window.gsap`, `window.ScrollTrigger`, `window.MotionPathPlugin`, `#orbit-path`, `#cat-orbiter`, `.cat-line`, `.project-card`, `.flow-stage`, and `[data-section-link]`.
- Produces: `initMotion(options): { destroy(): void }`.
- Produces: root state `document.documentElement.dataset.motion` equal to `ready`, `reduced`, or `unavailable`.

- [ ] **Step 1: Write failing normal/reduced-motion tests**

Create `tests/e2e/motion.spec.js`:

```js
import { expect, test } from "@playwright/test";

test("initializes the full motion system", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.motion)).toBe("ready");
  await expect(page.locator("#hero-title")).toBeVisible();
});

test("shows final content and disables pinned motion when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.motion)).toBe("reduced");
  await expect(page.locator("#hero-title")).toBeVisible();
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
});

test("advances the idea-to-work flow while scrolling on desktop", async ({ page, isMobile }) => {
  test.skip(isMobile, "mobile uses natural vertical flow");
  await page.goto("/");
  await page.locator("#flow").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.locator(".flow-stage.is-active").count()).toBe(1);
});
```

- [ ] **Step 2: Run tests to verify motion state is missing**

Run: `npm run test:e2e -- tests/e2e/motion.spec.js`  
Expected: FAIL because `data-motion` is unset and no flow stage becomes active.

- [ ] **Step 3: Implement the motion controller**

Create `site/motion.js` with this structure:

```js
export function initMotion({
  gsap = window.gsap,
  ScrollTrigger = window.ScrollTrigger,
  MotionPathPlugin = window.MotionPathPlugin,
} = {}) {
  if (!gsap || !ScrollTrigger || !MotionPathPlugin) {
    document.documentElement.dataset.motion = "unavailable";
    return { destroy() {} };
  }
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  const media = gsap.matchMedia();
  const cleanups = [];

  media.add(
    {
      reduceMotion: "(prefers-reduced-motion: reduce)",
      desktop: "(min-width: 900px)",
    },
    ({ conditions }) => {
      if (conditions.reduceMotion) {
        gsap.set("[data-reveal], .cat-line, #cat-orbiter", { clearProps: "all", autoAlpha: 1 });
        document.documentElement.dataset.motion = "reduced";
        return;
      }

      document.documentElement.dataset.motion = "ready";
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .from(".lab-hero__grid", { autoAlpha: 0, duration: 0.5 })
        .from(".cat-line", { strokeDasharray: 240, strokeDashoffset: 240, duration: 0.8, stagger: 0.08 }, "<0.1")
        .from("#hero-title > *", { y: 34, autoAlpha: 0, duration: 0.65, stagger: 0.08 }, "<0.15")
        .from(".lab-hero__actions > *", { y: 18, autoAlpha: 0, duration: 0.4, stagger: 0.08 }, "<0.2");

      const orbit = gsap.to("#cat-orbiter", {
        duration: 11,
        repeat: -1,
        ease: "none",
        motionPath: { path: "#orbit-path", align: "#orbit-path", alignOrigin: [0.5, 0.5] },
      });
      cleanups.push(() => orbit.kill());

      ScrollTrigger.batch(".project-card", {
        start: "top 88%",
        once: true,
        onEnter: (cards) => gsap.from(cards, { y: 38, autoAlpha: 0, duration: 0.6, stagger: 0.09 }),
      });

      if (conditions.desktop) {
        const stages = gsap.utils.toArray(".flow-stage");
        const flow = gsap.timeline({
          scrollTrigger: { trigger: "#flow", start: "top top+=72", end: "+=2200", pin: true, scrub: 0.7 },
        });
        stages.forEach((stage, index) => {
          flow.to(".weui-progress__inner-bar", { scaleX: (index + 1) / stages.length, transformOrigin: "left center", duration: 1, ease: "none" }, index);
          flow.call(() => {
            stages.forEach((item) => item.classList.remove("is-active"));
            stage.classList.add("is-active");
          }, null, index);
        });
      }
    },
  );

  const visibilityHandler = () => document.hidden ? gsap.globalTimeline.pause() : gsap.globalTimeline.resume();
  document.addEventListener("visibilitychange", visibilityHandler);
  return {
    destroy() {
      document.removeEventListener("visibilitychange", visibilityHandler);
      cleanups.forEach((cleanup) => cleanup());
      media.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    },
  };
}
```

Add desktop-only `gsap.quickTo()` pointer spotlight and project-card tilt in the working implementation. Register listeners through named functions, add their removers to `cleanups`, and keep transforms within `4px` translation and `1.5deg` rotation.

- [ ] **Step 4: Initialize motion after content and connect flow progress/navigation state**

Import `initMotion` in `site/app.js` after rendering projects. Store its return value in `motionController`; call `motionController.destroy()` on `pagehide`. In each flow-stage callback, update the WeUI progress bar and the active `[data-section-link]` state without adding a second scroll listener.

- [ ] **Step 5: Run motion tests and commit**

Run: `npm run test:e2e -- tests/e2e/motion.spec.js`  
Expected: PASS, including the reduced-motion branch with no `.pin-spacer`.

Commit:

```bash
git add site/motion.js site/app.js site/index.html site/styles.css tests/e2e/motion.spec.js
git commit -m "feat: orchestrate GSAP lab motion"
```

### Task 7: Accessibility, Runtime Policy, and Full Local Verification

**Files:**
- Create: `tests/unit/source-policy.test.mjs`
- Create: `tests/e2e/accessibility.spec.js`
- Create: `docs/verification/2026-08-28-huajuan-profile-v2.md`
- Modify: `site/index.html`
- Modify: `site/app.js`
- Modify: `site/styles.css`

**Interfaces:**
- Consumes: the complete static site and all earlier test commands.
- Produces: a verification record containing only observed results from executed checks.

- [ ] **Step 1: Write failing source-policy and accessibility tests**

Create `tests/unit/source-policy.test.mjs`:

```js
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
```

Create `tests/e2e/accessibility.spec.js`:

```js
import { expect, test } from "@playwright/test";

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
  await expect(page.getByRole("link", { name: "跳到主要内容" })).toBeFocused();
  await page.getByRole("button", { name: /查看.*详情/ }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#project-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#project-dialog")).toBeHidden();
});
```

- [ ] **Step 2: Run the full suite and capture every failure**

Run: `npm test`  
Expected before fixes: FAIL for any remote runtime asset, missing `rel`, unnamed control, focus issue, console error, or layout regression.

- [ ] **Step 3: Fix root causes, then rerun the complete suite**

Correct semantic markup, event lifecycle, focus order, and CSS constraints in their owning files. Do not suppress tests or hide errors. Run: `npm test`.  
Expected: all unit and browser tests PASS.

- [ ] **Step 4: Perform one normal-speed browser review**

Use the installed `browser-harness` skill with one reused local Chrome connection. Review `http://127.0.0.1:4173/` at `390px`, `768px`, and `1440px`, checking:

- first-load sequencing and immediate readability;
- WeUI project dialog, ActionSheet, Toast, and mobile Tabbar;
- ScrollTrigger flow at normal scrolling speed;
- reduced-motion static result;
- clipping, overlap, legibility, focus ring, and motion comfort;
- browser console and failed network requests filtered to this page.

Fix any observed root cause and repeat only the affected view plus one full normal-speed pass.

- [ ] **Step 5: Write the local verification record and commit**

With the local server running, execute:

```bash
npx lighthouse http://127.0.0.1:4173/ --only-categories=performance,accessibility --output=json --output-path=/private/tmp/huajuan-lighthouse-local.json --chrome-flags="--headless=new"
node -e 'const r=require("/private/tmp/huajuan-lighthouse-local.json");const p=r.categories.performance.score,a=r.categories.accessibility.score;console.log({performance:p,accessibility:a});if(p<0.9||a<0.95)process.exit(1)'
```

Expected: exit 0 with Performance at least `0.90` and Accessibility at least `0.95`. Fix the owning HTML, CSS, asset, or motion cause if either threshold fails, then rerun the audit.

Create `docs/verification/2026-08-28-huajuan-profile-v2.md` after testing. Record the exact commit, commands, pass counts, three reviewed widths, browser-observed issues and fixes, reduced-motion result, measured local Lighthouse scores, and remaining production-only checks. Do not enter estimated scores or unexecuted results.

Commit:

```bash
git add site tests docs/verification/2026-08-28-huajuan-profile-v2.md
git commit -m "test: verify Huajuan lab experience"
```

### Task 8: GitHub Pages Workflow, Site Pull Request, and Live Deployment Gate

**Files:**
- Create: `tests/unit/pages-workflow.test.mjs`
- Create: `.github/workflows/pages.yml`
- Modify: `docs/verification/2026-08-28-huajuan-profile-v2.md`

**Interfaces:**
- Produces: GitHub Pages deployment artifact from `site/` only.
- Produces: live URL `https://wz20.github.io/wz20/` after the first pull request is approved and merged.

- [ ] **Step 1: Write the failing workflow policy test**

Create `tests/unit/pages-workflow.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("deploys only site with the approved Pages actions", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/pages.yml", import.meta.url), "utf8");
  for (const action of ["actions/checkout@v6", "actions/setup-node@v6", "actions/configure-pages@v5", "actions/upload-pages-artifact@v4", "actions/deploy-pages@v4"]) {
    assert.match(workflow, new RegExp(action.replace("/", "\\/")));
  }
  assert.match(workflow, /path:\s*site/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
});
```

- [ ] **Step 2: Run the workflow test to verify the file is absent**

Run: `npm run test:unit`  
Expected: FAIL with `ENOENT` for `.github/workflows/pages.yml`.

- [ ] **Step 3: Implement the Pages workflow**

Create `.github/workflows/pages.yml`:

```yaml
name: Deploy Huajuan Lab to Pages

on:
  push:
    branches: [main]
    paths:
      - "site/**"
      - ".github/workflows/pages.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Use Node.js 24
        uses: actions/setup-node@v6
        with:
          node-version: 24
          package-manager-cache: false
      - name: Install test dependencies
        run: npm ci
      - name: Install Chromium
        run: npx playwright install --with-deps chromium
      - name: Verify site
        run: npm test
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Upload static site
        uses: actions/upload-pages-artifact@v4
        with:
          path: site
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Run all tests, commit, push, and open the site pull request**

Run: `npm test`  
Expected: PASS.

Commit and push:

```bash
git add .github/workflows/pages.yml tests/unit/pages-workflow.test.mjs
git commit -m "ci: deploy Huajuan lab to Pages"
git push origin codex/huajuan-profile-v2
gh pr create --base main --head codex/huajuan-profile-v2 --title "feat: launch Huajuan AI Lab profile site" --body-file docs/superpowers/specs/2026-08-28-huajuan-profile-v2-design.md
```

Run `gh pr checks codex/huajuan-profile-v2 --watch`. Report the exact PR URL and test results to the user, then wait for explicit merge approval.

- [ ] **Step 5: After approval, merge the site PR and enable workflow-based Pages**

Run:

```bash
gh pr merge codex/huajuan-profile-v2 --squash
gh api --method POST repos/wz20/wz20/pages -f build_type=workflow
```

If the Pages creation call returns HTTP 409 because a Pages site already exists, run:

```bash
gh api --method PUT repos/wz20/wz20/pages -f build_type=workflow
```

Do not treat any other HTTP error as success.

- [ ] **Step 6: Verify the deployment before touching README**

Run:

```bash
gh run list --repo wz20/wz20 --workflow pages.yml --limit 1
site_run_id=$(gh run list --repo wz20/wz20 --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$site_run_id" --repo wz20/wz20 --exit-status
curl -fsS https://wz20.github.io/wz20/
npx lighthouse https://wz20.github.io/wz20/ --only-categories=performance,accessibility --output=json --output-path=/private/tmp/huajuan-lighthouse-production.json --chrome-flags="--headless=new"
node -e 'const r=require("/private/tmp/huajuan-lighthouse-production.json");const p=r.categories.performance.score,a=r.categories.accessibility.score;console.log({performance:p,accessibility:a});if(p<0.9||a<0.95)process.exit(1)'
```

Confirm the returned HTML title is `花卷 AI 实验室 · Huajuan AI Lab`. Open the production URL through the same browser-harness connection and repeat the `390px` and `1440px` normal-speed checks. Append actual production results to the verification record.

### Task 9: Static README Brand Entrance and Theme-Aware SVG Heroes

**Files:**
- Create: `tests/unit/readme.test.mjs`
- Create: `assets/readme-hero-dark.svg`
- Create: `assets/readme-hero-light.svg`
- Modify: `README.md`

**Interfaces:**
- Consumes: verified production URL `https://wz20.github.io/wz20/`.
- Produces: a static GitHub Profile README with a theme-aware `<picture>` hero and the approved four-project narrative.

- [ ] **Step 1: Start a second release branch from updated main**

Run:

```bash
git switch main
git pull --ff-only origin main
git switch -c codex/huajuan-profile-readme-v2
```

- [ ] **Step 2: Write the failing README contract test**

Create `tests/unit/readme.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readme = await readFile(new URL("../../README.md", import.meta.url), "utf8");

test("uses repository-owned heroes and the live lab entrance", () => {
  assert.match(readme, /assets\/readme-hero-dark\.svg/);
  assert.match(readme, /assets\/readme-hero-light\.svg/);
  assert.match(readme, /https:\/\/wz20\.github\.io\/wz20\//);
  assert.doesNotMatch(readme, /capsule-render|readme-typing-svg/);
});

test("features the approved projects and keeps identity content primary", () => {
  for (const repo of ["create-vox-paper-collage-video", "ian-huajuan-illustrations", "jinjing-skill", "OAuth2-sso-demo"]) {
    assert.match(readme, new RegExp(repo));
  }
  assert.match(readme, /Java 后端 · AI Agent · Creative Technology/);
  assert.match(readme, /把 AI 想法做成看得见、能运行的作品/);
  assert.match(readme, /https:\/\/www\.douyin\.com\/search\//);
});
```

- [ ] **Step 3: Run the README test to verify the old profile fails**

Run: `npm run test:unit`  
Expected: FAIL because the current README uses capsule-render and the remote typing SVG and lacks repository-owned hero assets.

- [ ] **Step 4: Create the dark and light SVG heroes**

Both SVGs use `viewBox="0 0 1200 360"`, embed no script or remote asset, and contain:

- the Huajuan cat/lab line mark on the left;
- `HUAJUAN AI LAB` as selectable SVG text with a safe monospace fallback;
- `花卷 AI 实验室` and `把 AI 想法做成看得见、能运行的作品`;
- one cyan route from `IDEA` through `AGENT` and `TOOLS` to `VISIBLE WORK`;
- a small pink `LAB STATUS · BUILDING` stamp;
- contrast-adjusted ink/paper backgrounds for the corresponding GitHub theme.

Use only static SVG primitives and text. Do not embed CSS keyframes, JavaScript, filters that blur text, or base64 images.

- [ ] **Step 5: Replace README with the approved information hierarchy**

Use this exact section order and primary copy:

```markdown
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/readme-hero-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/readme-hero-light.svg">
    <img src="./assets/readme-hero-dark.svg" width="100%" alt="花卷 AI 实验室：把 AI 想法做成看得见、能运行的作品">
  </picture>

  <br>

  <a href="https://wz20.github.io/wz20/"><strong>进入动态实验室 →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/wz20?tab=repositories">查看全部项目</a>
</div>

## 你好，我是花卷

**Java 后端 · AI Agent · Creative Technology**

我喜欢把抽象的 AI 概念，做成看得见、能运行、可以继续迭代的产品、工具与视觉作品。

## 精选实验

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🎬 VOX Paper Collage Video</h3>
      <p>自动生成 VOX 风格纸张拼贴视频，把素材、镜头与生产流程串成可复用管线。</p>
      <a href="https://github.com/wz20/create-vox-paper-collage-video">查看项目 →</a>
    </td>
    <td width="50%" valign="top">
      <h3>🐱 Huajuan Illustrations</h3>
      <p>花卷猫咪极简插画素材库，用统一角色资产解释抽象技术概念。</p>
      <a href="https://github.com/wz20/ian-huajuan-illustrations">查看项目 →</a>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🧭 Jinjing Skill</h3>
      <p>基于 Python 的路线规划 Skill，把自然语言意图转成可检查的工具执行结果。</p>
      <a href="https://github.com/wz20/jinjing-skill">查看项目 →</a>
    </td>
    <td width="50%" valign="top">
      <h3>🔐 OAuth2 SSO Demo</h3>
      <p>用可运行示例拆解 GitHub 登录、OAuth2 授权与单点登录流程。</p>
      <a href="https://github.com/wz20/OAuth2-sso-demo">查看项目 →</a>
    </td>
  </tr>
</table>

## 当前研究

`AI Agent` · `LangGraph` · `MCP` · `Vibe Coding` · `视频自动化` · `视觉叙事`

## 代码活动

<div align="center">
  <img height="168" src="https://github-readme-stats.vercel.app/api?username=wz20&show_icons=true&hide_border=true&bg_color=071011&title_color=24d8d2&icon_color=ff5d8f&text_color=f3f0e8" alt="wz20 GitHub 数据">
  <br>
  <img width="96%" src="https://github-readme-activity-graph.vercel.app/graph?username=wz20&bg_color=071011&color=f3f0e8&line=24d8d2&point=ff5d8f&area=true&hide_border=true" alt="wz20 GitHub 贡献活动图">
</div>

## 找到花卷

GitHub：[@wz20](https://github.com/wz20) · 抖音：[花卷AI实验室](https://www.douyin.com/search/%E8%8A%B1%E5%8D%B7AI%E5%AE%9E%E9%AA%8C%E5%AE%A4) · [动态实验室](https://wz20.github.io/wz20/)
```

Remove the typing SVG, duplicated badge rows, streak card, snake section, repeated self-introduction, and repeated Douyin call-to-action.

- [ ] **Step 6: Run README tests, inspect SVG/XML, and commit**

Run:

```bash
npm run test:unit
xmllint --noout assets/readme-hero-dark.svg assets/readme-hero-light.svg
git diff --check
```

Expected: all commands PASS.

Commit:

```bash
git add README.md assets/readme-hero-dark.svg assets/readme-hero-light.svg tests/unit/readme.test.mjs
git commit -m "feat: redesign Huajuan GitHub profile"
```

### Task 10: README Pull Request and Final Production Verification

**Files:**
- Modify: `docs/verification/2026-08-28-huajuan-profile-v2.md`

**Interfaces:**
- Produces: the final GitHub Profile at `https://github.com/wz20` and an immutable verification record.

- [ ] **Step 1: Run the full suite and push the README branch**

Run:

```bash
npm test
git push -u origin codex/huajuan-profile-readme-v2
gh pr create --base main --head codex/huajuan-profile-readme-v2 --title "feat: redesign Huajuan GitHub profile" --body "Connects the verified Huajuan AI Lab Pages site to a static, theme-aware GitHub Profile README."
```

Expected: all tests PASS and `gh pr create` returns a pull-request URL.

- [ ] **Step 2: Verify the branch README rendering before merge**

Open the branch README on GitHub and check both GitHub appearance themes:

```text
https://github.com/wz20/wz20/tree/codex/huajuan-profile-readme-v2
```

Confirm hero switching, project-table alignment, external links, image loading, and narrow-screen behavior. Use lightweight page inspection; do not initialize a second browser automation system.

- [ ] **Step 3: Present the README PR gate**

Run `gh pr checks codex/huajuan-profile-readme-v2 --watch`. Report the exact PR URL, checks, rendered-theme findings, and any remaining limitation. Wait for explicit merge approval.

- [ ] **Step 4: After approval, merge and verify the public profile**

Run:

```bash
gh pr merge codex/huajuan-profile-readme-v2 --squash
curl -fsS https://raw.githubusercontent.com/wz20/wz20/main/README.md
```

Confirm the raw README contains the production Pages URL and both repository-owned hero paths. Read the merged `README.md` with the GitHub plugin and verify its blob SHA differs from the original `dff8ca691134bf90150574f98eed2f08ac9422cc`.

- [ ] **Step 5: Complete the verification record and handoff**

Append the actual site PR, README PR, merge commits, workflow run, live Pages URL, public profile URL, automated test counts, manual viewport/theme observations, Lighthouse results, and any known non-blocking limitation to `docs/verification/2026-08-28-huajuan-profile-v2.md`. Commit the record on a documentation branch or include it in the README PR before merge; do not amend an already merged commit.

Final handoff must distinguish:

- implemented files and merged commits;
- automated test results;
- browser-observed results;
- live deployment state;
- any GitHub setting that still requires the user's action.
