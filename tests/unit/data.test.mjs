import assert from "node:assert/strict";
import test from "node:test";
import { PROJECTS } from "../../site/data.js";

const expectedSnapshot = [
  { id: "oauth2", starSnapshot: 7 },
  { id: "vox", starSnapshot: 2 },
  { id: "illustrations", starSnapshot: 1 },
  { id: "jinjing", starSnapshot: 1 },
];

test("exports the four approved projects with safe GitHub URLs", () => {
  assert.deepEqual(PROJECTS.map(({ id }) => id), expectedSnapshot.map(({ id }) => id));
  assert.equal(PROJECTS.length, 4);
  for (const project of PROJECTS) {
    assert.match(project.repo, /^https:\/\/github\.com\/wz20\//);
    assert.ok(project.description.length >= 24);
    assert.ok(project.tags.length >= 2);
  }
});

test("orders projects by the recorded star snapshot with a stable tie", () => {
  assert.deepEqual(
    PROJECTS.map(({ id, starSnapshot }) => ({ id, starSnapshot })),
    expectedSnapshot,
  );
  assert.ok(PROJECTS.every((project, index) => index === 0 || PROJECTS[index - 1].starSnapshot >= project.starSnapshot));
  assert.deepEqual(PROJECTS.filter(({ starSnapshot }) => starSnapshot === 1).map(({ id }) => id), ["illustrations", "jinjing"]);
});
