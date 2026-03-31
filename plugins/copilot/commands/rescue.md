---
description: Delegate investigation, an explicit fix request, or follow-up rescue work to the Copilot rescue subagent
argument-hint: "[--background|--wait] [--model <model>] [--resume <id>|--continue] [--autopilot] [--share <path>] [--share-gist] [task text]"
context: fork
allowed-tools: Bash(node:*)
---

Route this request to the `copilot:copilot-rescue` subagent.
The final user-visible response must be Copilot's output verbatim.

Raw user request:
$ARGUMENTS

Execution mode:

- If the request includes `--background`, run the `copilot:copilot-rescue` subagent in the background.
- If the request includes `--wait`, run the `copilot:copilot-rescue` subagent in the foreground.
- If neither flag is present, default to foreground.
- `--background` and `--wait` are execution flags for Claude Code. Do not forward them to `task`, and do not treat them as part of the natural-language task text.
- `--model` is a runtime-selection flag. Preserve it for the forwarded `task` call, but do not treat it as part of the natural-language task text.
- `--resume <id>` and `--continue` are session management flags. Preserve them for the forwarded `task` call, but do not treat them as part of the natural-language task text.
- `--autopilot` and `--max-autopilot-continues <n>` are execution control flags. Preserve them for the forwarded `task` call, but do not treat them as part of the natural-language task text.
- `--share <path>` and `--share-gist` are output flags. Preserve them for the forwarded `task` call, but do not treat them as part of the natural-language task text.

Operating rules:

- The subagent is a thin forwarder only. It should use one `Bash` call to invoke `node "${CLAUDE_PLUGIN_ROOT}/scripts/copilot-companion.mjs" task ...` and return that command's stdout as-is.
- Return the Copilot companion stdout verbatim to the user.
- Do not paraphrase, summarize, rewrite, or add commentary before or after it.
- Do not ask the subagent to inspect files, monitor progress, poll `/copilot:status`, fetch `/copilot:result`, call `/copilot:cancel`, summarize output, or do follow-up work of its own.
- Leave the model unset unless the user explicitly asks for one. Example models: `claude-opus-4-5`, `claude-sonnet-4-5`, `gpt-5.2-codex`.
- If the helper reports that Copilot is missing or unauthenticated, stop and tell the user to run `/copilot:setup`.
- If the user did not supply a request, ask what Copilot should investigate or fix.
