# Authoring workflow

## Contents

- Input paths
- Fit check
- Repair loop
- Connectors
- HTTP connector example (full server)
- Delegated downstream auth (call your API as the signed-in user)
- Design tools for the model
- Invocation context
- Compute connector example
- Tests
- Secrets and variables
- Embedded assistant
- Boundaries

## Input paths

1. **Website scrape** — if the user gives a URL, scrape it for surface hints (products, services, hours, contact, pricing). Stop there: the URL does not reveal CRM, booking systems, custom APIs, auth model, eligibility rules, quoting logic, or approval flows. Those live in the business systems and the owner’s head — ask.
2. **OpenAPI import** — `noodle import openapi <file>` emits a starter `server.ts` from a spec. Use it when the user provides an OpenAPI document.
3. **User interview** — Noodle does not interview; you do. Cover custom APIs/integrations, eligibility rules, quoting/approval logic, and private schemas (SQL DDL or JSON samples for custom `connector` declarations). Ask for concrete examples and sample payloads; do not guess a schema from a URL or invent endpoints.

## Fit check

Before building, confirm the idea fits a conversational surface: 1–3 focused actions where saying it beats clicking, plus data or actions the model lacks on its own. Poor fits — long-form or static content, dashboards, deep multi-step navigation, or a full app port. When an idea does not fit, narrow the scope to the actions that do.

## Repair loop

Author in `server.ts`, then `noodle validate` → fix cited errors (see `compile-errors.md`) → re-validate → `noodle test` → `noodle dev`. Keep the loop tight and error-driven.

## Connectors

Declare connectors as data, not imperative code:

- **HTTP**: `connector("id").version("1.0.0").http({ baseUrl, allowedOrigins, auth, operations })` with per-operation `request`/`response` mapping using `${args...}` / `${response...}` expressions.
- **Compute**: `connector("id").version("1.0.0").compute(name, { input, output, calls?, run })` — a self-contained, sandboxed function (no imports/closure capture) that may call allowlisted operations via `callOperation`.

Tools record connector calls into a flow; recording is not execution. Do not branch on runtime outputs with native `if` — use declarative `when(...)` conditions.

HTTP connector auth variants: `bearer` (`{ kind: "bearer", secret: secret("API_TOKEN") }`), `apiKey` (`{ kind: "apiKey", header: "X-API-Key", secret: secret("API_KEY") }`), `clientCredentials`, `delegatedOAuth`, `delegatedSessionCookie`, and `delegatedTokenExchange` (per-user calls to your own API — see "Delegated downstream auth" below). Use managed `secret(...)` / `variable(...)` refs for all values that differ by org/app/env.

## HTTP connector example (full server)

Declare the API as data, bind it with `use`, then record calls in tools. The operation mapping in detail: `request` builds the JSON request body, `query: [...]` names the input args sent as URL query parameters, and `response` maps the parsed HTTP body (bound to `${response}`) into your typed `output`. `auth` reads a managed `secret(...)` — never inline a key. This whole example is compile-verified on every `pnpm test`.

