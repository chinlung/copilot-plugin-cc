import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { buildEnv, installFakeCopilot } from "./fake-copilot-fixture.mjs";
import { initGitRepo, makeTempDir, run } from "./helpers.mjs";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const PLUGIN_ROOT = path.join(ROOT, "plugins", "copilot");
const SCRIPT = path.join(PLUGIN_ROOT, "scripts", "copilot-companion.mjs");

test("setup reports ready when fake copilot is installed and authenticated", () => {
  const binDir = makeTempDir();
  installFakeCopilot(binDir);

  const result = run("node", [SCRIPT, "setup", "--json"], {
    cwd: ROOT,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ready, true);
  assert.equal(payload.copilot.available, true);
});

test("setup detects when copilot is unavailable", () => {
  const binDir = makeTempDir();
  installFakeCopilot(binDir, "unavailable");

  const result = run("node", [SCRIPT, "setup", "--json"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      COPILOT_GITHUB_TOKEN: "fake-token"
    }
  });

  // Setup should report not ready
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ready, false);
});

test("review renders output from copilot CLI", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeCopilot(binDir);
  initGitRepo(repo);
  fs.mkdirSync(path.join(repo, "src"));
  fs.writeFileSync(path.join(repo, "src", "app.js"), "export const value = 1;\n");
  run("git", ["add", "src/app.js"], { cwd: repo });
  run("git", ["commit", "-m", "init"], { cwd: repo });
  fs.writeFileSync(path.join(repo, "src", "app.js"), "export const value = 2;\n");

  const result = run("node", [SCRIPT, "review"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Reviewed uncommitted changes/);
  assert.match(result.stdout, /No material issues found/);
});

test("adversarial review renders structured findings", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeCopilot(binDir);
  initGitRepo(repo);
  fs.mkdirSync(path.join(repo, "src"));
  fs.writeFileSync(path.join(repo, "src", "app.js"), "export const value = items[0];\n");
  run("git", ["add", "src/app.js"], { cwd: repo });
  run("git", ["commit", "-m", "init"], { cwd: repo });
  fs.writeFileSync(path.join(repo, "src", "app.js"), "export const value = items[0].id;\n");

  const result = run("node", [SCRIPT, "adversarial-review"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Missing empty-state guard/);
});

test("task delegates work and returns output", () => {
  const repo = makeTempDir();
  const binDir = makeTempDir();
  installFakeCopilot(binDir);
  initGitRepo(repo);
  fs.writeFileSync(path.join(repo, "README.md"), "hello\n");
  run("git", ["add", "README.md"], { cwd: repo });
  run("git", ["commit", "-m", "init"], { cwd: repo });

  const result = run("node", [SCRIPT, "task", "fix the failing test"], {
    cwd: repo,
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Handled the requested task/);
});

test("status command runs without error", () => {
  const workspace = makeTempDir();

  const result = run("node", [SCRIPT, "status"], {
    cwd: workspace,
    env: {
      ...process.env,
      COPILOT_GITHUB_TOKEN: "fake-token"
    }
  });

  // status may report no jobs or succeed
  assert.equal(result.status, 0, result.stderr);
});

test("fake copilot fixture tracks invocations and arguments", () => {
  const binDir = makeTempDir();
  installFakeCopilot(binDir);
  const statePath = path.join(binDir, "fake-copilot-state.json");

  run("node", [path.join(binDir, "copilot"), "-p", "test prompt", "-s", "system prompt"], {
    env: buildEnv(binDir)
  });

  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert.equal(state.invocations, 1);
  assert.equal(state.lastPrompt, "test prompt");
  assert.equal(state.lastSystem, "system prompt");
});

test("fake copilot reports version", () => {
  const binDir = makeTempDir();
  installFakeCopilot(binDir);

  const result = run("node", [path.join(binDir, "copilot"), "--version"], {
    env: buildEnv(binDir)
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /copilot-cli test/);
});
