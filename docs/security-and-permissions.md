# Security and permissions

Noodle Seed uses the same OAuth identity as the Console and CLI. Hosted actions are scoped to the user's selected organization and environment, and every deploy remains attributable to that identity.

The plugin-managed launcher uses an isolated host profile. The Developer MCP receives authenticated, tenant-scoped requests; it does not ask the coding agent to forward bearer tokens to application backends.

## Safe operating rules

- Sign in through the official OAuth flow; never paste access tokens, refresh tokens, secrets, or `.env` contents into chat.
- Review the selected organization, application, environment, and deployment summary before a consequential action.
- Store application credentials with `noodle secrets set` and reference them as `secret("NAME")` in TypeScript.
- Treat source code as local: the coding agent edits the repository and the CLI compiles the deployable artifact.
- Deployment and secret writes require the host's normal approval controls when the host is not running autonomously.