```ts
import { connector, secret, variable, server, tool, z } from '@noodleseed/one';

const crm = connector('crm').version('1.0.0').http({
  baseUrl: variable('CRM_BASE_URL'),
  allowedOrigins: ['https://api.crm.example'],
  auth: { kind: 'bearer', secret: secret('CRM_TOKEN') },
  operations: {
    find_customer: {
      type: 'read',
      method: 'GET',
      path: '/customers',
      query: ['email'],
      input: z.object({ email: z.string() }),
      output: z.object({ id: z.string(), name: z.string().optional() }),
      response: { id: '${response.data[0].id}', name: '${response.data[0].name}' },
    },
    create_ticket: {
      type: 'action',
      method: 'POST',
      path: '/tickets',
      input: z.object({ customer_id: z.string(), body: z.string() }),
      output: z.object({ ticket_id: z.string() }),
      request: { customer_id: '${args.customer_id}', body: '${args.body}' },
      response: { ticket_id: '${response.id}' },
    },
  },
});

export default server('support', { title: 'Support', version: '1.0.0', use: { crm } }, [
  tool('find_customer', {
    description: 'Find a customer by email address.',
    input: z.object({ email: z.string() }),
    output: z.object({ id: z.string(), name: z.string().optional() }),
    fulfil: ({ input, connectors }) => {
      const customer = connectors.crm.find_customer({ email: input.email });
      return { id: customer.id, name: customer.name };
    },
  }),
  tool('open_ticket', {
    description: 'Open a support ticket for a customer.',
    input: z.object({ customer_id: z.string(), body: z.string() }),
    output: z.object({ ticket_id: z.string() }),
    fulfil: ({ input, connectors }) => {
      const ticket = connectors.crm.create_ticket({ customer_id: input.customer_id, body: input.body });
      return { ticket_id: ticket.ticket_id };
    },
  }),
]);
```

Naming: connector operation names and tool names are lowercase-with-underscores. Map with `${args.field}` for tool/operation inputs and `${response.path}` for the response — the parsed JSON body is bound directly to `${response}`, so there is **no `.body` envelope**; use bracket syntax for array indices (`${response.data[0].id}`) — a dotted numeric index like `.0.` is invalid. Declare URL query parameters with the operation-level `query: ["arg"]` array, **not** inside `request` (which builds only the JSON body). `allowedOrigins` must be literal origin URLs (the SSRF allowlist); `baseUrl` may be a `variable(...)` that differs by env.

More: `auth.kind` is `bearer` | `apiKey` (needs `header`) | `clientCredentials` | `delegatedOAuth` | `delegatedSessionCookie` | `delegatedTokenExchange`. For client credentials use `{ kind: "clientCredentials", tokenUrl, clientId, clientSecret, scopes? }` (RFC-6749 grant); for a non-standard partner token endpoint add `profile: "custom"` with a `custom: { requestFormat, clientIdField, clientSecretField, tokenResponsePath, expirySource }` descriptor. Do not put credential headers in operation `headers`; use connector `auth`. Use `.compute(name, { input, output, run })` for a sandboxed transform; `provides:` (instead of `use:`) exposes a connector only to compute `callOperation`; and `noodle import openapi <file>` generates a connector from an OpenAPI spec.

## Delegated downstream auth (call your API as the signed-in user)

Use delegated connector auth when the downstream API must enforce its own per-user authorization — a shared service credential plus a forwarded user id would bypass it. Three shapes exist; pick by who owns the downstream:

- **`delegatedTokenExchange`** — your own API. The platform signs a short-lived, verifiable assertion of the signed-in user and exchanges it at a token endpoint you implement (RFC 8693). Works with verified customer OIDC identities, the built-in Firebase/Microsoft adapters, and embedded-assistant sessions; no per-user OAuth enrollment.
- **`delegatedOAuth` with `provider: "firebase" | "microsoft"`** — Noodle-managed bridge providers using stored per-user refresh tokens. Requires the matching `customerAuth` bridge; any other provider string is the compile error `unsupported_delegated_provider`.
- **`delegatedSessionCookie`** — Firebase-managed session-cookie apps only; not a generic mechanism.

### The connector (your `server.ts`)

```ts
auth: {
  kind: 'delegatedTokenExchange',
  tokenUrl: 'https://app.example.com/api/assistant/oauth/token', // origin must be in allowedOrigins
  clientId: variable('EXAMPLE_DELEG_CLIENT_ID'),
  clientSecret: secret('EXAMPLE_DELEG_CLIENT_SECRET'),
  scopes: ['time_off'],           // optional
  audience: 'example-api',        // optional; assertion + request audience, defaults to tokenUrl
  authMethod: 'client_secret_basic', // default; client_secret_post supported
}
```

Inside tools, `${user.subject}` / `${user.email}` / `${user.name}` / `${user.locale}` / `${user.timeZone}` / `${user.claims.*}` stay available as verified context; the delegated credential is what makes the *downstream call itself* run as that user.

