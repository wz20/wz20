# Huajuan GitHub Profile V2 — local verification

Date: 2026-08-28 (Asia/Shanghai)

## Tested identity

- Tested parent commit: `53e2d1b8b91fed3eb6a6a181e16319ee47bd79fd`.
- Exact staged source/test tree checked before this record was written: `f81c36b2494dfbb80e70eddbcbd8b7830aa1571d`.
- That tree contains `scripts/serve.mjs`, `site/`, and `tests/`; this verification document was intentionally written only after the checks. The documentation commit containing this record therefore did not exist when the checks ran and is not presented as the tested commit.
- Review follow-up tested parent: `e68a5be4aeced08c58edd4ba189a743a4b19c7f4`; exact staged source/test tree after all four review repairs and before this document update: `3f06ded809974b1448b8d2e66ac5a8bac68376dd`. The later follow-up documentation commit likewise did not exist during those checks.

## Test-first evidence and root-cause repairs

The Task 7 tests were added before the owning repairs. The two brief-prescribed accessibility cases already passed on the inherited Task 6 implementation, so the checks were expanded to cover the defects found by the initial Lighthouse run and normal-speed browser review.

- Initial Lighthouse: Performance `0.84`, Accessibility `0.96`; FCP `3377.0722 ms`, LCP `3452.0722 ms`, TBT `0 ms`, CLS `0.0009176536041691`. `aria-prohibited-attr` identified the unlabeled plain progress container, and `label-content-name-mismatch` identified generated project links whose accessible names omitted their visible labels.
- Accessibility RED: `npm run test:e2e -- tests/e2e/accessibility.spec.js` produced four failures across desktop/mobile for missing progressbar semantics and project-link label/name mismatch. The owning HTML, renderer, and motion state now expose `role="progressbar"`, bounded/current ARIA values, and complete visible/descriptive project-link names.
- Source-policy RED: `npm run test:unit` produced two failures and four passes for render-blocking optional runtime assets and an implicit favicon request. WeUI now has a nonblocking local preload/stylesheet fallback, GSAP is deferred, and the favicon is repository-local.
- Performance root cause: asynchronous loading alone left the audit at Performance `0.85`; the local server was serving the large local runtimes uncompressed. `scripts/serve.mjs` now gzip-compresses accepted HTML, CSS, JavaScript, and SVG responses and sends `Vary: Accept-Encoding`.
- Browser RED cases captured the observed failures before repair: hidden core hero copy during first-load motion, clipped/inline ActionSheet controls and insufficient title contrast, a Toast shifted outside the mobile viewport by inherited WeUI transform, and a five-item desktop chapter navigation compressed into one row. Each regression was first expressed in `tests/e2e/accessibility.spec.js`, failed on desktop/mobile, and was fixed in the owning motion/CSS rule without test suppression.

## Automated verification

| Command | Observed result |
|---|---|
| `npm test` | Unit: 6 passed, 0 failed, 0 skipped. Playwright: 75 passed, 0 failed, 3 skipped out of 78. The three skips are the mobile executions of desktop-only motion checks. |
| `set -e; for file in scripts/serve.mjs site/data.js site/app.js site/motion.js playwright.config.js tests/unit/source-policy.test.mjs tests/e2e/accessibility.spec.js; do node --check "$file"; done` | All 7 files passed syntax checking; no output. |
| `git diff --check` | Passed; no output. |
| `npx lighthouse http://127.0.0.1:4173/ --only-categories=performance,accessibility --output=json --output-path=/private/tmp/huajuan-lighthouse-local.json --chrome-flags="--headless=new"` | Fresh report written by Lighthouse 13.4.1 at `2026-08-28T09:56:08.556Z`. The sandboxed launcher could not connect, so the successful audit was rerun outside the restricted browser sandbox; the failed attempt did not overwrite the report and was not counted. |
| `node -e 'const r=require("/private/tmp/huajuan-lighthouse-local.json");const p=r.categories.performance.score,a=r.categories.accessibility.score;console.log({performance:p,accessibility:a});if(p<0.9\|\|a<0.95)process.exit(1)'` | Exit 0: `{ performance: 0.98, accessibility: 1 }`. Final FCP `1727.2758 ms`, LCP `1952.2758 ms`, TBT `0 ms`, CLS `0.0009176536041691`. |

## Normal-speed browser-harness review

Authorization to control the user's existing authenticated Chrome was not available for this task, so that browser and profile were not used. The required review used `browser-harness` with `BH_RECORD=0` and one reused `BU_CDP_URL=http://127.0.0.1:9333` connection to an isolated local Playwright Chromium process with a fresh temporary, unauthenticated profile. No cloud browser, recording, or second manual automation stack was used. Viewports and reduced-motion media were switched through CDP in that connection. Interactions used filtered partial accessibility nodes and their box coordinates; inspection output was limited to this local page.

