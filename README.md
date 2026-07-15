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
```

Then install `noodle-seed` from the `noodleseed` marketplace.

## What you get

- The `noodle-seed` skill: the cold-start bootstrap plus the full Noodle Seed reference
  set (SDK surface, CLI commands, compile-error fixes, authoring workflow, widgets, deploy).
- After `noodle init`, projects carry their own self-updating project-local skill; the plugin
  defers to it.

## About this repository

This repository is **generated** from `@noodleseed/agent-kit@0.24.0` by the Noodle Seed
release process. Do not edit it by hand — changes land through <https://noodleseed.dev>
releases. Docs: <https://docs.noodleseed.dev>.
