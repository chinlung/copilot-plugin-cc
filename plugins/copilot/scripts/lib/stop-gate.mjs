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
 * Match ALLOW or BLOCK anywhere in a line, with or without a colon/reason.
 * Captures: [1] = "ALLOW"|"BLOCK", [2] = optional reason after colon.
 */
const DECISION_RE = /\b(ALLOW|BLOCK)\b(?:\s*:\s*(.*))?/i;

/**
 * Parse raw output from a stop-review Copilot task.
 *
 * The prompt asks Copilot to start with "ALLOW: …" or "BLOCK: …", but LLMs
 * don't always comply exactly.  We search the full output for the first
 * occurrence of either keyword so that preamble text or missing colons
 * don't cause spurious blocks.  If the output is completely unparseable,
 * we default to ALLOW to avoid blocking the user for a format issue.
 *
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

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(DECISION_RE);
    if (!match) {
      continue;
    }
    const decision = match[1].toUpperCase();
    if (decision === "ALLOW") {
      return { ok: true, reason: null };
    }
    const reason = (match[2] ?? "").trim() || text;
    return {
      ok: false,
      reason: `Copilot stop-time review found issues that still need fixes before ending the session: ${reason}`
    };
  }

  // Unparseable output — default to ALLOW so format issues don't block the user.
  return { ok: true, reason: null };
}