| Width | Observed result |
|---|---|
| 390 × 844 | Core title, promise, and actions remained visible at the first sampled rendered state; horizontal overflow was 0. Project dialog opened with focus on its named close control, fit the viewport with internal overflow, closed with Escape, removed background inertness, and restored focus. ActionSheet title and four 56 px rows were unclipped. Copy feedback produced the polite status `已复制：花卷AI实验室`; Toast bounds were top 24, bottom 75, left 180, right 366 with `transform: none`, fully inside the viewport. The first Tab exposed the skip link with a 3 px visible focus ring. Mobile Tabbar and page copy remained legible. |
| 768 × 1024 | Horizontal overflow was 0, the core hero remained visible, project grid and Tabbar were legible, and normal motion reported `data-motion="ready"`. CDP reduced-motion emulation changed the page to `data-motion="reduced"`, removed all pin spacers, retained exactly the static `idea` stage with progress value 1, kept hero content at opacity 1 with no transform, and left the cat orbiter transform unchanged over 450 ms. Normal media was restored in the same connection and `data-motion="ready"` returned. |
| 1440 × 1000 | Horizontal overflow was 0. The chapter navigation rendered as five separate 44 px vertical rows with no overlap. Normal-speed smooth scrolling advanced the pinned ScrollTrigger flow `idea/1 → agent/2 → tools/3 → work/4`, with one active stage throughout. The pointer spotlight centered at the inspected viewport coordinate `(500, 400)`, stayed fully in the viewport, and kept the project card in bounds. Desktop project dialog content was readable and keyboard dismissal/focus restoration matched the mobile result. |

Across the final complete pass at all three widths, the page-filtered console error, page error, and unhandled-rejection arrays were empty; Performance Resource Timing reported no HTTP responses with status 400 or greater. No remaining clipping, overlap, illegible content, unsafe focus loss, or uncomfortable reduced-motion animation was observed.

One browser-tooling issue was isolated from the product: an early full accessibility-tree/wheel probe made the first headless tab unresponsive. The review stayed on the same isolated browser-harness connection, opened a fresh local page in that browser, switched to filtered partial accessibility queries and native smooth scrolling, and completed the full pass without recurrence. The isolated Chromium process was then stopped and only its exact temporary profile directory was removed.

## Review follow-up verification

The Task 7 review identified one P1 label-in-name defect, one P2 policy-coverage gap, and two P3 server/documentation issues. Tests were strengthened before the repairs.

- RED unit run: `npm run test:unit` — 7 passed and 4 failed. The four failures proved that `gzip;q=0` was incorrectly accepted, identity responses omitted `Vary`, wildcard acceptance was unsupported, and an explicit gzip denial did not override a positive wildcard.
- RED browser run: `npm run test:e2e -- tests/e2e/accessibility.spec.js tests/e2e/content.spec.js` — 22 passed and 6 failed across desktop/mobile. The failures showed that the visible `查看项目` and `查看 GitHub 项目` strings were not contiguous substrings of the no-JavaScript and dialog accessible names.
- Source policy now recognizes remote runtime URLs with single or double quotes and with `http://`, `https://`, or protocol-relative `//` forms. Rendered JavaScript-enabled and JavaScript-disabled pages now verify every `target="_blank"` link has `noopener` and `noreferrer` as rel tokens, covering generated links as well as literal HTML.
- No-JavaScript project links now use names such as `查看项目：VOX Paper Collage Video（GitHub）`; the dialog uses names such as `查看 GitHub 项目：VOX Paper Collage Video`. Both include their exact visible labels contiguously.
- The local server now parses gzip and wildcard quality values, treats a specific gzip quality as authoritative over `*`, rejects zero/invalid quality, and emits `Vary: Accept-Encoding` on every compressible representation whether compressed or served as identity.
- Focused GREEN: unit 11/11 passed; accessibility/content 28/28 passed; the synchronized legacy dialog-name interaction check passed 2/2.
- The first expanded full run found two stale legacy-name assertions after 79 browser passes and 3 expected skips. The assertions were updated to the new full accessible name, the focused check passed 2/2, and the fresh final `npm test` passed unit 11/11 and browser 81/81 with the same 3 desktop-only mobile skips (84 total browser cases).
- Syntax: `node --check` passed for `scripts/serve.mjs`, `site/data.js`, `site/app.js`, `site/motion.js`, `playwright.config.js`, the three changed E2E files, and the two unit policy files. `git diff --cached --check` passed with no output.
- Because server negotiation changed, the exact local Lighthouse audit was rerun. Lighthouse 13.4.1 wrote a fresh report at `2026-08-28T10:08:04.020Z`; the threshold command exited 0 with Performance `0.99` and Accessibility `1.00`. Final follow-up FCP was `1579.5060 ms`, LCP `1954.5060 ms`, TBT `0 ms`, and CLS `0.0009176536041691`.
- Direct response checks observed `Vary: Accept-Encoding` with no `Content-Encoding` for `Accept-Encoding: gzip;q=0`, and both `Vary: Accept-Encoding` and `Content-Encoding: gzip` for `Accept-Encoding: br;q=0, *;q=0.5`.

## Preserved runtime policies

- All runtime assets remain local; no tracking or analytics were introduced.
- New-tab links retain `noopener noreferrer` and project/contact destinations remain allowlisted HTTPS URLs.
- No-JavaScript project and contact content remains complete and was exercised by the Playwright suite.
- Core content is readable before motion completion, keyboard focus remains visible, overlays restore focus, and reduced motion produces an immediate static state.

## Production-only remaining checks

- Run the GitHub Actions test/deploy workflow and verify the live GitHub Pages URL after the authorized release steps.
- Repeat Lighthouse against the deployed URL, including production CDN/cache/compression behavior; the local score is not a production measurement.
- Recheck external GitHub/Douyin destinations and the public profile link from the deployed origin.
- Perform the planned production browser/device review after Pages publication. No production URL, workflow run, merge, or deployment was executed as part of this local Task 7 record.
