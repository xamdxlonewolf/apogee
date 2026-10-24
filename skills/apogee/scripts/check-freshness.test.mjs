import assert from "node:assert/strict";
import test from "node:test";
import {
  combineSides,
  compareApex,
  compareDb,
  matchingDenyGlob,
  textHash,
  topReleaseVersion,
} from "./check-freshness.mjs";

const apexRemote = {
  versionDirs: ["26.1", "26.2"],
  releasePath: "apex/apexlang/26.1/apexlang-generation/release-notes.json",
  releaseVersion: "2026.09.21",
  skillHash: textHash("version router"),
};

test("matching apex trees are current", () => {
  const result = compareApex(
    {
      exists: true,
      versionDirs: ["26.2", "26.1"],
      releasePath: apexRemote.releasePath,
      releaseVersion: "2026.09.21",
      skillHash: apexRemote.skillHash,
    },
    apexRemote,
  );
  assert.equal(result.status, "current");
  assert.deepEqual(result.facts, []);
});

test("a flat local apex tree is drifted", () => {
  const result = compareApex(
    {
      exists: true,
      versionDirs: [],
      releasePath: "apex/apexlang/release-notes.json",
      releaseVersion: "2026.06.04",
      skillHash: textHash("flat router"),
    },
    apexRemote,
  );
  assert.equal(result.status, "drifted");
  assert.equal(result.facts.length, 3);
});

test("a missing apex skill is missing", () => {
  assert.equal(compareApex({ exists: false }, apexRemote).status, "missing");
});

test("no remote apex snapshot is unreachable", () => {
  assert.equal(compareApex({ exists: true }, null).status, "unreachable");
});

test("matching db trees are current and a different router is drifted", () => {
  const remote = { categories: ["agent", "sqlcl"], skillHash: textHash("db") };
  assert.equal(
    compareDb({ exists: true, categories: ["sqlcl", "agent"], skillHash: remote.skillHash }, remote).status,
    "current",
  );
  assert.equal(
    compareDb({ exists: true, categories: ["agent"], skillHash: textHash("old") }, remote).status,
    "drifted",
  );
});

test("drift stops work and an unreachable GitHub check does not", () => {
  assert.deepEqual(combineSides([{ status: "current" }, { status: "drifted" }]), {
    status: "drifted",
    continue_work: false,
  });
  assert.deepEqual(combineSides([{ status: "unreachable" }]), {
    status: "unreachable",
    continue_work: true,
  });
  assert.equal(combineSides([{ status: "missing" }]).continue_work, false);
});

test("the first release version is the pin", () => {
  const text = JSON.stringify({ releases: [{ version: "2026.09.21" }, { version: "2026.06.04" }] });
  assert.equal(topReleaseVersion(text), "2026.09.21");
});

test("deny globs match project paths and ignore backslashes", () => {
  const globs = ["Deployments/**", "Deployment.txt"];
  assert.equal(matchingDenyGlob(globs, "Deployments/app.sql"), "Deployments/**");
  assert.equal(matchingDenyGlob(globs, "apps\\Deployment.txt"), null);
  assert.equal(matchingDenyGlob(globs, "Deployment.txt"), "Deployment.txt");
  assert.equal(matchingDenyGlob([], "Deployment.txt"), null);
});
