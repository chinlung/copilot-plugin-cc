import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { buildEnv, installFakeCopilot } from "./fake-copilot-fixture.mjs";
import { makeTempDir } from "./helpers.mjs";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");

const { spawnCopilot } = await import(
  path.join(ROOT, "plugins", "copilot", "scripts", "lib", "copilot-runner.mjs")
);

function readFakeState(binDir) {
  const statePath = path.join(binDir, "fake-copilot-state.json");
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function withFakeCopilot(fn) {
  return async () => {
    const binDir = makeTempDir();
    installFakeCopilot(binDir);
    const env = buildEnv(binDir);

    const originalEnv = { ...process.env };
    Object.assign(process.env, env);
    try {
      await fn(binDir);
    } finally {
      for (const key of Object.keys(env)) {
        if (originalEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalEnv[key];
        }
      }
    }
  };
}

test(
  "spawnCopilot: passes prompt with -p and -s flags",
  withFakeCopilot(async (binDir) => {
    const result = await spawnCopilot(binDir, { prompt: "test prompt" });
    assert.equal(result.status, 0);
    const state = readFakeState(binDir);
    assert.ok(state.lastArgs.includes("-p"));
    assert.ok(state.lastArgs.includes("test prompt"));
    assert.ok(state.lastArgs.includes("-s"));
  })
);

test(
  "spawnCopilot: passes --agent flag",
  withFakeCopilot(async (binDir) => {
    await spawnCopilot(binDir, { prompt: "review code", agent: "code-review" });
    const state = readFakeState(binDir);
    assert.ok(state.lastArgs.includes("--agent=code-review"));
  })
);

test(
  "spawnCopilot: passes --no-ask-user by default",
  withFakeCopilot(async (binDir) => {
    await spawnCopilot(binDir, { prompt: "hello" });
    const state = readFakeState(binDir);
    assert.ok(state.lastArgs.includes("--no-ask-user"));
  })
);

test(
  "spawnCopilot: omits --no-ask-user when noAskUser is false",
  withFakeCopilot(async (binDir) => {
    await spawnCopilot(binDir, { prompt: "hello", noAskUser: false });
    const state = readFakeState(binDir);
    assert.ok(!state.lastArgs.includes("--no-ask-user"));
  })
);

test(
  "spawnCopilot: passes --output-format flag",
  withFakeCopilot(async (binDir) => {
    await spawnCopilot(binDir, { prompt: "review", outputFormat: "json" });
    const state = readFakeState(binDir);
    assert.ok(state.lastArgs.includes("--output-format=json"));
  })
);

test(
  "spawnCopilot: passes --model flag",
  withFakeCopilot(async (binDir) => {
    await spawnCopilot(binDir, { prompt: "hello", model: "claude-sonnet-4-5" });
    const state = readFakeState(binDir);
    assert.ok(state.lastArgs.includes("--model=claude-sonnet-4-5"));
  })
);

test(
  "spawnCopilot: passes --allow-all flag",
  withFakeCopilot(async (binDir) => {
    await spawnCopilot(binDir, { prompt: "do stuff", allowAll: true });
    const state = readFakeState(binDir);
    assert.ok(state.lastArgs.includes("--allow-all"));
  })
);

test(
  "spawnCopilot: passes --allow-tool flags",
  withFakeCopilot(async (binDir) => {
    await spawnCopilot(binDir, {
      prompt: "hello",
      allowTools: ["read_file", "write_file"]
    });
    const state = readFakeState(binDir);
    assert.ok(state.lastArgs.includes("--allow-tool=read_file"));
    assert.ok(state.lastArgs.includes("--allow-tool=write_file"));
  })
);

test(
  "spawnCopilot: passes --share flag",
  withFakeCopilot(async (binDir) => {
    await spawnCopilot(binDir, {
      prompt: "hello",
      sharePath: "/tmp/transcript.json"
    });
    const state = readFakeState(binDir);
    assert.ok(state.lastArgs.includes("--share=/tmp/transcript.json"));
  })
);

test(
  "spawnCopilot: captures stdout",
  withFakeCopilot(async (binDir) => {
    const result = await spawnCopilot(binDir, { prompt: "do a task" });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Handled the requested task/);
  })
);

test("spawnCopilot: returns error for unavailable binary", async () => {
  const binDir = makeTempDir();
  const originalPath = process.env.PATH;
  process.env.PATH = binDir;
  try {
    const result = await spawnCopilot(binDir, { prompt: "hello" });
    assert.equal(result.status, 1);
    assert.ok(result.error);
  } finally {
    process.env.PATH = originalPath;
  }
});

test(
  "spawnCopilot: minimal options only produce -p, -s, --no-ask-user",
  withFakeCopilot(async (binDir) => {
    await spawnCopilot(binDir, { prompt: "minimal" });
    const state = readFakeState(binDir);
    const args = state.lastArgs;
    assert.ok(args.includes("-p"));
    assert.ok(args.includes("minimal"));
    assert.ok(args.includes("-s"));
    assert.ok(args.includes("--no-ask-user"));
    assert.ok(!args.some((a) => a.startsWith("--agent=")));
    assert.ok(!args.some((a) => a.startsWith("--model=")));
    assert.ok(!args.some((a) => a.startsWith("--output-format=")));
    assert.ok(!args.includes("--allow-all"));
    assert.ok(!args.some((a) => a.startsWith("--allow-tool=")));
    assert.ok(!args.some((a) => a.startsWith("--share=")));
  })
);
