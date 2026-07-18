# Embedded assistant

## Contents

- Architecture
- Author and validate
- Customize the presentation
- Configure and deploy
- Access modes and customer auth
- Create the backend client
- Integrate the customer backend
- Ground time and ambient facts
- Verified session context (identity and claims)
- The session response
- Choose a browser renderer
- Toolchain requirements
- Verify the boundary
- Troubleshooting: symptom to diagnosis

## Architecture

The browser never receives a model key, assistant client secret, MCP token, or raw application session. The embedding SaaS authenticates its own user, its backend exchanges that verified identity through `@noodleseed/assistant/server`, and the browser receives only a short-lived assistant session.

Keep the two configuration sets separate:

| Owner | Values | Destination |
| --- | --- | --- |
| Noodle deployment | `ASSISTANT_MODEL_BASE_URL`, `ASSISTANT_MODEL`, `ASSISTANT_MODEL_API_KEY` | `noodle variables set` / `noodle secrets set`; never the SaaS environment |
| SaaS backend | `NOODLE_SERVICE_URL`, `NOODLE_ASSISTANT_CLIENT_ID`, `NOODLE_ASSISTANT_CLIENT_SECRET` | Backend-only environment or secret manager; never browser code or `NEXT_PUBLIC_*`/equivalent variables |

## Author and validate

Use the same server tools in the embed; do not create a second tool set. Declare one server-level brand kit and an assistant configuration:

```ts
branding: { name: "Acme", accent: "#3157D5" },
context: { defaults: { locale: "en-GB", timeZone: "Europe/London" } },
assistant: embeddedAssistant({
  model: openAICompatible({
    baseUrl: variable("ASSISTANT_MODEL_BASE_URL"),
    model: variable("ASSISTANT_MODEL"),
    apiKey: secret("ASSISTANT_MODEL_API_KEY"),
  }),
  allowedOrigins: ["http://localhost:3000", "https://app.example.com"],
  layout: { mode: "floating", position: "bottom-right" },
}),
```

`allowedOrigins` are exact origins: scheme, host, and optional port, with no path, trailing slash, or wildcard. Production origins must be HTTPS; plain HTTP is accepted only for loopback development origins (`http://localhost:<port>`, `http://127.0.0.1:<port>`). `noodle dev` serves the MCP project, not the embedding SaaS.

Run:

```sh
noodle validate --json
noodle check --target embedded-assistant --json
```

Use `noodle commands --json` before proposing command flags; do not invent flags from memory.

## Customize the presentation

Keep portable identity and semantic light/dark colors in the one server-level `branding` block. Put assistant-only structure in the bounded `presentation` object; it accepts curated primitives rather than raw HTML, CSS, SVG, class names, or callbacks:

```ts
assistant: embeddedAssistant({
  model, allowedOrigins,
  layout: { panelWidth: 520, panelMinHeight: 540, panelMaxHeight: 740, edgeOffset: 24 },
  behavior: { showTimestamps: true },
  labels: { composerPlaceholder: "Message Acme Support…", sessionReady: "Acme support is online" },
  presentation: {
    panel: { surface: "solid", elevation: "dramatic", border: "strong", radius: 20 },
    launcher: { icon: "chat", size: "lg", status: "session", effect: "pulse" },
    header: {
      mark: "status",
      badge: { text: "Online", tone: "success", indicator: true },
    },
    composer: { leadingIcon: "brand-mark", sendIcon: "paper-plane", shape: "rounded" },
    messages: { userStyle: "accent", assistantStyle: "bubble" },
  },
}),
```

The Atlas-style product treatment above is the maximum deployment-configurable presentation. The bounded surface covers panel treatment, launcher icon/size/session pulse, header mark/status badge, composer controls, and message treatment; it does not accept custom header actions, structured empty-state layouts, footers, spectacle variants/effects, or tenant code.

Omitted fields retain the quiet premium baseline. For exact application-owned color roles, pass the typed React `appearance={{ light: { panel: { surface, text, border }, composer: {...}, confirmation: {...}, primaryButton: {...} }, dark: {...} }}` prop or assign the same object to `element.appearance`. It covers canvas, panel, header, messages, composer, suggestions, confirmation, buttons, launcher, code, and the MCP App frame. Exact colors are preserved and low contrast emits `assistant-appearance-warning`. Precedence is host appearance object, host slots/public `--ns-assistant-*` variables, deployed semantic presentation, then defaults. Prefer `server.ts` configuration first so every embedding app receives the same assistant after redeploy.

