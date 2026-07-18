# How the developer plugin works

The plugin is a distribution bundle, not a vibe-coding product. Your coding agent authors and tests the TypeScript source in your repository; Noodle Seed supplies the platform knowledge and operates the supported lifecycle.

## Capability layers

1. **Skill** — teaches the host the Noodle Seed authoring contract and the validate-test-deploy loop.
2. **managed CLI** — a plugin-pinned launcher performs local scaffolding, validation, tests, preview, and headless deployment without requiring a global CLI install.
3. **Build Readiness MCP** — reports structured local lifecycle state to build-time widgets and agents.
4. **Developer MCP** — provides authenticated Noodle Cloud inspection and diagnosis for the selected target.
5. **MCP App UI** — renders decision-first Build Readiness and operational widgets in hosts that support MCP Apps. Headless coding agents receive the same underlying structured results without needing a widget renderer.

## Normal lifecycle

`prompt → author TypeScript → validate → test → preview/check → deployment decision → deploy → inspect/diagnose`

The plugin defers to the richer project-local skill after `noodle init`. This keeps the global bundle small while ensuring each project carries the current commands, examples, and project defaults.
