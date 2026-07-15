# Agent contract: --json, exit codes, output modes

The cold-agent-path commands (`init`, `validate`, `test`, `check`, `tools`/`resources`/`prompts`, `deploy`, `metrics`, `events`, `agents`) are agent-native and return the envelope below; hosted admin/ops commands (`status`, `inspect`, `smoke`, `logs`, `update`) are still being normalized. Decide what to do next by parsing machine state — do not scrape human prose.

## Contents

- Response envelope
- Exit codes
- Output modes
- Repair loop

## Response envelope

A `--json` command returns exactly one JSON object:

- **Success**: `{ ok: true, data, warnings? }` — `data` is the command payload; `warnings?` is an optional array of non-fatal notes.
- **Failure**: `{ ok: false, error: { code, message, cause?, fix, next, requestId? } }` — `code` is the stable machine code to branch on, `message` is human text, `cause?` is the underlying error, `fix` states the correction, `next` names the command to run next, `requestId?` correlates a hosted call.
- **Field errors** carry a dotted `path`: multi-error commands (e.g. `noodle validate`) nest them under `error.errors[]`, each `{ code, path, message }`. The top-level `error` still carries `code`/`message`/`fix`/`next`; the per-field `path`s live in `error.errors[]`.
- **Repair prose is isolated**: ready-to-apply repair text appears only under `error.fixPrompt` (surfaced by `--fix-prompt`), never mixed into `message` or `data`.

## Exit codes

Branch on the process exit code before parsing the body:

| Code | Meaning |
| :-- | :-- |
| `0` | ok |
| `1` | failure (command ran, the work failed) |
| `2` | usage (bad flags or arguments) |
| `3` | auth (login or permission required) |
| `4` | unreachable (service or network) |
| `5` | mcp/tool-call error (a `tools`/`resources`/`prompts`/`test` smoke call failed) |

## Output modes

Two kinds of output — never mix them:

- `--json` — **machine state**: the envelope above. Use it to decide what to do next.
- `--fix-prompt` / `--agent-output` (aliases) — **agent-readable text**, not the envelope: a ready-to-apply repair prompt for authoring commands (`validate`/`test`/`check`), or an operational `health` verdict (`ok`/`attention`) with `attention[]` next-commands for ops commands (`metrics`/`doctor`/`alerts`). Use it to author a fix or judge a running deployment.

## Repair loop

On a `validate` failure: parse `error.code` + `path`, fix exactly that field in `src/server.ts`, then re-run `noodle validate --json`. Never freeform re-edit. Repeat until `ok: true`, then `noodle test --json`.