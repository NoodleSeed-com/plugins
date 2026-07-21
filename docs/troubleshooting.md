# Troubleshooting

## The plugin is installed but does not trigger

Start a new agent session in the project and mention “Noodle Seed” or “build an MCP app.” Confirm the plugin is enabled in the host's plugin browser.

## The managed CLI cannot start

The launcher preserves the original npm diagnostic. When npm cannot download or resolve the pinned package, it then emits a JSON error with code `plugin_cli_bootstrap_failed` and recovery steps. Check access to `https://registry.npmjs.org`, retry, then use the host's plugin update or reinstall flow if the failure continues. Do not install an unrelated global CLI as a workaround.

A normal `noodle` validation, compile, test, or deployment error is not rewritten as a bootstrap failure: its original output and exit code pass through unchanged.

## Build Readiness is disconnected

Restart the host after installation so it reloads the bundled MCP configuration. If the host cannot render MCP Apps, continue headlessly: validation, tests, and deploy still return structured results to the agent.

## Compatibility error

Update the marketplace and reinstall the plugin. Compatibility is release-bound across the plugin, CLI, and Developer MCP capability version; mixing versions is intentionally rejected.

## Authentication or target error

Complete OAuth sign-in, then select the intended organization and environment. Ask the agent to show the target before deploying.

For commands, host-specific setup, and current known issues, see <https://docs.noodleseed.dev>.
