# Install Noodle Seed

Install the plugin once in your coding agent. It will use the compatible, plugin-managed Noodle CLI and connect the authenticated Noodle Developer MCP when those capabilities are available.

## Claude Code

Run these slash commands inside Claude Code:

```text
/plugin marketplace add NoodleSeed-com/plugins
/plugin install noodle-seed@noodleseed
```

## Codex

Run:

```sh
codex plugin marketplace add NoodleSeed-com/plugins
codex plugin add noodle-seed@noodleseed
```

You can also open `/plugins` in Codex and install Noodle Seed from the configured marketplace.

## Cursor

Install Noodle Seed from the Cursor Marketplace when it is listed. Before directory approval, a Teams or Enterprise administrator can import `NoodleSeed-com/plugins` into a team marketplace. Cursor does not currently expose a verified one-line terminal install for this repository, so this guide does not invent one.

## Your first prompt

Open the project you want to work in and ask:

> Build an MCP app for this project with Noodle Seed. Validate it locally and show me the deployment plan before deploying.

The coding agent writes the application. Noodle Seed guides and operates the build, validation, test, and deployment lifecycle.

## Update

- Claude Code: run `/plugin marketplace update noodleseed`, then update the installed plugin from `/plugin`.
- Codex: run `codex plugin marketplace upgrade noodleseed`, then reinstall or update from `/plugins` when prompted.
- Cursor: update from the marketplace that supplied the plugin.

## Uninstall

- Claude Code: run `/plugin uninstall noodle-seed@noodleseed`.
- Codex: run `codex plugin remove noodle-seed`.
- Cursor: remove Noodle Seed from Cursor's plugin settings.
