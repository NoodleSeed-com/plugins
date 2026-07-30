---
name: noodle-seed
description: Use when asked to build, create, or ship an MCP server or MCP app, a ChatGPT app, a Claude or Gemini connector, an MCP server or app for Codex or Claude Code, or to make a product, API, or SaaS reachable by AI agents. Bootstraps Noodle Seed — TypeScript authoring with the noodle CLI, local validation and testing, and governed hosted deployment.
---

<!-- noodle-skill version:0.33.44 hash:d646851eaf7602e2 -->

# Noodle Seed bootstrap

Noodle Seed turns one TypeScript file (`server.ts`) into a production MCP server or app: authored locally with the `noodle` CLI, validated and tested offline, and deployed to a governed hosted MCP endpoint reachable from ChatGPT, Claude, Codex, Cursor, Gemini, and every MCP client. Use this skill whenever the user wants an MCP server or app, a ChatGPT app, a Claude connector, an MCP server or app for Codex or Claude Code, or wants their product, API, or SaaS reachable by AI agents.

## Defer to the project-local skill

The supported `noodle-readiness.setup_project` tool installs the fuller, project-configured `noodle-seed` skill and managed context. When that project-local skill exists, read it and follow it instead of this one. The project-local skill owns the detailed commands, references, examples, and project defaults. This plugin skill is only the cold-start bootstrap.

## Cold start (no project yet)

1. **Use supported plugin functions.** Call the typed `noodle-readiness` tools yourself. They own the compatible CLI and isolated host profile. Never resolve, display, or ask the user to run an internal launcher, private installation path, shell wrapper, or global CLI install.
   - On Windows, the supported shell is WSL2 Ubuntu Bash. If the host is running in native PowerShell, Command Prompt, or Git Bash, stop and give the single fallback `wsl --install -d Ubuntu`; do not expose an internal plugin path.
2. **Scaffold or reconcile.**
   - New or empty directory: call `noodle-readiness.setup_project` with `mode: "initialize"` — the public fallback is `noodle init`.
   - Existing project: call `noodle-readiness.setup_project` with `mode: "reconcile"` instead of overwriting unrelated files — the public fallback is `noodle setup --write`.
3. **Switch to the project skill.** Read the newly installed project-local `noodle-seed` `SKILL.md`, select its route for the user-requested outcome, and stop bootstrap discovery. This handoff is the bootstrap stop condition.

For authorized hosted work, use the supported `noodle-readiness` tools. Its deploy tool owns the canonical preflight, configuration, deployment, and readiness sequence. Follow every structured public `noodle ... --from-env` configuration action before resuming the same deploy; do not invent an internal command or a second sequence. Linking and each configuration write remain separately authorized mutations. Show task-level progress and the exact target. On failure, report the structured error, safe recovery commands, and resume command only.

## Bootstrap boundary

The bootstrap installs and hands off; it does not prescribe an end-to-end lifecycle. The project-local route owns authoring, validation, local testing, hosted inspection, and any separately authorized hosted action. Application source remains with the coding agent. Scaffold or setup permission does not authorize hosted mutation.

## Safety

- Keep secrets, bearer tokens, refresh tokens, static access keys, `.env` / `.env.noodle` values, and `~/.noodle/config.json` out of prompts, logs, docs, tests, and generated files. Reference managed secrets as `secret("NAME")` in TypeScript and set them with `noodle secrets set`.
- Transfer a secret only with `noodle-readiness.set_cloud_secret_from_env` or the public `noodle secrets set ... --from-env NAME` fallback. Never read it with an ad hoc shell/file-parsing pipeline or a tool argument containing the secret value.
- Do not hand-author manifest JSON/YAML, runtime artifacts, connector IR, or hosted asset metadata — the SDK emits them.
- Do not add static data-plane credential paths; hosted access is identity-based.
- This bootstrap does not authorize hosted mutation. Never link, change hosted config/access, deploy, roll back, write host configuration, or submit to a directory unless the current user request explicitly asks for the exact action and target.
