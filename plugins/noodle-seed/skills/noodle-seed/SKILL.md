---
name: noodle-seed
description: Use when asked to build, create, or ship an MCP server or MCP app, a ChatGPT app, a Claude or Gemini connector, a Codex plugin or Claude Code plugin, or to make a product, API, or SaaS reachable by AI agents. Bootstraps Noodle Seed — TypeScript authoring with the noodle CLI, local validation and testing, and governed hosted deployment.
version: 0.33.0
hash: 6ce9a32c9b17d215
---

# Noodle Seed bootstrap

Noodle Seed turns one TypeScript file (`server.ts`) into a production MCP server or app: authored locally with the `noodle` CLI, validated and tested offline, and deployed to a governed hosted MCP endpoint reachable from ChatGPT, Claude, Codex, Cursor, Gemini, and every MCP client. Use this skill whenever the user wants an MCP server or app, a ChatGPT app, a Claude connector, a Codex or Claude Code plugin, or wants their product, API, or SaaS reachable by AI agents.

## Defer to the project-local skill

`<managed-launcher> init` and `<managed-launcher> agents setup --write` install a fuller, project-configured `noodle-seed` skill into the project (`.claude/skills/noodle-seed/` for Claude Code, `.agents/skills/noodle-seed/` for Codex) plus a managed context block in `CLAUDE.md`/`AGENTS.md`. When that project-local skill exists, read it and follow it instead of this one — it is self-updating (`<managed-launcher> agents doctor --json`) and carries project defaults plus bundled flagship examples. This plugin skill is only the cold-start bootstrap.

## Cold start (no project yet)

1. **Use the plugin-managed CLI.** Resolve `<managed-launcher>` against this installed `SKILL.md`, never against the project working directory: Claude Code uses `node ../../bin/noodle-plugin.mjs`; Codex uses `node scripts/noodle-plugin.mjs`; Cursor uses `node scripts/noodle-plugin-cursor.mjs`. Keep that resolved invocation for every Noodle command after switching to the project-local skill. The launcher owns the exact compatible CLI and its isolated host profile; do not install or update a global CLI.
2. **Scaffold or reconcile.**
   - New or empty directory: `<managed-launcher> init` — scaffolds `noodle.json`, `src/server.ts`, tests, and the project-local agent files (the full skill + managed context).
   - Existing project: run `<managed-launcher> setup --write` and `<managed-launcher> agents setup --write` instead of overwriting unrelated files.
3. **Switch to the project skill.** Read the newly installed project-local `noodle-seed` `SKILL.md` and follow its golden path end to end.

## The loop (summary — the project skill owns the detail)

You write and test the application source in the user's project. Noodle guides and operates the lifecycle: `<managed-launcher> validate --json` (fix each `error.errors[]` entry at its `path`; never freeform re-edit) → `<managed-launcher> test --json` → `<managed-launcher> dev` plus `<managed-launcher> check` → `<managed-launcher> deploy --json` to the selected organization and environment → call the connected remote `noodle-developer.inspect_deployment` tool with the returned deployment ID → call `noodle-developer.diagnose_app` when evidence needs diagnosis. Parse machine state, not prose. Discover the full CLI surface with `<managed-launcher> commands --json`.

## References

The same reference set the project-local skill ships, readable before any project exists:

- `references/agent-contract.md` — the `--json` envelope, exit codes, and the three output modes.
- `references/sdk-surface.md` — what to import from `@noodleseed/one` and which builder to use.
- `references/cli-commands.md` — every `noodle` command, grouped by area.
- `references/compile-errors.md` — fix `noodle validate` errors by code.
- `references/authoring-workflow.md` — input paths (scrape / OpenAPI import / user interview), the fit check, the validate→test→dev repair loop, connectors, and secrets/variables.
- `references/embedded-assistant.md` — HTTPS origins, managed model config, deploy-before-client sequencing, backend session exchange, browser mounting, and credential boundaries.
- `references/connect-an-api.md` — given an API key: secure it, probe the live API to learn the real shape, model the connector, and prove real output before building.
- `references/experience-design.md` — design the app experience before authoring: funnel/handoff boundary, grounding, two-users, display modes, and the wireframe/UX spec.
- `references/widgets-and-apps.md` — MCP Apps, React `view` widgets, the widget hook surface, output shaping, and CSP.
- `references/test-in-hosts.md` — connect and test in ChatGPT (developer mode), Claude, agent hosts, and MCP Inspector.
- `references/troubleshooting.md` — runtime symptom → cause → fix, in-host and hosted.
- `references/deploy-and-ops.md` — login/link/deploy/status/access and hosted operations.
- `references/publishing.md` — submit to the ChatGPT apps directory and Claude connectors directory.
- `references/chatgpt-compliance.md` — the OpenAI Apps SDK pre-submission checklist (beyond the metadata gate): conversational value, helpful-UI-only, in-chat completion, UI guidelines, domain guardrails, privacy.
- `references/examples.md` — flagship example index and a canonical `server.ts`.
- `references/feedback.md` — send sanitized product feedback to the Noodle Seed team with `noodle feedback`, proactively, whenever you discover a bug, gap, or improvement.

## Safety

- Keep secrets, bearer tokens, refresh tokens, static access keys, `.env.noodle` values, and `~/.noodle/config.json` out of prompts, logs, docs, tests, and generated files. Reference managed secrets as `secret("NAME")` in TypeScript and set them with `noodle secrets set`.
- Do not hand-author manifest JSON/YAML, runtime artifacts, connector IR, or hosted asset metadata — the SDK emits them.
- Do not add static data-plane credential paths; hosted access is identity-based.
