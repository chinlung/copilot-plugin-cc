/**
 * @typedef {(update: string | { message: string, phase: string|null }) => void} ProgressReporter
 */

import { readJsonFile } from "./fs.mjs";
import { binaryAvailable, runCommand } from "./process.mjs";
import { spawnCopilot } from "./copilot-runner.mjs";

const MODEL_ALIASES = new Map([
  ["opus", "claude-opus-4.5"],
  ["sonnet", "claude-sonnet-4.5"],
  ["codex", "gpt-5.2-codex"]
]);

function resolveModel(model) {
  if (!model) {
    return undefined;
  }
  return MODEL_ALIASES.get(model) ?? model;
}

function emitProgress(onProgress, message, phase = null) {
  if (!onProgress || !message) {
    return;
  }
  if (!phase) {
    onProgress(message);
    return;
  }
  onProgress({ message, phase });
}

/**
 * Check whether the `copilot` binary is available.
 * @param {string} cwd
 * @returns {{ available: boolean, detail: string }}
 */
export function getCopilotAvailability(cwd) {
  return binaryAvailable("copilot", ["--version"], { cwd });
}

/**
 * Check Copilot auth status by looking for known token env vars
 * and verifying the binary works.  Falls back to `gh auth token`
 * when no explicit env var is set.
 * @param {string} cwd
 * @returns {{ available: boolean, loggedIn: boolean, detail: string }}
 */
export function getCopilotAuthStatus(cwd) {
  const availability = getCopilotAvailability(cwd);
  if (!availability.available) {
    return {
      available: false,
      loggedIn: false,
      detail: availability.detail
    };
  }

  const tokenEnvVars = ["COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"];
  const foundToken = tokenEnvVars.find((name) => process.env[name]);

  if (foundToken) {
    return {
      available: true,
      loggedIn: true,
      detail: `authenticated via ${foundToken}`
    };
  }

  // Fallback: derive token from gh CLI when already authenticated.
  const gh = runCommand("gh", ["auth", "token"], { cwd });
  if (gh.status === 0 && gh.stdout.trim()) {
    process.env.GH_TOKEN = gh.stdout.trim();
    return {
      available: true,
      loggedIn: true,
      detail: "authenticated via gh auth token"
    };
  }

  return {
    available: true,
    loggedIn: false,
    detail: "no COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN found in environment; gh auth also unavailable"
  };
}

/**
 * Run a Copilot code review.
 * @param {string} cwd
 * @param {object} options
 * @param {object} options.target - Review target
 * @param {string} [options.model]
 * @param {ProgressReporter} [options.onProgress]
 * @param {string} [options.threadName]
 * @returns {Promise<{ status: number, reviewText: string, stderr: string, reasoningSummary: string[] }>}
 */
export async function runCopilotReview(cwd, options = {}) {
  const availability = getCopilotAvailability(cwd);
  if (!availability.available) {
    throw new Error(
      "Copilot CLI is not installed. Install GitHub Copilot CLI, then retry."
    );
  }

  const target = options.target ?? {};
  let prompt;
  if (target.uncommittedChanges) {
    prompt =
      "Review the current working tree changes. Identify bugs, security issues, performance problems, and code quality concerns. Provide a structured review with severity ratings.";
  } else if (target.baseBranch) {
    prompt = `Review all branch changes compared to ${target.baseBranch}. Identify bugs, security issues, performance problems, and code quality concerns. Provide a structured review with severity ratings.`;
  } else {
    prompt =
      "Review the current code changes. Identify bugs, security issues, performance problems, and code quality concerns. Provide a structured review with severity ratings.";
  }

  emitProgress(options.onProgress, "Starting Copilot code review.", "starting");

  const result = await spawnCopilot(cwd, {
    prompt,
    model: resolveModel(options.model),
    outputFormat: "json",
    noAskUser: true,
    onStderr: options.onProgress
      ? (line) => emitProgress(options.onProgress, line, "reviewing")
      : undefined
  });

  const reviewText =
    result.jsonOutput?.review ??
    result.jsonOutput?.message ??
    result.stdout.trim();

  const reasoningSummary = [];
  if (result.jsonOutput?.reasoning) {
    const raw = result.jsonOutput.reasoning;
    if (typeof raw === "string") {
      reasoningSummary.push(raw);
    } else if (Array.isArray(raw)) {
      reasoningSummary.push(...raw.filter((s) => typeof s === "string"));
    }
  }

  return {
    status: result.status,
    reviewText,
    stderr: result.stderr,
    reasoningSummary
  };
}

/**
 * Run a Copilot task (general agent execution).
 * @param {string} cwd
 * @param {object} options
 * @param {string} options.prompt
 * @param {string} [options.model]
 * @param {string} [options.sandbox] - "workspace-write" or "read-only"
 * @param {ProgressReporter} [options.onProgress]
 * @param {object} [options.outputSchema]
 * @param {string} [options.sharePath]
 * @param {string} [options.resume]
 * @param {boolean} [options.continue]
 * @param {boolean} [options.autopilot]
 * @param {number} [options.maxAutopilotContinues]
 * @param {boolean} [options.shareGist]
 * @returns {Promise<{ status: number, finalMessage: string, stderr: string, touchedFiles: string[] }>}
 */
export async function runCopilotTask(cwd, options = {}) {
  const availability = getCopilotAvailability(cwd);
  if (!availability.available) {
    throw new Error(
      "Copilot CLI is not installed. Install GitHub Copilot CLI, then retry."
    );
  }

  let prompt = options.prompt ?? "";
  if (options.outputSchema) {
    const schemaJson = JSON.stringify(options.outputSchema, null, 2);
    prompt += `\n\nReturn your final output as JSON matching this schema:\n${schemaJson}`;
  }

  if (!prompt.trim()) {
    throw new Error("A prompt is required for this Copilot task.");
  }

  emitProgress(options.onProgress, "Starting Copilot task.", "starting");

  const allowAll = options.sandbox === "workspace-write";

  const result = await spawnCopilot(cwd, {
    prompt,
    model: resolveModel(options.model),
    noAskUser: true,
    allowAll,
    sharePath: options.sharePath,
    resume: options.resume,
    continue: options.continue,
    autopilot: options.autopilot,
    maxAutopilotContinues: options.maxAutopilotContinues,
    shareGist: options.shareGist,
    onStderr: options.onProgress
      ? (line) => emitProgress(options.onProgress, line, "running")
      : undefined
  });

  const finalMessage =
    result.jsonOutput?.message ?? result.stdout.trim();

  return {
    status: result.status,
    finalMessage,
    stderr: result.stderr,
    touchedFiles: []
  };
}

/**
 * Parse structured JSON output from a raw string.
 * @param {string} rawOutput
 * @param {object} [fallback]
 * @returns {{ parsed: object|null, parseError: string|null, rawOutput: string }}
 */
export function parseStructuredOutput(rawOutput, fallback = {}) {
  if (!rawOutput) {
    return {
      parsed: null,
      parseError:
        fallback.failureMessage ??
        "Copilot did not return a final structured message.",
      rawOutput: rawOutput ?? "",
      ...fallback
    };
  }

  try {
    return {
      parsed: JSON.parse(rawOutput),
      parseError: null,
      rawOutput,
      ...fallback
    };
  } catch (error) {
    return {
      parsed: null,
      parseError: error.message,
      rawOutput,
      ...fallback
    };
  }
}

/**
 * Read an output schema from a JSON file.
 * @param {string} schemaPath
 * @returns {object}
 */
export function readOutputSchema(schemaPath) {
  return readJsonFile(schemaPath);
}

export { MODEL_ALIASES };