Give every business action a portable `tool(..., { title: "Complete task", description: "This will mark the task complete for everyone.", input: z.object({ task: z.string().meta({ title: "Task" }) }) })` title. The standard confirmation uses the tool title/description plus schema field `title`, `description`, and `format`; it shows Confirm and Don't proceed and keeps technical action details secondary. Do not put JSON or implementation names in business-facing copy.

## Configure and deploy

Local MCP authoring and tests need no account, but an external browser embed needs an active assistant-enabled deployment before a backend client can be created. Set the model values on the target org/app/env, then deploy:

```sh
noodle variables set ASSISTANT_MODEL_BASE_URL --scope env --org <org> --app <app> --env <env> --value <https-model-base-url>
noodle variables set ASSISTANT_MODEL --scope env --org <org> --app <app> --env <env> --value <model>
noodle secrets set ASSISTANT_MODEL_API_KEY --scope env --org <org> --app <app> --env <env> --from-env ASSISTANT_MODEL_API_KEY
noodle deploy --org <org> --app <app> --env <env>
```

Do not put these model values in the embedding SaaS environment. A production deployment may omit a local origin; include a loopback origin only when local browser integration is required.

## Access modes and customer auth

Session exchange authenticates with the backend client credentials, so the embed works under any `--access` mode. Add `--access customers` only when verified end customers should also call the MCP endpoint directly. That mode requires `server.auth`; `noodle deploy` preflights the rule locally and fails with `server_auth_required` before contacting the service. Fix by adding auth to server options:

```ts
auth: customerAuth.federatedOidc({
  issuers: [{ issuer: "https://id.example.com", audience: "https://api.example.com" }],
}),
// or a built-in adapter: customerAuth.firebase({ projectId, apiKey })
```

## Create the backend client

After the deployment is active:

```sh
noodle assistant clients create --name web --org <org> --app <app> --env <env>
```

The CLI writes `{ clientId, clientSecret }` to a mode-`0600` file and prints only its path. Move the values into the SaaS backend secret manager without printing or committing them. Rotation invalidates the previous secret.

Validate the active deployment, backend credential, exact origin, and delegated credential exchanges without invoking a business tool:

```sh
noodle assistant doctor --origin "$PUBLIC_APP_ORIGIN" --org <org> --app <app> --env <env>
```

The doctor reads `NOODLE_ASSISTANT_CLIENT_ID` / `NOODLE_ASSISTANT_CLIENT_SECRET` or the saved mode-0600 client file and never prints the secret. Pass `--user-id <real-test-user>` only when the downstream exchange requires an existing application user.

## Integrate the customer backend

Read the customer repository lockfile or `packageManager` field and install `@noodleseed/assistant` with that existing package manager; never introduce a second lockfile.

Create an authenticated same-origin backend route:

```ts
import { createAssistantSession } from "@noodleseed/assistant/server";

export async function POST(request: Request) {
  const user = await requireCurrentUser(request);
  const { context } = await request.json();
  const session = await createAssistantSession({
    serviceUrl: process.env.NOODLE_SERVICE_URL!,
    clientId: process.env.NOODLE_ASSISTANT_CLIENT_ID!,
    clientSecret: process.env.NOODLE_ASSISTANT_CLIENT_SECRET!,
    origin: process.env.PUBLIC_APP_ORIGIN!,
    user: { id: user.id, email: user.email, roles: user.roles },
    context,
    // Saved, backend-verified user preferences outrank browser hints.
    preferences: { locale: user.locale, timeZone: user.timeZone },
  });
  return Response.json(session);
}
```

Authenticate before exchange. Source `origin` from trusted server configuration or strictly match the request origin against the same exact allowlist; never accept an arbitrary request header. Treat page context as untrusted model context, never authorization. Forward the helper response unchanged.

`serviceUrl` is the Noodle Seed control-plane base URL: the value `noodle assistant clients create` prints, also stored as `serviceUrl` in `deployment.json`. It is NOT the deployment MCP endpoint (`url`, which ends in `/v1/mcp` and rejects session exchange). Never probe or guess endpoints with real credentials.

## Ground time and ambient facts

Every assistant turn receives a server-authoritative instant and user-local date/time. Locale and IANA time zone resolve in this order: backend-verified `preferences` from session exchange, fresh per-turn browser `clientContext` hints, `server.context.defaults`, then platform defaults (`en-US`/`UTC`). Browser hints affect presentation and relative-date interpretation only; they are untrusted and never authorize a tool.

Use the server-level context declaration for application facts that every surface should share:

