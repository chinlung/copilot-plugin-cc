# GitHub Copilot Plugin for Claude Code

[繁體中文版](README.zh-TW.md)

Use GitHub Copilot CLI from within Claude Code sessions for code reviews or to delegate tasks.

This plugin is for Claude Code users who want an easy way to leverage GitHub Copilot from the workflow
they already have.

## Origin & Motivation

This project is a refactored fork of [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc), which was originally built around the OpenAI Codex CLI.

Key changes from the upstream project:

- **Rebranded from Codex to GitHub Copilot** — all commands, agents, skills, and scripts now target the GitHub Copilot CLI instead of Codex CLI.
- **Model-agnostic architecture** — supports multiple model backends (Claude Opus 4.5, Claude Sonnet 4.5, GPT-5.2 Codex) rather than being tied to a single provider.
- **Restored and extended command interface** — restored `--resume`/`--continue` for session management, added `--autopilot` for autonomous continuation, and `--share`/`--share-gist` for session export, alongside the `--model` and `--background`/`--wait` API.
- **Updated authentication** — uses `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, or `GITHUB_TOKEN` for flexible GitHub authentication.

## What You Get

- `/copilot:review` for a normal read-only Copilot review
- `/copilot:adversarial-review` for a steerable challenge review
- `/copilot:rescue`, `/copilot:status`, `/copilot:result`, and `/copilot:cancel` to delegate work and manage background jobs

## Requirements

- **GitHub account with Copilot access.**
- **GitHub Copilot CLI** installed globally (`npm install -g @github/copilot`)
- **Node.js 22 or later**
- **Authentication:** Set one of `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, or `GITHUB_TOKEN` environment variable

## Install

Add the marketplace in Claude Code:

```bash
/plugin marketplace add chinlung/copilot-plugin-cc
```

Install the plugin:

```bash
/plugin install copilot@chinlung-copilot-plugin-cc
```

Reload plugins:

```bash
/reload-plugins
```

Then run:

```bash
/copilot:setup
```

`/copilot:setup` will tell you whether Copilot is ready. If Copilot is missing and npm is available, it can offer to install Copilot for you.

If you prefer to install Copilot yourself, use:

```bash
npm install -g @github/copilot
```

After install, you should see:

- the slash commands listed below
- the `copilot:copilot-rescue` subagent in `/agents`

One simple first run is:

```bash
/copilot:review --background
/copilot:status
/copilot:result
```

## Usage

### `/copilot:review`

Runs a normal Copilot review on your current work.

> [!NOTE]
> Code review especially for multi-file changes might take a while. It's generally recommended to run it in the background.

Use it when you want:

- a review of your current uncommitted changes
- a review of your branch compared to a base branch like `main`

Use `--base <ref>` for branch review. It also supports `--wait` and `--background`. It is not steerable and does not take custom focus text. Use [`/copilot:adversarial-review`](#copilotadversarial-review) when you want to challenge a specific decision or risk area.

Examples:

```bash
/copilot:review
/copilot:review --base main
/copilot:review --background
```

This command is read-only and will not perform any changes. When run in the background you can use [`/copilot:status`](#copilotstatus) to check on the progress and [`/copilot:cancel`](#copilotcancel) to cancel the ongoing task.

### `/copilot:adversarial-review`

Runs a **steerable** review that questions the chosen implementation and design.

It can be used to pressure-test assumptions, tradeoffs, failure modes, and whether a different approach would have been safer or simpler.

It uses the same review target selection as `/copilot:review`, including `--base <ref>` for branch review.
It also supports `--wait` and `--background`. Unlike `/copilot:review`, it can take extra focus text after the flags.

Use it when you want:

- a review before shipping that challenges the direction, not just the code details
- review focused on design choices, tradeoffs, hidden assumptions, and alternative approaches
- pressure-testing around specific risk areas like auth, data loss, rollback, race conditions, or reliability

Examples:

```bash
/copilot:adversarial-review
/copilot:adversarial-review --base main challenge whether this was the right caching and retry design
/copilot:adversarial-review --background look for race conditions and question the chosen approach
```

This command is read-only. It does not fix code.

### `/copilot:rescue`

Hands a task to Copilot through the `copilot:copilot-rescue` subagent.

Use it when you want Copilot to:

- investigate a bug
- try a fix
- implement a feature or refactor

> [!NOTE]
> Depending on the task these tasks might take a long time and it's generally recommended to force the task to be in the background or move the agent to the background.

It supports `--background`, `--wait`, `--model <model>`, `--resume <id>`, `--continue`, `--autopilot`, `--max-autopilot-continues <n>`, `--share <path>`, and `--share-gist`.

Examples:

```bash
/copilot:rescue investigate why the tests started failing
/copilot:rescue fix the failing test with the smallest safe patch
/copilot:rescue --background investigate the regression
/copilot:rescue --model claude-opus-4.5 refactor the auth module
/copilot:rescue --continue fix the remaining issues
/copilot:rescue --resume abc123 apply the suggested fix
/copilot:rescue --autopilot implement the full feature
/copilot:rescue --share /tmp/session.md investigate the regression
```

### `/copilot:status`

Shows running and recent Copilot jobs for the current repository.

Examples:

```bash
/copilot:status
/copilot:status task-abc123
```

Use it to:

- check progress on background work
- see the latest completed job
- confirm whether a task is still running

### `/copilot:result`

Shows the final stored Copilot output for a finished job.

Examples:

```bash
/copilot:result
/copilot:result task-abc123
```

### `/copilot:cancel`

Cancels an active background Copilot job.

Examples:

```bash
/copilot:cancel
/copilot:cancel task-abc123
```

### `/copilot:setup`

Checks whether Copilot is installed and authenticated.
If Copilot is missing and npm is available, it can offer to install Copilot for you.

Examples:

```bash
/copilot:setup
```
