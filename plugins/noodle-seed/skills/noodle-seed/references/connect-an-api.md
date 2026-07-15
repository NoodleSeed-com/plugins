# Connect a live API (you were given a key)

When the user hands you an API key or credentials, don't infer the data from documentation — docs
drift. Probe the live API, learn the real shape, then encode it as a `connector`. The loop:

## Contents

- Secure the key first
- Probe the live API
- Model the connector from the observed shape
- Return a list
- Create, update, delete
- Design intent tools
- Set the secret for local runs
- Prove real output
- Then build the app

## Secure the key first

Never inline or log the key. Have the user put it in an environment variable, then store it as a
managed secret and reference it only as `secret(...)`:

```sh
export SOME_API_KEY=…            # the user sets this; it never appears in a file or prompt
noodle secrets set SOME_API_KEY --runtime local --scope org --org local --from-env SOME_API_KEY   # local-run scope — see "Set the secret for local runs"
```

In `server.ts` the key is only ever `secret("SOME_API_KEY")` — keep the raw value out of code, tests,
prompts, logs, and generated files.

## Probe the live API

Learn the actual response shape empirically. Two ways — capture one real example response per endpoint
you will use, and read its field names, nesting, array shapes, pagination, and id-vs-label fields:

- **With your own HTTP/shell tool** — call a representative read endpoint using the key **from the env
  var**, never the literal (so it stays out of logs): `curl -H "Authorization: Bearer $SOME_API_KEY"
  https://api.example.com/things`. Inspect the returned JSON.
- **Noodle-native** — author a minimal read operation that maps the whole body (`response: { raw:
  '${response}' }`), `noodle secrets set` the key, then `noodle tools call` it to see the real payload
  in-process.

## Model the connector from the observed shape

Encode the API as an HTTP connector, mapping only the fields you actually saw into a small typed
`output`:

- `connector("id").version("1.0.0").http({ baseUrl, allowedOrigins, auth, operations })`.
- `auth: { kind: 'bearer', secret: secret('SOME_API_KEY') }` — or `{ kind: 'apiKey', header: 'X-API-Key',
  secret: secret('SOME_API_KEY') }`. Never put the credential in operation `headers`.
- Per operation: `method`, `path` (with `{id}` templates), `query: ["arg"]` for URL params, `input`,
  `output`, and a `response` mapping whose `${response.path}` matches the real JSON — the parsed body is
  bound directly to `${response}` (no `.body` envelope); use bracket indices for arrays
  (`${response.results[0].id}`).

The full connector shape, every `auth.kind`, and compute connectors are in
`references/authoring-workflow.md`.

## Return a list

Most real tools return a variable-length list (search results, a user’s tasks). Bind the **whole array** — a single `${response.path}` returns the referenced value verbatim, arrays included:

```ts
// The API returns { results: [ { id, name, country, … }, … ] }
output: z.object({ places: z.array(z.unknown()) }),
response: { places: '${response.results}' },
```

Three things that are easy to get subtly wrong:

- **A response mapping cannot iterate.** There is no per-item / `map` / `item` construct, so you cannot reshape `[{…30 fields}]` into `[{ id, label }]` inside a `response:` block — bind the whole array.
- **A tool's Zod `output` does not strip at runtime.** It only advertises the JSON Schema; the runtime returns your `fulfil` output verbatim, so `z.array(z.object({ id, label }))` will NOT drop extra element fields.
- **So narrow in a compute connector.** To reshape each element, synthesize a `label`, or normalize a missing array to `[]`, pass the whole array to a `.compute(...)` op whose `run` maps it (a connector is HTTP **or** compute, not both — use a second connector). To only *drop* known fields without reshaping, `projection: { hiddenFields: [...] }` deletes them from each element. Worked example: `examples/weather` — `search_list` binds the array, then `geo_places.narrow` reshapes to `{ id, label }` and normalizes no-results to `[]`; `examples/sharepoint-lists` shows the same pattern against a real API.

For a **paginated** API, collect across pages with a `pagination` config; the collected list is then `${response.items}`:

```ts
pagination: {
  kind: 'cursor',                       // or 'pageNumber'
  items: '${response.results}',         // the array on ONE page
  nextCursor: '${response.next_cursor}', // 'pageNumber' uses hasMore + pageParam instead
  cursorParam: 'cursor',
  maxPages: 5, maxItems: 100,
},
// items / nextCursor / hasMore run over ONE raw page; your response mapping runs over the
// collected aggregate, so the full list is:
response: { tasks: '${response.items}' },
```

## Create, update, delete

Pair the read/list with the mutations your intent tools need:
- **Create / update** — `method: 'POST'` / `'PATCH'`; the request body is authored as `request: { field: '${input.x}' }` — the `request` object **is** the JSON body (do not nest it under `body`), and URL query params are the operation-level `query: [...]` array.
- **Delete / close** — many endpoints return `204 No Content`. Set `responseType: 'empty'`, which enforces the status and binds `{}` (there is no body to map).

```ts
close_task: {
  type: 'action', method: 'POST', path: '/tasks/{id}/close',
  input: z.object({ id: z.string() }),
  responseType: 'empty',
},
```

## Design intent tools

Shape tools around what the user says, not 1:1 around endpoints. Pair an id-taking action with a
find/search operation that returns `{ id, label }` summaries so the model resolves text → id itself,
and map each response to a few labelled fields the model can speak from. See the "Design tools for the
model" section of `references/authoring-workflow.md`.

## Set the secret for local runs

`noodle secrets set NAME --from-env NAME` **without a scope** writes to your global target (or errors) — which a local `noodle dev` never reads. Local `dev` resolves secrets under `org=local`, `app=<project-dir-slug>`, `env=dev` (the `…/o/local/<app>/dev/mcp` URL it prints). Set the secret at a matching local scope:

```sh
# Simplest — org scope is visible to every local app. Pin --runtime local so a cloud login
# (a non-local default runtime) does not send it to the hosted control plane:
noodle secrets set SOME_API_KEY --runtime local --scope org --org local --from-env SOME_API_KEY
# Or the exact env scope, using the app slug from the printed dev URL:
noodle secrets set SOME_API_KEY --runtime local --scope env --org local --app <app-slug> --env dev --from-env SOME_API_KEY
```

Local secrets live in `./.env.noodle` (never commit it). **Symptom to recognize:** a required `secret(...)` that can’t resolve fails compile *closed*, so nothing is served. `noodle tools call` / `noodle test` / `noodle dev` name this directly as `connector_secret_unresolved` with the exact scoped-secret fix; an external MCP client (Inspector/mcpjam) hitting the loopback still sees an opaque `-32600 "not found"`. Either way, fix the secret’s scope, not the connector.

## Prove real output

`noodle validate` / `noodle test` prove a connector tool *compiles and registers* — not that its
mapping returns data. With the secret set, run a live read: `noodle tools call <read_tool> --args
'{…}'` executes the connector against the real API in-process. Confirm the mapped fields are populated,
not `undefined`; if they are empty, fix the `${response…}` paths against the real payload and re-run.
Only run a live write if it is safe or the user approved it.

## Then build the app

With real data flowing, design the experience (`references/experience-design.md`), add widgets where a
UI genuinely helps (`references/widgets-and-apps.md`), and verify with `noodle check`. Deploy per
`references/deploy-and-ops.md`, and set the same secret in the hosted environment with `noodle secrets
set` before the first hosted call.