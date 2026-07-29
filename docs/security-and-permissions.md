# Security and permissions

Noodle Seed uses the same OAuth identity as the Console and CLI. Hosted actions are scoped to the user's selected organization and environment, and every deploy remains attributable to that identity.

The plugin's private execution boundary uses an isolated host profile. The Developer MCP receives authenticated, tenant-scoped requests; it does not ask the coding agent to forward bearer tokens to application backends.

## Declared execution and network access

- The host starts the release-pinned local MCP privately. Agent guidance and tool results expose only supported functions and stable public `noodle ...` recovery commands, never a private installation path.
- On first use, npm may download the exact release-pinned CLI package from `https://registry.npmjs.org`. The plugin never resolves `latest` and does not require a global CLI install.
- The remote Developer MCP endpoint is `https://cloud.noodleseed.dev/developer/mcp`. Host OAuth supplies its own audience-bound credential; the plugin bundle contains no token or client secret.
- Local Build Readiness uses a stdio child process. It accepts fixed schemas for setup, build gates, exact-target linking, variables, secret-from-environment transfer, deploy, feedback, and cancellation rather than an arbitrary command, shell string, or path.

## Local files and data movement

- Each host keeps plugin CLI auth and target state under `~/.noodle/plugin-profiles/<host>`, separate from ordinary CLI state. The project skill and managed context are written only by an explicit `init` or `agents setup --write` flow.
- Source code is not uploaded to the Developer MCP. The coding agent edits source locally; the CLI compiles and deploys the artifact only after the normal deployment decision.
- Secrets and OAuth credentials are excluded from manifests, plugin files, widget payloads, diagnostics, and feedback drafts. Application secrets are resolved by the hosted credential boundary.
- Noodle Seed does not send a feedback draft unless the user gives explicit approval for the exact previewed proposal and destination. Declining or ignoring the request performs no network call and causes no retry.

## Safe operating rules

- Sign in through the official OAuth flow; never paste access tokens, refresh tokens, secrets, or `.env` contents into chat.
- Review the selected organization, application, environment, and deployment summary before a consequential action.
- Store application credentials with the typed secret-from-environment function or `noodle secrets set ... --from-env NAME`, and reference them as `secret("NAME")` in TypeScript. Never place the value in chat, a command argument, or a shell pipeline.
- Treat source code as local: the coding agent edits the repository and the CLI compiles the deployable artifact.
- Deployment and secret writes require the host's normal approval controls when the host is not running autonomously.