```ts
context: {
  defaults: { locale: 'en-GB', timeZone: 'Europe/London' },
  ambient: {
    output: z.object({ defaultTeamId: z.string(), holidays: z.array(z.string()) }),
    fulfil: ({ user, context, connectors }) => {
      const calendar = connectors.people.getCalendar({
        subject: user.subject,
        asOf: context.temporal.instant,
      });
      return { defaultTeamId: calendar.default_team_id, holidays: calendar.holidays };
    },
  },
},
```

The callback records declarative fulfilment at author time; the shared runtime executes only read-only connector operations, validates the declared output, and freezes one snapshot for the whole invocation and any accepted interaction. Tools/resources/prompts read `context.temporal`, `context.ambient`, and `context.ambientStatus`. The embedded assistant receives the same snapshot in trusted platform context. For model-visible application context in every host, designate one normal zero-input tool with `contextProvider: true`; the embedded host preloads it per turn and external hosts call it normally. Core-v1 `server.context` retains the legacy reserved `noodle_context` adapter, while canonical Core-v2 TypeScript authoring does not create or reserve it. Keep ambient facts compact: the platform caps serialized JSON at 16 KiB, depth 8, and 128 entries per container, and rejects credential-shaped keys.

## Structured missing input

A tool authored with `ctx.elicit({ id, message, input })` produces `input_requested` when it reaches missing input. Built-in and headless renderers present it and call `respond(id, { action: "accept", content })`; decline/cancel stop. Accepted content is schema-validated and completed steps are not rerun; invalid content returns `arg_invalid` and keeps the interaction pending. Elicitation gathers an input and does not approve a later write. Every interactive flow collects elicited input before its first connector operation; every eligible `input_requested` precedes `tool_proposed`. In a `confirm: true` flow, the final proposal reviews original input, elicited values, and the sole exact connector action; a confirmable flow has at most one connector operation. Accept is bound to that action. Bidirectional MCP maps missing input to standard `elicitation/create`. On a stateless host, a linked MCP App presents the same normal-user form and re-calls the tool through standard `tools/call`, carrying replay answers in request `_meta` so approval copy contains only business fields; without Apps, the model receives the exact structured schema and an advertised reserved retry field. Both paths replay only the operation-free input prefix and never expose runtime continuation or environment state. Setting `interactions: { confirmationFallback: "host" }` explicitly trusts native host approval only after every elicited field is collected and only when confirmation transport is unavailable; embedded/headless confirmation remains Noodle-owned. Omitted or false annotations execute directly; hints never gate.

## Verified session context (identity and claims)

The embedding developer defines what authenticated session context the assistant receives. One mechanism, three hops:

1. The authenticated backend passes standard identity and any verified claims at session exchange (flat scalars only):

```ts
const session = await createAssistantSession({
  serviceUrl, clientId, clientSecret, origin,
  user: { id: user.id, email: user.email, name: user.name },
  claims: { displayName: user.name, accountTier: account.tier, region: account.region },
});
```

2. The server author declares the allowlist in `server.ts` — undeclared claims are dropped at session exchange (never rejected, so backend and server deploys may skew safely):

```ts
assistant: embeddedAssistant({
  model, allowedOrigins,
  sessionClaims: {
    displayName: { exposeToModel: true },
    accountTier: { exposeToModel: true },
    region: {}, // tools only, never in the prompt
  },
}),
```

3. Consumption. Tools read the verified identity and declared claims through the `user` scope:

```ts
tool("greet", {
  description: "Greet the signed-in user.",
  input: z.object({}),
  annotations: annotations.readOnly(),
  fulfil: ({ user }) => ({ message: `Hello, ${user.name}!`, tier: user.claims.accountTier }),
});
```

Manifest expressions use `${user.name}`, `${user.email}`, `${user.subject}`, `${user.locale}`, `${user.timeZone}`, and `${user.claims.<key>}`. The model receives one platform identity line automatically: standard identity (name/email) whenever present, plus only the claims marked `exposeToModel: true` — so the assistant greets the actual user and can pass identity into tool arguments. `noodle check --target embedded-assistant` lists the declared claim contract.

Page `context` from the widget remains untrusted hint data; verified identity/authorization facts belong in `claims`, saved locale/time-zone choices belong in backend `preferences`, and live business facts belong in `server.context.ambient`. Validated preferences also reach fulfilments as `user.locale` and `user.timeZone`, so connectors format in the same verified zone the invocation snapshot uses.

