# Noodle Seed plugin

This is the installable Noodle Seed bootstrap for Claude Code, Codex, and Cursor. It connects
the host to Noodle Seed MCP services and invokes one exact CLI package behind typed local
plugin functions. Project-specific guidance is generated into each project by `noodle init`.

## Installed compatibility

- Plugin version: `0.33.126`
- Agent Kit: `0.86.0`
- CLI: `@noodleseed/one@0.142.1`
- MCP capability: `2`

These values are generated and released as one verified compatibility set. Do not edit them
inside an installed plugin.

## Supported platforms

Run the plugin on macOS or from WSL2 Ubuntu Bash with Linux Node.js and npm.
Native PowerShell, Command Prompt, and Git Bash are unsupported; from PowerShell, run `wsl --install -d Ubuntu`,
then install and run the coding-agent host inside Ubuntu.

## Trust boundary

- The private plugin bootstrap may download the exact CLI package from the npm registry on first use.
- The plugin connects only to the declared Noodle Seed MCP endpoints and does not forward host
  bearer tokens to business backends.
- The plugin does not collect or send feedback without explicit approval for the disclosed
  command and payload.
- Secrets stay in Noodle Seed managed secret storage; they must not be placed in prompts, source,
  generated files, or logs.

Read [security and permissions](https://github.com/NoodleSeed-com/plugins/blob/main/docs/security-and-permissions.md) before enabling access.

## Recovery

If the private plugin bootstrap cannot resolve its pinned CLI, preserve the npm diagnostic, verify npm
registry access, then update or reinstall the plugin. See the
[troubleshooting guide](https://github.com/NoodleSeed-com/plugins/blob/main/docs/troubleshooting.md) for the canonical checks.
