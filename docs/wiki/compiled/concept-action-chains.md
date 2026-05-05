---
id: concept-action-chains
title: Action chains — sequential execution
kind: concept
sources: [docs/consumer/ai-context.md#actions, docs/consumer/ai-context-patterns.md, docs/consumer/reference-doc.md#multiple-actions-sequential]
---

# Action chains — sequential execution

Wire multiple actions to one event by passing an array. **Each action
completes before the next starts** — sequential dispatch with state commit
between steps.

## Shape / Signature

```json
{ "on": { "press": [<action>, <action>, <action>] } }
```

## Examples

Save then close + refresh:
```json
"press": [
  { "action": "fetch", "params": { "url": "/api/save", "method": "POST", "body": {...} } },
  { "action": "closeModal", "params": { "id": "edit-modal" } },
  { "action": "fetch", "params": { "url": "/api/items", "target": "/items" } }
]
```

Set state then navigate (the navigated screen sees the new state):
```json
"press": [
  { "action": "setState", "params": { "statePath": "/draft", "value": { "$state": "/form" } } },
  { "action": "navigateScreen", "params": { "screen": "review" } }
]
```

## Commit semantics

Each action in a sequential chain commits state before the next runs.
`[setState, navigateScreen]` works — the navigated screen sees the state
written by `setState`.

## Constraints / Anti-patterns

- **Chains do NOT stop on failure.** `validateForm` marks errors but does
  NOT halt subsequent actions. Use `submitForm` with `formId` instead. See
  [[@antipattern-action-chain-no-stop]].
- For background dispatch (next action immediately), use
  [[@concept-fire-and-forget]].
- For optimistic CRUD UX, prefer [[@concept-transactions]] over plain chains.

## Related concepts

- [[@concept-fire-and-forget]] — async dispatch
- [[@concept-transactions]] — optimistic + auto-rollback
- [[@action-submit-form]] — gating pattern
- [[@action-set-state]] — typical chain step

## Sources (raw)

- `docs/consumer/ai-context.md § Actions`
- `docs/consumer/ai-context-patterns.md § Action chains commit state between steps`
- `docs/consumer/reference-doc.md § Multiple Actions (Sequential)`
