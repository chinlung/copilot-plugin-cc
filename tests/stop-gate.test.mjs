import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { buildEnv, installFakeCopilot } from "./fake-copilot-fixture.mjs";
import { makeTempDir } from "./helpers.mjs";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const PLUGIN_ROOT = path.join(ROOT, "plugins", "copilot");

const { parseStopReviewOutput, buildSetupNote, filterJobsForCurrentSession } =
  await import(path.join(PLUGIN_ROOT, "scripts", "lib", "stop-gate.mjs"));

// --- parseStopReviewOutput ---

test("parseStopReviewOutput: ALLOW prefix returns ok", () => {
  const result = parseStopReviewOutput("ALLOW: looks good");
  assert.equal(result.ok, true);
  assert.equal(result.reason, null);
});

test("parseStopReviewOutput: ALLOW with empty suffix returns ok", () => {
  const result = parseStopReviewOutput("ALLOW:");
  assert.equal(result.ok, true);
  assert.equal(result.reason, null);
});

test("parseStopReviewOutput: BLOCK prefix returns not ok with reason", () => {
  const result = parseStopReviewOutput("BLOCK: missing error handling");
  assert.equal(result.ok, false);
  assert.match(result.reason, /missing error handling/);
  assert.match(result.reason, /stop-time review found issues/);
});

test("parseStopReviewOutput: BLOCK with empty suffix uses full text as reason", () => {
  const result = parseStopReviewOutput("BLOCK:\ndetails on next line");
  assert.equal(result.ok, false);
  assert.match(result.reason, /BLOCK:\ndetails on next line/);
});

test("parseStopReviewOutput: empty output returns not ok", () => {
  const result = parseStopReviewOutput("");
  assert.equal(result.ok, false);
  assert.match(result.reason, /no final output/);
});

test("parseStopReviewOutput: null output returns not ok", () => {
  const result = parseStopReviewOutput(null);
  assert.equal(result.ok, false);
  assert.match(result.reason, /no final output/);
});

test("parseStopReviewOutput: undefined output returns not ok", () => {
  const result = parseStopReviewOutput(undefined);
  assert.equal(result.ok, false);
  assert.match(result.reason, /no final output/);
});

test("parseStopReviewOutput: no prefix returns unexpected answer", () => {
  const result = parseStopReviewOutput("some random copilot output");
  assert.equal(result.ok, false);
  assert.match(result.reason, /unexpected answer/);
});

test("parseStopReviewOutput: multiline ALLOW uses first line only", () => {
  const result = parseStopReviewOutput("ALLOW: fine\nBLOCK: ignored");
  assert.equal(result.ok, true);
  assert.equal(result.reason, null);
});

test("parseStopReviewOutput: multiline BLOCK uses first line reason", () => {
  const result = parseStopReviewOutput("BLOCK: problem found\nextra detail");
  assert.equal(result.ok, false);
  assert.match(result.reason, /problem found/);
});

// --- buildSetupNote ---

function withEnv(envOverrides, fn) {
  return () => {
    const originalEnv = { ...process.env };
    // Remove token vars so tests control auth state explicitly
    delete process.env.COPILOT_GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
    Object.assign(process.env, envOverrides);
    try {
      return fn();
    } finally {
      for (const key of Object.keys(process.env)) {
        if (originalEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalEnv[key];
        }
      }
    }
  };
}

test("buildSetupNote: returns null when authenticated", () => {
  const binDir = makeTempDir();
  installFakeCopilot(binDir);
  withEnv(buildEnv(binDir), () => {
    const note = buildSetupNote(binDir);
    assert.equal(note, null);
  })();
});

test("buildSetupNote: returns error message when not authenticated", () => {
  const binDir = makeTempDir();
  installFakeCopilot(binDir);
  withEnv({ PATH: `${binDir}:${process.env.PATH}` }, () => {
    const note = buildSetupNote(binDir);
    assert.ok(note);
    assert.match(note, /not set up for the review gate/);
    assert.match(note, /COPILOT_GITHUB_TOKEN/);
  })();
});

// --- filterJobsForCurrentSession ---

test("filterJobsForCurrentSession: returns all jobs when no session id", () => {
  const jobs = [
    { id: "1", sessionId: "a" },
    { id: "2", sessionId: "b" }
  ];
  const result = filterJobsForCurrentSession(jobs, {});
  assert.equal(result.length, 2);
});

test("filterJobsForCurrentSession: filters by session_id from input", () => {
  const jobs = [
    { id: "1", sessionId: "a" },
    { id: "2", sessionId: "b" },
    { id: "3", sessionId: "a" }
  ];
  const result = filterJobsForCurrentSession(jobs, { session_id: "a" });
  assert.equal(result.length, 2);
  assert.ok(result.every((j) => j.sessionId === "a"));
});

test("filterJobsForCurrentSession: returns empty when no match", () => {
  const jobs = [{ id: "1", sessionId: "a" }];
  const result = filterJobsForCurrentSession(jobs, {
    session_id: "nonexistent"
  });
  assert.equal(result.length, 0);
});
