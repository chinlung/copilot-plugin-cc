import path from "node:path";

import { writeExecutable } from "./helpers.mjs";

export function installFakeCopilot(binDir, behavior = "review-ok") {
  const statePath = path.join(binDir, "fake-copilot-state.json");
  const scriptPath = path.join(binDir, "copilot");
  const source = `#!/usr/bin/env node
const fs = require("node:fs");

const STATE_PATH = ${JSON.stringify(statePath)};
const BEHAVIOR = ${JSON.stringify(behavior)};

function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return { invocations: 0 };
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

const args = process.argv.slice(2);

if (args[0] === "--version") {
  console.log("copilot-cli test");
  process.exit(0);
}

if (args[0] === "--help") {
  console.log("fake copilot help");
  process.exit(0);
}

const state = loadState();
state.invocations++;
state.lastArgs = args;

let prompt = null;
let system = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "-p" && i + 1 < args.length) {
    prompt = args[i + 1];
    i++;
  } else if (args[i] === "-s" && i + 1 < args.length) {
    system = args[i + 1];
    i++;
  }
}
state.lastPrompt = prompt;
state.lastSystem = system;
saveState(state);

if (BEHAVIOR === "unavailable") {
  console.error("copilot: command not found");
  process.exit(127);
}

if (BEHAVIOR === "auth-failed") {
  console.error("authentication failed: no valid token found");
  process.exit(1);
}

if (prompt && prompt.includes("adversarial")) {
  if (BEHAVIOR === "adversarial-clean") {
    console.log(JSON.stringify({
      verdict: "approve",
      summary: "No material issues found.",
      findings: [],
      next_steps: []
    }));
  } else {
    console.log(JSON.stringify({
      verdict: "needs-attention",
      summary: "One adversarial concern surfaced.",
      findings: [
        {
          severity: "high",
          title: "Missing empty-state guard",
          body: "The change assumes data is always present.",
          file: "src/app.js",
          line_start: 4,
          line_end: 6,
          confidence: 0.87,
          recommendation: "Handle empty collections before indexing."
        }
      ],
      next_steps: ["Add an empty-state test."]
    }));
  }
  process.exit(0);
}

if (prompt && prompt.includes("review")) {
  console.log("Reviewed uncommitted changes.\\nNo material issues found.");
  process.exit(0);
}

console.log("Handled the requested task.\\nTask prompt accepted.");
process.exit(0);
`;
  writeExecutable(scriptPath, source);
}

export function buildEnv(binDir) {
  return {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH}`,
    COPILOT_GITHUB_TOKEN: "fake-token-for-testing"
  };
}