### The exchange request your endpoint receives

The broker POSTs `application/x-www-form-urlencoded` to `tokenUrl` with `Authorization: Basic base64(clientId:clientSecret)` (or `client_id`/`client_secret` form fields for `client_secret_post`):

```
grant_type=urn:ietf:params:oauth:grant-type:token-exchange
subject_token=<RS256 JWT signed by the platform>
subject_token_type=urn:ietf:params:oauth:token-type:jwt
scope=time_off            (space-joined, when configured)
audience=example-api      (when configured)
```

The `subject_token` claims: `iss` (platform issuer; JWKS at `{iss}/.well-known/jwks.json`), `sub` (verified user id), `aud` (your configured audience or the tokenUrl), `email`, `name`, `claims` (declared session claims), `tenant` (`org/app/env`), `deployment`, `iat`, `exp` (about 120 s), `jti`. Respond with `{ "access_token": "...", "token_type": "Bearer", "expires_in": 900 }`; the broker caches per user + connector + scopes until `expires_in` minus 300 s and presents the token downstream as `Authorization: Bearer`.

### The downstream token endpoint (your backend)

```ts
// POST /api/assistant/oauth/token — Node example with jose.
import { createRemoteJWKSet, jwtVerify } from 'jose';

const PLATFORM_ISSUER = process.env.NOODLE_PLATFORM_ISSUER!; // e.g. https://cloud.noodleseed.dev
const jwks = createRemoteJWKSet(new URL(`${PLATFORM_ISSUER}/.well-known/jwks.json`));

export async function tokenEndpoint(req: Request): Promise<Response> {
  // 1. Authenticate the broker client credential (client_secret_basic).
  const basic = req.headers.get('authorization') ?? '';
  const [clientId, clientSecret] = atob(basic.replace(/^Basic /, '')).split(':');
  if (!isValidClient(clientId, clientSecret)) return new Response(null, { status: 401 });
  // 2. Verify the platform-signed user assertion (never trust a plaintext user id).
  const form = new URLSearchParams(await req.text());
  const { payload } = await jwtVerify(form.get('subject_token') ?? '', jwks, {
    issuer: PLATFORM_ISSUER,
    audience: 'https://app.example.com/api/assistant/oauth/token', // your tokenUrl or configured audience
  });
  if (payload.deployment !== undefined && payload.tenant !== 'your-org/your-app/prod') {
    return new Response(null, { status: 403 }); // optionally pin the calling deployment
  }
  // 3. Mint your own short-lived user-scoped token; your API enforces per-user rules from it.
  const accessToken = await issueAccessToken(String(payload.sub), clientId, form.get('scope') ?? '');
  return Response.json({ access_token: accessToken, token_type: "Bearer", expires_in: 900 });
}
```

Diagnose statically with `noodle auth doctor`; set a short-lived real customer token only in `NOODLE_CUSTOMER_TOKEN` and add `--live --org <org> --app <app> --env <env>` to perform one exchange per delegated binding without invoking a business tool. Common failures include structured `credential_unavailable` reasons such as `caller_identity_not_customer`. Direct/federated OIDC verification assigns the customer identity at the trusted verifier boundary; never ask an IdP to mint a Noodle-specific classification claim.

## Design tools for the model

Design tools around what a user says, not 1:1 around API endpoints. A raw wrapper per endpoint (`get_task`, `list_tasks`, `close_task`) forces the model to orchestrate low-level calls and to know identifiers the user never sees — an MCP connector, but not a usable product. Instead:

- **Shape by intent.** Name and scope tools for the job to be done — "find my overdue tasks", "complete the task matching this text" — combining multiple backing calls in one recorded flow (`when(...)`) where it helps.
- **Prefer names/text over raw IDs.** When an action needs an id the user does not know, pair the id-taking operation with a find/search operation that returns model-friendly summaries (id + a human label), so the model resolves text → id itself. Write descriptions that tell the model when to use each tool and how they chain.
- **Return only what the model needs.** Map the response to a small, typed `output` (a few labelled fields), not the raw API payload.

