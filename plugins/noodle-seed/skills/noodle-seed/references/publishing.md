# Publish to app directories

Directory requirements evolve — treat this as the workflow map and verify against the host’s current submission docs before submitting.

## Contents

- Readiness gate
- ChatGPT apps directory
- Claude connectors directory

## Readiness gate

Before any submission:

1. `noodle check --target chatgpt` must be clean — every widget needs `domain` (one https origin per app) and an exact `csp` (hosts require the CSP to list precisely the domains you fetch from).
2. Audit tool responses in developer mode: run realistic prompts and strip anything not strictly needed — PII, internal identifiers (session/trace/request IDs, internal account IDs), and any secrets.
3. The server must be deployed and publicly reachable: `noodle deploy`, confirm with `noodle open --print` and `noodle smoke`. Reviewers connect to the real endpoint — never submit a placeholder or loopback URL, and the access mode must not be `owner-only` (`noodle access set`).
4. Polish the listing surface: tool descriptions, widget titles, and the `server` branding tokens are what reviewers and users see.

## ChatGPT apps directory

Submit from the OpenAI developer dashboard (platform.openai.com → Apps):

- Complete organization identity verification first (individual or business) — it is enforced at review time.
- The submission form asks for the app name, logo, description, company and privacy policy URLs, MCP server URL and tool information, screenshots, test prompts with expected responses, and localization details.
- One version may be published and one in review at a time; to revise a pending submission, cancel the review and resubmit rather than creating a new app.
- Review combines automated checks and manual evaluation; rejections come with feedback — fix and resubmit, or reply to appeal. An approved app is also distributed as a Codex plugin.

## Claude connectors directory

Anthropic runs a connectors directory for Claude; submission goes through Anthropic’s published process (see the Anthropic connectors directory FAQ on support.claude.com). The same readiness gate applies: deployed public endpoint, clean `noodle check`, and graceful degradation where Apps rendering is unavailable.