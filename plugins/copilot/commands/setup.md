---
description: Check whether the Copilot CLI is ready and verify GitHub token configuration
argument-hint: '[--enable-review-gate|--disable-review-gate]'
allowed-tools: Bash(node:*), Bash(copilot:*), AskUserQuestion
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/copilot-companion.mjs" setup --json $ARGUMENTS
```

If the result says Copilot is unavailable:
- Check whether `copilot --version` succeeds.
- If Copilot CLI is not installed, tell the user to install the GitHub Copilot CLI and ensure it is on their PATH.
- If Copilot CLI is installed but no GitHub token is found, check for `GITHUB_TOKEN` or `GH_TOKEN` environment variables and guide the user to set one up.

If Copilot is already installed and authenticated:
- Do not ask about installation.

Output rules:
- Present the final setup output to the user.
- If Copilot is installed but not authenticated, preserve the guidance to configure a GitHub token via `GITHUB_TOKEN` or `GH_TOKEN`.