This example pairs a name resolver with an id-taking action: the model calls `find_tasks` to turn the user’s words into an id, then `complete_task`. It is compile-verified on every `pnpm test`.

```ts
import { connector, secret, server, tool, z } from '@noodleseed/one';

const tasks = connector('tasks').version('1.0.0').http({
  baseUrl: 'https://api.tasks.example',
  allowedOrigins: ['https://api.tasks.example'],
  auth: { kind: 'bearer', secret: secret('TASKS_TOKEN') },
  operations: {
    search_tasks: {
      type: 'read',
      method: 'GET',
      path: '/tasks',
      query: ['query'],
      input: z.object({ query: z.string() }),
      output: z.object({ matches: z.array(z.unknown()) }),
      response: { matches: '${response.results}' },
    },
    close_task: {
      type: 'action',
      method: 'POST',
      path: '/tasks/{id}/close',
      input: z.object({ id: z.string() }),
      output: z.object({ ok: z.boolean() }),
      response: { ok: '${response.ok}' },
    },
  },
});

export default server('todo', { title: 'Tasks', version: '1.0.0', use: { tasks } }, [
  tool('find_tasks', {
    description: 'Find tasks whose text matches a query — call this first to resolve a task the user names by text into its id, then pass that id to complete_task.',
    input: z.object({ query: z.string() }),
    output: z.object({ matches: z.array(z.object({ id: z.string(), title: z.string() })) }),
    fulfil: ({ input, connectors }) => {
      const found = connectors.tasks.search_tasks({ query: input.query });
      return { matches: found.matches };
    },
  }),
  tool('complete_task', {
    description: 'Mark a task complete by its id (get the id from find_tasks).',
    input: z.object({ id: z.string() }),
    output: z.object({ ok: z.boolean() }),
    fulfil: ({ input, connectors }) => {
      const result = connectors.tasks.close_task({ id: input.id });
      return { ok: result.ok };
    },
  }),
]);
```

The model never sees a task id from the user; `find_tasks` returns `{ id, title }` summaries it can pick from, then `complete_task` acts by id. Keep write actions (`complete_task`) separate and explicitly described so the host can gate them.

## Invocation context

Every executable invocation receives one immutable server-authoritative temporal snapshot. Canonical TypeScript authoring emits Core v2 and does not create a hidden context tool. Use `server(..., { context })` for locale/time-zone defaults and trusted ambient facts, and designate one normal zero-input tool with `contextProvider: true` when the model needs portable application context. The embedded host preloads it per turn; Claude, ChatGPT, and other MCP hosts call it normally.

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

Ambient providers are recorded as fulfilment data at author time, may call read-only connector operations only, and have a declared output schema. Later fulfilments read `${context.temporal.localDate}`, `${context.temporal.timeZone}`, `${context.ambient.defaultTeamId}`, and `${context.ambientStatus}`. If ambient resolution fails, the status is `unavailable`; never invent the missing business facts. Core-v1 `server.context` keeps the reserved `noodle_context` adapter; Core v2 never reserves it. Ambient/model-visible context is capped at 16 KiB serialized JSON, depth 8, and 128 entries per container; credential-shaped keys are rejected.

## Ask for structured missing input

Use `ctx.elicit` inside a tool fulfilment when execution needs one bounded value from the user. The call records an `elicit` flow step and returns its symbolic scope; it does not prompt at author time:

```ts
tool('prepare_time_off', {
  description: 'Resolve a time-off request before proposing the write.',
  input: z.object({ start: z.string(), end: z.string() }),
  output: z.object({ start: z.string(), end: z.string(), teamId: z.string() }),
  fulfil: ({ input, elicit }) => {
    const answer = elicit({
      id: 'choose_team',
      message: 'Which team should receive this request?',
      input: z.object({ teamId: z.string().describe('Team') }),
    });
    return { start: input.start, end: input.end, teamId: answer.teamId };
  },
});
```

