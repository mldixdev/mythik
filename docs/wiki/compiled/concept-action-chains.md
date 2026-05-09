---
id: concept-action-chains
title: Action chains — sequential execution
kind: concept
sources: [docs/consumer/ai-context.md#actions, docs/consumer/ai-context-patterns.md, docs/consumer/reference-doc.md#multiple-actions-sequential]
---

# Action chains — sequential execution

Wire multiple actions to one event by passing an array. **Each entry
completes before the next starts** — sequential dispatch with state commit
between steps. Entries can be normal action bindings or transaction bindings.

## Shape / Signature

```json
{ "on": { "press": [<action-or-transaction>, <action-or-transaction>] } }
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

Action before a transaction:
```json
"press": [
  { "action": "setState", "params": { "statePath": "/ui/saving", "value": true } },
  {
    "transaction": {
      "optimistic": [{ "action": "setState", "params": { "statePath": "/items", "value": { "$array": "append", "source": { "$state": "/items" }, "item": { "$state": "/draft" } } } }],
      "confirm": [{ "action": "fetch", "params": { "url": "/api/items", "method": "POST", "body": { "$state": "/draft" } } }],
      "onError": [{ "action": "showNotification", "params": { "type": "error", "message": { "$state": "/tx/error/message" } } }]
    }
  },
  { "action": "setState", "params": { "statePath": "/ui/saving", "value": false } }
]
```

Conditional action guard:
```json
{
  "action": "fetch",
  "params": {
    "skipIf": { "$not": { "$state": "/form/isDirty" } },
    "url": "/api/save",
    "method": "POST",
    "body": { "$state": "/form" }
  }
}
```

## Commit semantics

Each entry in a sequential chain commits state before the next runs.
`[setState, navigateScreen]` works — the navigated screen sees the state
written by `setState`.

For a transaction entry, Mythik waits for the transaction to finish before the
next event-array entry runs. Transaction phases themselves still follow the
transaction timing rules.

## Constraints / Anti-patterns

- **Chains do NOT stop on failure.** `validateForm` marks errors but does
  NOT halt subsequent actions. Use `submitForm` with `formId` instead. See
  [[@antipattern-action-chain-no-stop]].
- **`skipIf` skips one action, not the whole chain.** It is resolved at
  dispatch time before other params and removed before the action handler
  runs. Use it for small dispatch-time guards, not for form validation or
  transaction rollback.
- **Do not nest transactions.** An event array may contain a transaction, but
  transaction phases cannot contain another transaction binding.
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
