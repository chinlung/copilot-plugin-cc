import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function makeTempDir(prefix = "copilot-plugin-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function writeExecutable(filePath, source) {
  fs.writeFileSync(filePath, source, { encoding: "utf8", mode: 0o755 });
}

export function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    input: options.input
  });
}

/**
 * Run `fn` with `envOverrides` merged into `process.env`, then restore the
 * entire original environment — including deleting keys that did not exist
 * before and reinstating keys that the test body may have removed.
 * Works with both sync and async `fn`.
 *
 * Keys whose value is `undefined` in `envOverrides` are deleted from the env
 * before calling `fn`, and restored afterwards.
 */
export function withEnv(envOverrides, fn) {
  return async () => {
    const originalEnv = { ...process.env };
    for (const [key, value] of Object.entries(envOverrides)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    try {
      return await fn();
    } finally {
      // Restore every key we touched back to its original state.
      for (const key of Object.keys(envOverrides)) {
        if (originalEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalEnv[key];
        }
      }
    }
  };
}

export function initGitRepo(cwd) {
  run("git", ["init", "-b", "main"], { cwd });
  run("git", ["config", "user.name", "Copilot Plugin Tests"], { cwd });
  run("git", ["config", "user.email", "tests@example.com"], { cwd });
  run("git", ["config", "commit.gpgsign", "false"], { cwd });
  run("git", ["config", "tag.gpgsign", "false"], { cwd });
}
