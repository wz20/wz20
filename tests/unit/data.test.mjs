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