To make the *downstream API call itself* run as the signed-in user (your API enforces its own per-user authorization instead of trusting a forwarded id), give the connector `auth.kind: "delegatedTokenExchange"` — the platform signs a verifiable assertion of this session identity and exchanges it at a token endpoint you implement. Assistant sessions carry the identity this needs; the full contract and a copyable endpoint implementation are in `references/authoring-workflow.md` ("Delegated downstream auth").

## The session response

The exchange returns the versioned Embedded Assistant v1 contract. `token`, `expiresAt`, and `endpoints.turns` / legacy `endpoints.toolConfirmations` (absolute URLs) are always present; current services add `endpoints.interactions` for accept/decline/cancel. `configuration` is optional theming data. Forward the body unchanged; browser clients choose the advertised endpoint. Do not rebuild, filter, or rewrite the response.

## Choose a browser renderer

Use the React wrapper in React applications:

```tsx
import { NoodleAssistant } from "@noodleseed/assistant/react";

<NoodleAssistant sessionEndpoint="/api/assistant/session" theme="auto" />;
```

Or import the package root once and mount `<noodle-assistant session-endpoint="/api/assistant/session" theme="auto"></noodle-assistant>`. Mount only inside the authenticated application surface.

The component renders a custom element and must mount client-side. In a Next.js App Router tree, put the mount in a `"use client"` component; from a server component or the Pages Router, load it with `next/dynamic` and `ssr: false`.

For a customer-owned renderer, use the DOM-free client. It keeps the session token in memory, streams the same typed events, and never registers a custom element:

```ts
import { createAssistantClient } from "@noodleseed/assistant/client";

const assistant = createAssistantClient({
  sessionEndpoint: "/api/assistant/session",
  clientContext: () => ({
    locale: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }),
});

assistant.updateModelContext({
  content: [{ type: 'text', text: 'The time-off form is mounted.' }],
  structuredContent: { widget: { name: 'time-off', lifecycle: 'mounted' } },
});

let pendingId: string | undefined;
let requestedSchema: unknown;
assistant.subscribe((event) => {
  renderAssistantEvent(event);
  if (event.event === 'view_available') {
    renderRegisteredView(event.data.resourceUri, event.data.result);
  }
  if ((event.event === 'tool_proposed' || event.event === 'input_requested') && typeof event.data.id === 'string') {
    pendingId = event.data.id;
    requestedSchema = event.event === 'input_requested' ? event.data.requestedSchema : undefined;
  }
});

await assistant.sendMessage("Book next Thursday and Friday off");
if (pendingId) {
  const resolution = requestedSchema
    ? { action: 'accept' as const, content: await renderPortableForm(requestedSchema) }
    : { action: 'accept' as const };
  await assistant.respond(pendingId, resolution);
}
// The same pending id also accepts { action: 'decline' } or { action: 'cancel' }.
```

`view_available` means a completed tool has a linked MCP App view. It carries the call/interaction id, tool, `ui://` identity, optional title, bounded/redacted public result, and—on current services—the self-contained bridged document. The standard element is an MCP Apps host and mounts that document behind a double iframe. It supports lifecycle, app tool/resource calls, ui/message, ui/update-model-context, links, resize, and inline/fullscreen; sampling, tasks, downloads, and remote DOM are not advertised. It also dispatches `assistant-view-available` for a customer-owned renderer.

`clientContext` and typed `pageContext` are recomputed for each turn. `updateContext(...)` remains the legacy session-exchange context; `updatePageContext(...)` replaces the fresh per-turn application hint. `updateModelContext({ content, structuredContent })` publishes one cohesive renderer snapshot for later message turns without starting a turn; every call replaces the prior snapshot rather than merging fields. These are untrusted data, not conversation history or authorization input, and the boundaries reject credential-shaped or unbounded updates. A message may re-exchange once after a pre-execution `401`; the client never auto-retries interaction decisions. `tool_proposed.arguments` is a complete schema-aware review projection and, for connector-backed tools, names the sole exact connector version/operation/resolved arguments. Sensitive/write-only fields are redacted; truncating or omitting any non-sensitive action field fails closed. Accept is bound to the server-held action and claims at most one execution attempt—clients cannot replace it. Normal terminal outcomes scrub private arguments and continuations immediately; only an accepted action still executing retains them for the one-hour unknown-outcome recovery window, after which it records `interaction_outcome_unknown` and scrubs. Without downstream idempotency this is not an exactly-once business-effect guarantee. To reconcile a lost response, explicitly repeat the same id and decision: the service returns its durable stored outcome without re-execution.

## Toolchain requirements

