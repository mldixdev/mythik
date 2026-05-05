---
id: action-navigate
title: `navigateScreen` / `goBackScreen` (and low-level `navigate`/`goBack`)
kind: action
sources: [docs/consumer/ai-context.md#action-reference, docs/consumer/reference-doc.md#action-reference]
---

# `navigateScreen` / `goBackScreen`

Navigation actions for AppSpec apps. **Always use `navigateScreen` and
`goBackScreen`** — they call `AppEngine` directly. The legacy `navigate` and
`goBack` are low-level state-intent setters that don't actually navigate
(rule 90).

## Shape / Signature

```json
{ "action": "navigateScreen", "params": { "screen": "<id>", "<param>": <value>, ... } }
{ "action": "goBackScreen" }
```

Extra params beyond `screen` flow into `/navigation/params` and are
reset on each navigation.

## Examples

Navigate with extra params:
```json
{ "action": "navigateScreen", "params": { "screen": "profile", "employeeId": 42 } }
```

Target screen reads `/navigation/params`:
```json
"props": { "content": { "$state": "/navigation/params/employeeId" } }
```

Go back to whichever screen navigated here:
```json
{ "action": "goBackScreen" }
```

## State policy interactions

| Policy | navigate-away | navigate-back |
|---|---|---|
| `preserve` | keep state | restore |
| `reset` | clear | fresh initialState |
| `reload` | clear | re-execute initialActions |

See [[@concept-state-policies]].

## Constraints / Anti-patterns

- **Don't use `navigate` / `goBack`** — they only set state intents and
  don't trigger AppEngine navigation. The CLI/runtime won't actually
  switch screens.
- For data that should persist across back-navigation (master/detail row
  context), use `/ui/selectedRow` — see [[@pattern-cross-screen-data-flow]].
- `/navigation/params` is reset on each navigation — for persistent data
  use `/ui/selected*`.

## Related concepts

- [[@concept-navigation]] — sidebar / breadcrumb / initialScreen
- [[@concept-state-policies]] — preserve / reset / reload
- [[@path-navigation]] — `/navigation/*` paths
- [[@pattern-cross-screen-data-flow]] — master→detail patterns

## Sources (raw)

- `docs/consumer/ai-context.md § Actions → Action Reference`
- `docs/consumer/reference-doc.md § Actions → Action Reference` + rule 19, 90
