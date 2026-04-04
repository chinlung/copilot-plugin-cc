# Changelog

## 1.2.0 (2026-04-05)

- Auth now falls back to `gh auth token` when no explicit token env var
  (`COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN`) is set, so users
  already authenticated with the GitHub CLI no longer need extra configuration.

## 1.1.0 (2026-03-31)

- Restored `--resume <id>` and `--continue` for Copilot session management.
- Added `--autopilot` and `--max-autopilot-continues <n>` for autonomous continuation.
- Added `--share <path>` and `--share-gist` for session export.
- Fixed `sharePath` not being passed through from `executeTaskRun` to `runCopilotTask`.
- Deduplicated `MODEL_ALIASES` to single source in `lib/copilot.mjs`.
- Extracted `stop-gate.mjs` with testable pure functions from `stop-review-gate-hook.mjs`.
- Narrowed try-catch in stop review gate to avoid masking `parseStopReviewOutput` errors.
- Standardized error messages (capitalization, trailing periods).
- Cleaned up `renderTaskResult` interface (destructured params, removed unused arguments).
- Extracted shared `withEnv` test helper and `ensureTrailingNewline` render utility.
- Added 6 new tests for CLI flag passing (58 total, up from 25 in v1.0.0).

## 1.0.0 (2026-03-31)

Initial release. Rewritten from the Codex plugin (`plugins/codex/`) to target GitHub Copilot CLI.

- Replaced all Codex/OpenAI branding with Copilot/GitHub branding.
- Renamed skills: `codex-cli-runtime` -> `copilot-cli-runtime`, `codex-result-handling` -> `copilot-result-handling`, `gpt-5-4-prompting` -> `copilot-prompting`.
- Updated prompting skill to be model-agnostic (supports Claude Opus 4.5, Claude Sonnet 4.5, GPT-5.2 Codex).
- Updated script references from `codex-companion.mjs` to `copilot-companion.mjs`.
- Carried over prompts, schemas, and hooks configuration with updated references.