Use a stable lowercase/number/underscore id and a flat form of string/number/integer/boolean, string choices or multi-select, with optional `email`, `uri`, `date`, or `date-time` formats. Nested objects and credential-shaped fields fail with `invalid_elicitation_schema`. Every interactive flow must place all `ctx.elicit` calls before its first connector operation or compilation fails with `invalid_elicitation_flow`. Embedded/headless clients receive `input_requested`; bidirectional MCP transports map the primitive to standard form `elicitation/create`. On stateless hosts, the adapter returns a structured non-executing `interaction_unavailable` result; linked Apps render its business-user form and retry in request `_meta`, while models can use the advertised reserved retry field. Accept validates and replays only the operation-free input prefix; invalid content returns `arg_invalid`, and decline/cancel stop. Elicitation gathers missing input and does not replace confirmation. In a flow marked `confirm: true`, every eligible `input_requested` precedes `tool_proposed`; the final proposal reviews the original input, elicited values, and sole exact connector action. Accept is bound to that action and only then may execution start. A confirmable flow may contain at most one connector operation; additional operations fail with `invalid_confirmation_flow`. MCP uses final standard form confirmation on capable bidirectional transports and fails closed otherwise. Setting `interactions: { confirmationFallback: "host" }` in the server options explicitly trusts native host approval only when confirmation transport is unavailable and after every elicited field is collected; it is never inferred from client name and does not replace authorization. Omitted or `false` annotations execute directly; hints alone never gate. `annotations.action({ confirm: true })` explicitly enables confirmation; `annotations.action({ confirm: false })` explicitly preserves direct execution.

## Compute connector example

```ts
const scoring = connector('scoring').version('1.0.0').compute('normalize', {
  input: z.object({ email: z.string(), priority: z.string().optional() }),
  output: z.object({ score: z.number() }),
  calls: { find_customer: 'crm.find_customer' },
  limits: { timeoutMs: 1000, maxHostCalls: 2 },
  run(input, { callOperation }) {
    const customer = callOperation("find_customer", { email: input.email }) as { id?: string };
    return { score: customer.id && input.priority === "high" ? 100 : 50 };
  },
});
```

Compute `run` functions are serialized and sandboxed: no imports, no closure capture, no `fetch`, no `process`. Any backing-system call must be declared in acyclic `calls` and invoked through `callOperation`. For conditional flow edges, use `when(...)` in recorded fulfilment instead of native branching on connector outputs.

## Tests

Use Vitest for app-local tests. Keep fixtures project-local; do not import from `examples/`. A minimum test suite imports the default server, checks the intended definitions compile, then lets `noodle test --json` perform the loopback MCP smoke.

```ts
import { describe, expect, it } from 'vitest';
import app from '../src/server.js';

describe('server', () => {
  it('declares the expected tool surface', () => {
    expect(app.name).toBe('support_assistant');
  });
});
```

After focused tests pass, run `noodle validate --json`, `noodle test --json`, and then `noodle dev` for interactive local verification.

## Secrets and variables

Author managed config as `secret("NAME")` / `variable("NAME")` and operate it with `noodle secrets set` / `noodle variables set` (scoped org/app/env). Never inline secret values in `server.ts`, tests, or generated files.

## Embedded assistant

To place the same server tools inside a SaaS web app, declare `assistant: embeddedAssistant(...)` alongside the one server-level brand kit. Read `embedded-assistant.md` before integrating: it owns the HTTPS-origin rule, managed model configuration, required deploy-before-client sequence, customer-backend exchange, browser mount, and verification checklist.

## Boundaries

Do not hand-author manifest JSON/YAML, runtime artifacts, connector IR, or hosted asset metadata. Do not read or copy secrets, bearer tokens, refresh tokens, static access keys, `.env.noodle`, or `~/.noodle/config.json`. Hosted access is identity-based — do not add static data-plane credential paths.