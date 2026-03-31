import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const PLUGIN_ROOT = path.join(ROOT, "plugins", "copilot");

function read(relativePath) {
  return fs.readFileSync(path.join(PLUGIN_ROOT, relativePath), "utf8");
}

test("review command uses AskUserQuestion and background Bash while staying review-only", () => {
  const source = read("commands/review.md");
  assert.match(source, /AskUserQuestion/);
  assert.match(source, /\bBash\(/);
  assert.match(source, /Do not fix issues/i);
  assert.match(source, /review-only/i);
  assert.match(source, /return Copilot's output verbatim to the user/i);
  assert.match(source, /```bash/);
  assert.match(source, /run_in_background:\s*true/);
  assert.match(source, /command:\s*`node "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/copilot-companion\.mjs" review "\$ARGUMENTS"`/);
  assert.match(source, /description:\s*"Copilot review"/);
});

test("adversarial review command uses AskUserQuestion and background Bash while staying review-only", () => {
  const source = read("commands/adversarial-review.md");
  assert.match(source, /AskUserQuestion/);
  assert.match(source, /\bBash\(/);
  assert.match(source, /Do not fix issues/i);
  assert.match(source, /review-only/i);
  assert.match(source, /return Copilot's output verbatim to the user/i);
  assert.match(source, /```bash/);
  assert.match(source, /run_in_background:\s*true/);
  assert.match(source, /command:\s*`node "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/copilot-companion\.mjs" adversarial-review "\$ARGUMENTS"`/);
  assert.match(source, /description:\s*"Copilot adversarial review"/);
});

test("command files list matches the expected set", () => {
  const commandFiles = fs.readdirSync(path.join(PLUGIN_ROOT, "commands")).sort();
  assert.deepEqual(commandFiles, [
    "adversarial-review.md",
    "cancel.md",
    "rescue.md",
    "result.md",
    "review.md",
    "setup.md",
    "status.md"
  ]);
});

test("rescue command delegates to the copilot-rescue subagent", () => {
  const rescue = read("commands/rescue.md");
  assert.match(rescue, /--background\|--wait/);
  assert.match(rescue, /--resume\|--fresh/);
  assert.match(rescue, /AskUserQuestion/);
  assert.match(rescue, /run the `copilot:copilot-rescue` subagent/i);
});

test("result and cancel commands are deterministic runtime entrypoints", () => {
  const result = read("commands/result.md");
  const cancel = read("commands/cancel.md");
  assert.match(result, /disable-model-invocation:\s*true/);
  assert.match(result, /copilot-companion\.mjs" result \$ARGUMENTS/);
  assert.match(cancel, /disable-model-invocation:\s*true/);
  assert.match(cancel, /copilot-companion\.mjs" cancel \$ARGUMENTS/);
});

test("setup command references copilot install", () => {
  const setup = read("commands/setup.md");
  assert.match(setup, /AskUserQuestion/);
  assert.match(setup, /npm install -g @github\/copilot/);
  assert.match(setup, /copilot-companion\.mjs" setup --json \$ARGUMENTS/);
});
