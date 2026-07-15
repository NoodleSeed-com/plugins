# ChatGPT App compliance (pre-submission)

`noodle check --target chatgpt` verifies the *metadata* prerequisites; app-store submission also faces a
human review against OpenAI’s Apps SDK UX principles. Run this checklist against the built app before
submitting, and render it as an audit table in the design wireframe (`design/wireframe.html` in the
`acme-*` examples) so partners and reviewers see it up front.

## Contents

- Metadata gate vs review
- Pre-submission checklist
- UI guidelines
- Domain guardrails
- Privacy and data

## Metadata gate vs review

`noodle check --target chatgpt --json` returning `ok:true` means the widget is *metadata-ready* (widget
`domain`, `openai/outputTemplate`, CSP, tool annotations, and `invoking`/`invoked` invocation copy are
present) — it does NOT prove host rendering, conversation UX, or submission acceptance. Validate real
rendering in ChatGPT Developer Mode / MCP Inspector, then run the checklist below.

## Pre-submission checklist (what review looks for)

1. **Conversational value** — at least one capability relies on ChatGPT’s strengths: natural-language
   actions no tap-driven app can do (e.g. "two margheritas and a lemon tart" parses into a cart). Cite
   concrete app behavior, not aspirations.
2. **Beyond base ChatGPT** — new knowledge, actions, or presentation (grounded partner data, live
   inventory, signed handoffs, real-world routing).
3. **Atomic, model-friendly actions** — self-contained tools with explicit input/output schemas, and an
   annotation on every tool (`annotations.readOnly()` / `.action()` / `.openAction()`).
4. **Helpful UI only** — justify each widget (would plain text degrade UX?), and note what you
   deliberately did NOT build a widget for (payment is off-app → no payment widget).
5. **In-chat task completion** — the user finishes a meaningful task in chat. For a top-of-funnel app,
   the task is the discovery/config loop completed in-chat with an intentional handoff.
6. **Performance** — tool calls scoped per step; response-time targets stated.
7. **Discoverability** — broad, natural trigger prompts listed; description keywords planned. Golden
   prompt sets and metadata optimization are a launch workstream, not polish.
8. **Platform fit** — multi-turn dialogue, conversation memory, and multimodality where genuinely useful.

## UI guidelines

System fonts, monochrome outlined icons, WCAG AA contrast, at most two actions on inline cards, no nested
scroll, and the right display mode per intent (inline by default; fullscreen only where browsing needs
it; picture-in-picture only for live state). Brand only through `server` `branding` tokens — accent on
the primary CTA, logo, and badges, nothing else; the compiler derives the palette. Never inject raw
global CSS.

## Domain guardrails

For regulated-adjacent apps, add app-specific trust behaviors and **show them in the rendered pixels**:
cite the source and its revision for consequential lookups; frame regulated content as "considerations,
not a ruling"; never invent compatibility, availability, or pricing; and always show the relevant
caution/disclaimer. These are what make a regulated-adjacent app approvable.

## Privacy and data

Data flows through OpenAI; tool payloads and whatever the server stores must match the partner’s privacy
policy. No payment happens in chat (PCI stays off-app). Avoid per-user OAuth in a top-of-funnel v1 (use
service credentials via a `connector`); add end-user auth only for two-way apps (`customerAuth`). Keep
secrets out of tool output, widgets, and logs. If the partner’s published policy predates the app, flag a
privacy gap for their counsel before submission. Re-run this checklist against the *built* app before
every submission — not just the wireframe.