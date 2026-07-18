# Deploy and operations

## Contents

- Authenticate
- Link and target
- Deploy and inspect
- Installed Developer plugin handoff
- Eject path (portable manifest)
- Connect into a host
- Access modes
- Org and members
- Config and observability
- Agent-safe CLI recipes
- Analytics

## Authenticate

`noodle login` to authenticate with Noodle Seed Cloud, `noodle whoami` to confirm, `noodle logout` to clear credentials. Local commands (`dev`/`validate`/`test`) need none of this.

## Link and target

`noodle link --org <slug> --app <slug> [--env <slug>]` binds the directory to a target. Unlinked, `noodle deploy` uses your default org, the project name as the app, and `prod`. `noodle target show|set` inspects or changes the target.

## Deploy and inspect

`noodle deploy` deploys the server. Then `noodle open` (latest URL), `noodle status`, `noodle inspect` (metadata, no secrets), `noodle smoke` (readiness diagnostics), and `noodle rollback <deploymentId>` to revert.

## Installed Developer plugin handoff

When this project was bootstrapped by the installed Noodle Developer plugin, preserve its managed launcher invocation for every local CLI command. After `deploy --json`, take the returned deployment ID to the connected remote `noodle-developer.inspect_deployment` tool. Use `noodle-developer.diagnose_app` only when the Cloud evidence needs diagnosis. Those tools inspect the selected organization and environment; they do not edit or replace the application source, which remains the coding agent's responsibility.

## Eject path (portable manifest)

`noodle export manifest [--output <file>]` compiles the entrypoint locally and emits the portable, vendor-neutral manifest JSON — no service, no login, no account. A Noodle app is just `src/server.ts` plus this manifest: the user can read it, diff it, and keep it.

## Connect into a host

Once deployed, register the server as a tool in a host with `noodle connect <host>` (`claude-code`, `codex`, `chatgpt`, `cursor`, `vscode`, `claude`, `inspector`) — it prints the exact config to paste.

- **Claude Code / Claude Desktop** (verified) — add the `mcpServers` block, or one-shot `claude mcp add-json noodle-server '<json>'`:

```json
{
  "mcpServers": {
    "noodle-server": { "type": "https", "url": "https://<app>.mcp.noodleseed.dev" }
  }
}
```

- **Codex / Cursor / VS Code** — the same `mcpServers` block is emitted as a starting point (these hosts' config formats are not officially documented). Wiring a deployed Noodle server into Codex means registering that block in Codex's MCP config.
- **ChatGPT / Claude.ai** — no config file: open the host's Settings → Connectors → Add custom connector, paste the MCP URL, then authenticate.
- `noodle connect codex|claude-code --write` writes the project-local agent files (only these two targets).

## Access modes

`noodle access set owner-only|org-members|authenticated|customers` controls who can call the deployed server. Hosted access is identity-based; never add static data-plane keys.

## Org and members

`noodle orgs list|create` and `noodle members list|add|remove --org <slug>` manage organizations and membership.

## Config and observability

Manage runtime config with `noodle secrets` / `noodle variables` (scoped org/app/env). Operators use `noodle logs`, `noodle audit`, and `noodle policy` for logs, governance audit, and policy.

## Billing migration preview

`noodle billing migration preview [--file <mapping.json>]` is a super-admin, read-only inventory and validation command for legacy organizations. It never creates billing accounts, links organizations, or changes entitlements, and there is no apply command. Keep real mapping files outside the repository. The versioned file must classify production apps for every organization: `linkState: "unlinked"` selects a current owner subject under the fixed hosted issuer `https://accounts.google.com`, while `linkState: "linked"` asserts the exact current billing-account ID and link version. Inventory apps with `noodle apps list --archived --json` so archive state is visible. A blocked preview exits 1 even though the JSON response is a successful preview envelope; inspect `data.preview.blockers` and resolve every blocker before a future cutover workflow exists.

## Agent-safe CLI recipes

Use explicit flags in headless runs so commands never wait for a prompt:

```sh
noodle link --org acme --app support-assistant --env prod
noodle secrets set CRM_TOKEN --scope env --org acme --app support-assistant --env prod --from-env CRM_TOKEN
noodle secrets set CRM_CERT --scope env --org acme --app support-assistant --env prod --from-file ./cert.pem
printf %s "$CRM_TOKEN" | noodle secrets set CRM_TOKEN --scope env --org acme --app support-assistant --env prod --from-stdin
noodle variables set CRM_BASE_URL --scope env --org acme --app support-assistant --env prod --value https://crm.example.com
noodle secrets list --scope env --org acme --app support-assistant --env prod --json
noodle validate --json
noodle test --json
noodle deploy --json
noodle smoke --json
noodle billing migration preview --json
noodle agents doctor --json
```

`secrets resolve` is for local diagnostics only; do not print resolved values into prompts, logs, tests, or docs. Prefer `--from-env`, `--from-file`, or `--from-stdin` over inline `--value` for sensitive values. Variables may use `--value` when the value is non-secret.

## Analytics (verify after deploy, debug errors)

After a deploy gets traffic, verify with `noodle metrics --agent-output` — it returns a `health` verdict (`ok`/`attention`), a one-line summary, and `attention[]` items each carrying the exact next command. When a tool errors, drill in with `noodle events --tool <name> --json` (filters: `--status tool_error|mcp_error`, `--client <name>`); `noodle events --session <id> --json` replays one session chronologically. `--json` on both returns the full payload; human runs get the branded report. Two-tier errors: `tool_error` is recoverable (handed back to the model), `mcp_error` needs attention (protocol/timeout/internal). Wire edge-triggered webhooks on error share, error count, calls, or p95 latency with `noodle alerts add|list|remove|test`.