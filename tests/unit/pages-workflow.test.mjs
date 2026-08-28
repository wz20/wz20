import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL("../../.github/workflows/pages.yml", import.meta.url);

const workflow = () => readFile(workflowUrl, "utf8");

const indentation = (line) => line.match(/^ */)[0].length;

const block = (source, indent, key) => {
  const lines = source.split(/\r?\n/);
  const header = `${" ".repeat(indent)}${key}:`;
  const start = lines.findIndex((line) => line === header);
  assert.notEqual(start, -1, `missing ${key} block at indentation ${indent}`);

  let end = start + 1;
  while (end < lines.length && (!lines[end].trim() || indentation(lines[end]) > indent)) end += 1;
  return lines.slice(start, end);
};

const scalar = (lines, indent, key) => {
  const prefix = `${" ".repeat(indent)}${key}: `;
  const matches = lines.filter((line) => line.startsWith(prefix));
  assert.equal(matches.length, 1, `expected one ${key} value at indentation ${indent}`);
  return matches[0].slice(prefix.length);
};

const deployJob = (source) => {
  const jobs = block(source, 0, "jobs");
  return block(jobs.join("\n"), 2, "deploy");
};

const steps = (job) => {
  const lines = block(job.join("\n"), 4, "steps");
  const starts = lines.flatMap((line, index) => line.startsWith("      - ") ? [index] : []);
  assert.ok(starts.length > 0, "workflow must declare deployment steps");
  return starts.map((start, index) => lines.slice(start, starts[index + 1] ?? lines.length));
};

const stepValue = (step, key) => {
  const prefix = `        ${key}: `;
  const matches = step.filter((line) => line.startsWith(prefix));
  assert.ok(matches.length <= 1, `expected at most one ${key} value in a workflow step`);
  return matches[0]?.slice(prefix.length);
};

const exactlyOne = (items, label) => {
  assert.equal(items.length, 1, `expected exactly one ${label} step`);
  return items[0];
};

const actionStep = (allSteps, action) => exactlyOne(allSteps.filter((step) => stepValue(step, "uses") === action), action);

const runStep = (allSteps, command) => exactlyOne(allSteps.filter((step) => stepValue(step, "run") === command), command);

const actionInvocations = (source, action) => source.split(/\r?\n/).filter((line) => line.trim() === `uses: ${action}`);

const stepIndex = (allSteps, step) => {
  const index = allSteps.indexOf(step);
  assert.notEqual(index, -1, "required workflow step was not found");
  return index;
};

const validateWorkflow = (source) => {
  assert.match(source, /^on:\n  push:\n    branches: \[main\]\n    paths:\n(?:      - .+\n){2,}  workflow_dispatch:/m);
  assert.match(source, /^      - "site\/\*\*"$/m);
  assert.match(source, /^      - "\.github\/workflows\/pages\.yml"$/m);
  assert.doesNotMatch(source, /^\s*pull_request\s*:/m);

  const deployment = deployJob(source);
  const allSteps = steps(deployment);
  const actions = [
    "actions/checkout@v6",
    "actions/setup-node@v6",
    "actions/configure-pages@v5",
    "actions/upload-pages-artifact@v4",
    "actions/deploy-pages@v4",
  ];
  const actionSteps = new Map(actions.map((action) => [action, actionStep(allSteps, action)]));
  for (const action of ["actions/upload-pages-artifact@v4", "actions/deploy-pages@v4"]) {
    assert.equal(actionInvocations(source, action).length, 1, `expected exactly one ${action} invocation across all jobs`);
  }

  const nodeConfiguration = block(actionSteps.get("actions/setup-node@v6").join("\n"), 8, "with");
  assert.equal(scalar(nodeConfiguration, 10, "node-version"), "24");

  const uploadConfiguration = block(actionSteps.get("actions/upload-pages-artifact@v4").join("\n"), 8, "with");
  assert.equal(scalar(uploadConfiguration, 10, "path"), "site");

  const permissionBlock = block(source, 0, "permissions");
  assert.deepEqual(
    permissionBlock.slice(1).filter(Boolean).map((line) => {
      const [permission, value] = line.trim().split(": ");
      return [permission, value];
    }).sort(),
    [["contents", "read"], ["id-token", "write"], ["pages", "write"]],
  );

  const environment = block(deployment.join("\n"), 4, "environment");
  assert.equal(scalar(environment, 6, "name"), "github-pages");
  assert.equal(scalar(environment, 6, "url"), "${{ steps.deployment.outputs.page_url }}");

  const concurrency = block(source, 0, "concurrency");
  assert.equal(scalar(concurrency, 2, "group"), "pages");
  assert.equal(scalar(concurrency, 2, "cancel-in-progress"), "false");

  const orderedSteps = [
    runStep(allSteps, "npm ci"),
    runStep(allSteps, "npx playwright install --with-deps chromium"),
    runStep(allSteps, "npm test"),
    actionSteps.get("actions/configure-pages@v5"),
    actionSteps.get("actions/upload-pages-artifact@v4"),
    actionSteps.get("actions/deploy-pages@v4"),
  ].map((step) => stepIndex(allSteps, step));
  for (let index = 1; index < orderedSteps.length; index += 1) {
    assert.ok(orderedSteps[index - 1] < orderedSteps[index], "dependency installation, tests, Pages packaging, and deployment must stay ordered");
  }
};

test("deploys only the site directory through the approved Pages workflow", async () => {
  validateWorkflow(await workflow());
});

test("scopes Pages deployment validation to jobs.deploy", async () => {
  const source = await workflow();
  const withPreflight = source.replace(
    "  deploy:\n",
    "  preflight:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Read deployment inputs\n        run: echo ready\n  deploy:\n",
  );

  assert.doesNotThrow(() => validateWorkflow(withPreflight));
});

test("rejects policy-breaking Pages workflow mutations", async () => {
  const source = await workflow();
  const extraUpload = source.replace(
    "      - name: Deploy\n        id: deployment",
    "      - name: Upload duplicate\n        uses: actions/upload-pages-artifact@v4\n        with:\n          path: site\n      - name: Deploy\n        id: deployment",
  );
  const configureBeforeTests = source.replace(
    "      - name: Verify site\n        run: npm test\n      - name: Configure Pages\n        uses: actions/configure-pages@v5",
    "      - name: Configure Pages\n        uses: actions/configure-pages@v5\n      - name: Verify site\n        run: npm test",
  );
  const secondJobUpload = `${source}\n  audit-upload:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Upload an invalid artifact\n        uses: actions/upload-pages-artifact@v4\n        with:\n          path: .\n`;
  const secondJobDeploy = `${source}\n  audit-deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Deploy a second time\n        uses: actions/deploy-pages@v4\n`;

  for (const [name, mutation] of [
    ["a root artifact path", source.replace("path: site", "path: .")],
    ["an extra artifact upload", extraUpload],
    ["a preview environment", source.replace("name: github-pages", "name: preview")],
    ["a non-Pages concurrency group", source.replace("group: pages", "group: profile")],
    ["configuration before tests", configureBeforeTests],
    ["a second job that uploads a root artifact", secondJobUpload],
    ["a second job that deploys Pages", secondJobDeploy],
  ]) assert.throws(() => validateWorkflow(mutation), name);
});
