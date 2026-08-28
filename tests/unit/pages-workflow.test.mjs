import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseDocument } from "yaml";

const workflowUrl = new URL("../../.github/workflows/pages.yml", import.meta.url);

const workflow = () => readFile(workflowUrl, "utf8");

const record = (value, label) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `expected ${label} to be a mapping`);
  return value;
};

const exactlyOne = (items, label) => {
  assert.equal(items.length, 1, `expected exactly one ${label}`);
  return items[0];
};

const parseWorkflow = (source) => {
  const document = parseDocument(source);
  assert.equal(document.errors.length, 0, document.errors.map((error) => error.message).join("\n"));
  return record(document.toJS(), "workflow");
};

const uses = (step) => typeof step?.uses === "string" ? step.uses.trim() : undefined;

const validateWorkflow = (source) => {
  const parsed = parseWorkflow(source);

  const triggers = record(parsed.on, "top-level on");
  assert.deepEqual(Object.keys(triggers).sort(), ["push", "workflow_dispatch"]);
  const push = record(triggers.push, "push trigger");
  assert.deepEqual(push, {
    branches: ["main"],
    paths: ["site/**", ".github/workflows/pages.yml"],
  });
  assert.ok(
    triggers.workflow_dispatch === null
      || (typeof triggers.workflow_dispatch === "object" && Object.keys(triggers.workflow_dispatch).length === 0),
    "workflow_dispatch must not define inputs or other configuration",
  );

  assert.deepEqual(parsed.permissions, {
    contents: "read",
    pages: "write",
    "id-token": "write",
  });
  assert.deepEqual(parsed.concurrency, { group: "pages", "cancel-in-progress": false });

  const jobs = record(parsed.jobs, "jobs");
  for (const [jobName, job] of Object.entries(jobs)) {
    assert.ok(!Object.hasOwn(record(job, `jobs.${jobName}`), "permissions"), `jobs.${jobName} must not override permissions`);
  }
  const deploy = record(jobs.deploy, "jobs.deploy");
  assert.deepEqual(deploy.environment, {
    name: "github-pages",
    url: "${{ steps.deployment.outputs.page_url }}",
  });
  assert.ok(Array.isArray(deploy.steps), "jobs.deploy must define steps");

  const allSteps = Object.entries(jobs).flatMap(([jobName, job]) => {
    const steps = Array.isArray(job?.steps) ? job.steps : [];
    return steps.map((step, index) => ({ jobName, index, step }));
  });
  const deploymentSteps = deploy.steps.map((step, index) => ({ jobName: "deploy", index, step }));
  const deploymentAction = (action) => exactlyOne(
    deploymentSteps.filter(({ step }) => uses(step) === action),
    `${action} step in jobs.deploy`,
  );
  const actionInvocations = (action) => allSteps.filter(({ step }) => uses(step) === action);

  const checkout = deploymentAction("actions/checkout@v6");
  const setupNode = deploymentAction("actions/setup-node@v6");
  const configure = deploymentAction("actions/configure-pages@v5");
  const upload = deploymentAction("actions/upload-pages-artifact@v4");
  const deployPages = deploymentAction("actions/deploy-pages@v4");

  for (const action of ["actions/upload-pages-artifact@v4", "actions/deploy-pages@v4"]) {
    const invocation = exactlyOne(actionInvocations(action), `${action} invocation across all jobs`);
    assert.equal(invocation.jobName, "deploy", `${action} must run in jobs.deploy`);
  }

  assert.equal(String(record(setupNode.step.with, "setup-node with")["node-version"]), "24");
  assert.equal(record(upload.step.with, "upload-pages-artifact with").path, "site");

  const runStep = (command) => exactlyOne(
    deploymentSteps.filter(({ step }) => step?.run === command),
    `${command} step in jobs.deploy`,
  );
  const orderedSteps = [
    checkout,
    setupNode,
    runStep("npm ci"),
    runStep("npx playwright install --with-deps chromium"),
    runStep("npm test"),
    configure,
    upload,
    deployPages,
  ];
  for (let index = 1; index < orderedSteps.length; index += 1) {
    assert.ok(orderedSteps[index - 1].index < orderedSteps[index].index, "checkout, Node, tests, Pages packaging, and deployment must stay ordered");
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
  const quotedSecondJobUpload = `${source}\n  quoted-audit-upload:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Upload a quoted invalid artifact\n        uses: "actions/upload-pages-artifact@v4" # duplicate\n        with:\n          path: .\n`;
  const commentedSecondJobDeploy = `${source}\n  commented-audit-deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Deploy a commented second time\n        uses: 'actions/deploy-pages@v4' # duplicate\n`;
  const deployJobPermissions = source.replace("  deploy:\n", "  deploy:\n    permissions: write-all\n");
  const preflightJobPermissions = source.replace(
    "  deploy:\n",
    "  preflight:\n    permissions: write-all\n    runs-on: ubuntu-latest\n    steps:\n      - name: Read deployment inputs\n        run: echo ready\n  deploy:\n",
  );
  const tagTrigger = source.replace("    branches: [main]\n", "    branches: [main]\n    tags: [\"v*\"]\n");
  const dispatchInputs = source.replace(
    "  workflow_dispatch:\n",
    "  workflow_dispatch:\n    inputs:\n      target:\n        required: true\n        type: string\n",
  );

  for (const [name, mutation] of [
    ["a root artifact path", source.replace("path: site", "path: .")],
    ["an extra artifact upload", extraUpload],
    ["a preview environment", source.replace("name: github-pages", "name: preview")],
    ["a non-Pages concurrency group", source.replace("group: pages", "group: profile")],
    ["configuration before tests", configureBeforeTests],
    ["a second job that uploads a root artifact", secondJobUpload],
    ["a second job that deploys Pages", secondJobDeploy],
    ["a second job that quotes a Pages upload action", quotedSecondJobUpload],
    ["a second job that comments a Pages deploy action", commentedSecondJobDeploy],
    ["a deploy job permission override", deployJobPermissions],
    ["a preflight job permission override", preflightJobPermissions],
    ["a tag trigger", tagTrigger],
    ["workflow dispatch inputs", dispatchInputs],
  ]) assert.throws(() => validateWorkflow(mutation), name);
});
