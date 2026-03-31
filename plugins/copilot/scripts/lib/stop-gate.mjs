import process from "node:process";

import { getCopilotAuthStatus } from "./copilot.mjs";
import { SESSION_ID_ENV } from "./tracked-jobs.mjs";

/**
 * Filter jobs to only those matching the current session.
 * @param {object[]} jobs
 * @param {object} [input]
 * @param {string} [input.session_id]
 * @returns {object[]}
 */
export function filterJobsForCurrentSession(jobs, input = {}) {
  const sessionId = input.session_id || process.env[SESSION_ID_ENV] || null;
  if (!sessionId) {
    return jobs;
  }
  return jobs.filter((job) => job.sessionId === sessionId);
}

/**
 * Check Copilot auth and return a setup note if not authenticated, or null if ready.
 * @param {string} cwd
 * @returns {string|null}
 */
export function buildSetupNote(cwd) {
  const authStatus = getCopilotAuthStatus(cwd);
  if (authStatus.loggedIn) {
    return null;
  }

  const detail = authStatus.detail ? ` ${authStatus.detail}.` : "";
  return `Copilot is not set up for the review gate.${detail} Set COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable and run /copilot:setup.`;
}

/**
 * Parse raw output from a stop-review Copilot task.
 * @param {string} rawOutput
 * @returns {{ ok: boolean, reason: string|null }}
 */
export function parseStopReviewOutput(rawOutput) {
  const text = String(rawOutput ?? "").trim();
  if (!text) {
    return {
      ok: false,
      reason:
        "The stop-time Copilot review task returned no final output. Run /copilot:review --wait manually or bypass the gate."
    };
  }

  const firstLine = text.split(/\r?\n/, 1)[0].trim();
  if (firstLine.startsWith("ALLOW:")) {
    return { ok: true, reason: null };
  }
  if (firstLine.startsWith("BLOCK:")) {
    const reason = firstLine.slice("BLOCK:".length).trim() || text;
    return {
      ok: false,
      reason: `Copilot stop-time review found issues that still need fixes before ending the session: ${reason}`
    };
  }

  return {
    ok: false,
    reason:
      "The stop-time Copilot review task returned an unexpected answer. Run /copilot:review --wait manually or bypass the gate."
  };
}
