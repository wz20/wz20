import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL("../../.github/workflows/pages.yml", import.meta.url);

const workflow = () => readFile(workflowUrl, "utf8");

const stepPosition = (source, label) => {
  const position = source.indexOf(label);
  assert.notEqual(position, -1, `missing workflow step: ${label}`);
  return position;
};

test("deploys only the site directory through the approved Pages workflow", async () => {
  const source = await workflow();

  assert.match(source, /^on:\n  push:\n    branches: \[main\]\n    paths:\n(?:      - .+\n){2,}  workflow_dispatch:/m);
  assert.match(source, /^      - "site\/\*\*"$/m);
  assert.match(source, /^      - "\.github\/workflows\/pages\.yml"$/m);
  assert.doesNotMatch(source, /^\s*pull_request\s*:/m);

  for (const action of [
    "actions/checkout@v6",
    "actions/setup-node@v6",
    "actions/configure-pages@v5",
    "actions/upload-pages-artifact@v4",
    "actions/deploy-pages@v4",
  ]) assert.match(source, new RegExp(`^\\s*uses: ${action.replace("/", "\\/")}$`, "m"));

  assert.match(source, /^          node-version: 24$/m);
  assert.match(source, /^        run: npm ci$/m);
  assert.match(source, /^        run: npx playwright install --with-deps chromium$/m);
  assert.match(source, /^        run: npm test$/m);
  assert.match(source, /^          path: site$/m);
  assert.match(source, /^      url: \$\{\{ steps\.deployment\.outputs\.page_url \}\}$/m);
  assert.match(source, /^  cancel-in-progress: false$/m);

  const permissionBlock = source.match(/^permissions:\n((?:  [^\n]+\n?)+)/m)?.[1];
  assert.ok(permissionBlock, "workflow must declare top-level permissions");
  assert.deepEqual(
    [...permissionBlock.matchAll(/^  ([a-z-]+): (read|write)$/gm)].map(([, permission, value]) => [permission, value]).sort(),
    [["contents", "read"], ["id-token", "write"], ["pages", "write"]],
  );

  const verify = stepPosition(source, "run: npm test");
  const upload = stepPosition(source, "uses: actions/upload-pages-artifact@v4");
  const deploy = stepPosition(source, "uses: actions/deploy-pages@v4");
  assert.ok(verify < upload, "tests must finish before the Pages artifact upload");
  assert.ok(upload < deploy, "artifact upload must finish before deployment");
});
