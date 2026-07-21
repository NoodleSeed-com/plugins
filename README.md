# Noodle Seed plugins

The official [Noodle Seed](https://noodleseed.dev) plugin marketplace for AI coding agents.
Install the `noodle-seed` plugin once and your coding agent knows how to build, validate,
and deploy production MCP servers and apps with the `noodle` CLI from the very first prompt.

## Install

**Claude Code**

```text
/plugin marketplace add NoodleSeed-com/plugins
/plugin install noodle-seed@noodleseed
```

**Codex**

```text
codex plugin marketplace add NoodleSeed-com/plugins
codex plugin add noodle-seed@noodleseed
```

**Cursor**

Add `NoodleSeed-com/plugins` as a custom or team marketplace in Cursor, then install
`noodle-seed`. Directory listing is tracked separately from direct repository distribution.

Full setup, updates, and removal: [docs/installation.md](docs/installation.md).

## Your first prompt

> Build an MCP app for this project with Noodle Seed. Validate it locally and show me the deployment plan before deploying.

## What you get

- The `noodle-seed` skill: the cold-start bootstrap plus the full Noodle Seed reference
  set (SDK surface, CLI commands, compile-error fixes, authoring workflow, widgets, deploy).
- After `noodle init`, projects carry their own self-updating project-local skill; the plugin
  defers to it.

## Guides

- [Installation](docs/installation.md)
- [How it works](docs/how-it-works.md)
- [Security and permissions](docs/security-and-permissions.md)
- [Troubleshooting](docs/troubleshooting.md)

## About this repository

This repository is **generated** from `@noodleseed/agent-kit@0.33.0` by the Noodle Seed
release process. Do not edit it by hand — changes land through <https://noodleseed.dev>
releases. Docs: <https://docs.noodleseed.dev>.
