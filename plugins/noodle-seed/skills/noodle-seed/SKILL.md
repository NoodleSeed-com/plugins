---
name: noodle-seed
description: Use when asked to build, create, or ship an MCP server or MCP app, a ChatGPT app, a Claude or Gemini connector, an MCP server or app for Codex or Claude Code, or to make a product, API, or SaaS reachable by AI agents. Bootstraps Noodle Seed — TypeScript authoring with the noodle CLI, local validation and testing, and governed hosted deployment.
---

<!-- noodle-skill version:0.33.9 hash:610378de796bb749 -->

# Noodle Seed bootstrap

Noodle Seed turns one TypeScript file (`server.ts`) into a production MCP server or app: authored locally with the `noodle` CLI, validated and tested offline, and deployed to a governed hosted MCP endpoint reachable from ChatGPT, Claude, Codex, Cursor, Gemini, and every MCP client. Use this skill whenever the user wants an MCP server or app, a ChatGPT app, a Claude connector, an MCP server or app for Codex or Claude Code, or wants their product, API, or SaaS reachable by AI agents.

## Defer to the project-local skill

`<managed-launcher> init` and `<managed-launcher> agents setup --write` install the fuller, project-configured `noodle-seed` skill into the project (`.claude/skills/noodle-seed/` for Claude Code, `.agents/skills/noodle-seed/` for Codex) plus a managed context block in `CLAUDE.md`/`AGENTS.md`. When that project-local skill exists, read it and follow it instead of this one. The project-local skill owns the detailed commands, references, examples, and project defaults and is self-updating (`<managed-launcher> agents doctor --json`). This plugin skill is only the cold-start bootstrap.

## Cold start (no project yet)

1. **Use the plugin-managed CLI.** Resolve `<managed-launcher>` against this installed `SKILL.md`, never against the project working directory: Claude Code uses `node ../../bin/noodle-plugin.mjs`; Codex uses `node scripts/noodle-plugin.mjs`; Cursor uses `node scripts/noodle-plugin-cursor.mjs`. Keep that resolved invocation for every Noodle command after switching to the project-local skill. The launcher owns the exact compatible CLI and its isolated host profile; do not install or update a global CLI.
2. **Scaffold or reconcile.**
   - New or empty directory: `<managed-launcher> init` — scaffolds `noodle.json`, `src/server.ts`, tests, and the project-local agent files (the full skill + managed context).
   - Existing project: run `<managed-launcher> setup --write` and `<managed-launcher> agents setup --write` instead of overwriting unrelated files.
3. **Switch to the project skill.** Read the newly installed project-local `noodle-seed` `SKILL.md`, select its route for the user-requested outcome, and stop bootstrap discovery. This handoff is the bootstrap stop condition.

## Bootstrap boundary

The bootstrap installs and hands off; it does not prescribe an end-to-end lifecycle. The project-local route owns authoring, validation, local testing, hosted inspection, and any separately authorized hosted action. Application source remains with the coding agent. Scaffold or setup permission does not authorize hosted mutation.

## Safety

- Keep secrets, bearer tokens, refresh tokens, static access keys, `.env.noodle` values, and `~/.noodle/config.json` out of prompts, logs, docs, tests, and generated files. Reference managed secrets as `secret("NAME")` in TypeScript and set them with `noodle secrets set`.
- Do not hand-author manifest JSON/YAML, runtime artifacts, connector IR, or hosted asset metadata — the SDK emits them.
- Do not add static data-plane credential paths; hosted access is identity-based.
- This bootstrap does not authorize hosted mutation. Never link, change hosted config/access, deploy, roll back, write host configuration, or submit to a directory unless the current user request explicitly asks for the exact action and target.