- Node.js 20+ for `@noodleseed/assistant/server`.
- The package ships ESM and CommonJS with full export conditions; no bundler aliases, `transpilePackages`, or ambient type shims are needed. If resolution fails, the installed package version is outdated: update `@noodleseed/assistant` instead of adding workarounds.
- TypeScript `moduleResolution` `bundler` or `node16` recommended; classic `node` also resolves the `/client`, `/react`, and `/server` subpaths.

## Verify the boundary

- Signed-out session exchange returns `401`.
- The browser network/DOM/storage contains no client secret or model key.
- The local and production origins match `allowedOrigins` character-for-character.
- At the manifest/runtime boundary and in TypeScript action helpers, only `confirm: true` enables confirmation; omitted or `false` preserves Core-v1 direct execution. Action hints alone never enforce approval; `annotations.action({ confirm: false })` is equivalent to omission.
- An expired turn re-exchanges once; interaction decisions never auto-retry. An explicit same-decision repeat returns the stored outcome without executing again.
- Accept, decline, and cancel are single-use. Only accept executes; the server ignores replacement tool arguments.
- Wrong-origin and malformed-origin requests fail closed.

## Troubleshooting: symptom to diagnosis

| Symptom | Diagnosis | Fix |
| --- | --- | --- |
| Widget renders but no reply arrives and model usage stays zero | Turns are not reaching the service: outdated `@noodleseed/assistant` package, or the session response was rebuilt/filtered by the backend route | Update the package to the latest version; forward the session response unchanged |
| `assistant-error` with code `invalid_response` | The turn endpoint returned HTML or non-SSE content (auth redirect, proxy page) | Check the backend session route path and any middleware/rewrites on the embedding app |
| Build error `Package path ./react is not exported` | Outdated package version with import-only export conditions | Update `@noodleseed/assistant`; do not add webpack aliases or type shims |
| Deploy fails with `server_auth_required` | `--access customers` without `server.auth` | Add direct/federated OIDC or a built-in Firebase/Microsoft adapter |
| Validate rejects an origin | Non-loopback HTTP origin in `allowedOrigins` | Use the exact HTTPS production origin; HTTP is only for `localhost`/`127.0.0.1` |
| Session exchange returns 404 | `serviceUrl` points at the deployment MCP endpoint | Use the control-plane service URL printed by `noodle assistant clients create` |
| Session exchange returns 403 `origin is not allowed` | Request origin differs from `allowedOrigins` character-for-character | Align the exact scheme/host/port on both sides and redeploy |
| Hydration or `HTMLElement is not defined` errors | The component mounted during server rendering | Mount client-only (`"use client"` or `next/dynamic` with `ssr: false`) |
| A tool runs without the expected confirmation | Its compiled annotations omit `confirm: true` or explicitly set `false` | Pass `{ confirm: true }` to the action helper; action hints alone never gate. `noodle check --target embedded-assistant` lists every confirm-gated tool |
| `${user.claims.<key>}` is empty | Claim not declared in `sessionClaims` (or key typo) — undeclared claims are dropped at exchange | Declare the key in `embeddedAssistant({ sessionClaims })` and redeploy |
| `${user.name}` is empty | Backend did not pass `user.name` to `createAssistantSession` | Pass the verified name from the authenticated backend session |
| The model does not know a claim you passed | Claim is tools-only | Mark it `exposeToModel: true` in `sessionClaims` |
| Relative dates use the wrong day or time zone | No verified user preference and the browser hint is missing/stale | Pass saved `preferences` from the backend; provide a fresh per-turn `clientContext` in a headless renderer |
| The model invents a team/holiday after context lookup fails | The ambient provider returned invalid data or its read-only connector failed (`ambientStatus: unavailable`) | Fix the provider/connector; treat unavailable ambient facts as missing, never prompt instructions |
| Decline/cancel reports `unsupported_service` | The session came from a legacy service with no `endpoints.interactions` | Upgrade the service; legacy `toolConfirmations` supports accept only |
| Behavior does not change after `noodle deploy` | Outdated platform: before the 2026-07 fix, clients were pinned to their creation-time deployment | Update the platform; sessions now follow the tenant's active deployment |
| A delegated connector returns `credential_unavailable` / `caller_identity_not_customer` | The calling surface has no verified customer identity (or an old session minted before the platform carried the resource audience) | Verify `customerAuth` is configured, the backend passes the verified `user`, and run `noodle auth doctor --live` |
| Deploy fails with `unsupported_delegated_provider` | `delegatedOAuth.provider` only supports the managed `firebase`/`microsoft` bridges | Use `auth.kind: "delegatedTokenExchange"` for your own token endpoint (see authoring-workflow.md) |