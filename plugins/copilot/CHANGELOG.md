# Changelog

## 1.0.0 (2026-03-31)

Initial release. Rewritten from the Codex plugin (`plugins/codex/`) to target GitHub Copilot CLI.

- Replaced all Codex/OpenAI branding with Copilot/GitHub branding.
- Renamed skills: `codex-cli-runtime` -> `copilot-cli-runtime`, `codex-result-handling` -> `copilot-result-handling`, `gpt-5-4-prompting` -> `copilot-prompting`.
- Updated prompting skill to be model-agnostic (supports Claude Opus 4.5, Claude Sonnet 4.5, GPT-5.2 Codex).
- Updated script references from `codex-companion.mjs` to `copilot-companion.mjs`.
- Carried over prompts, schemas, and hooks configuration with updated references.
