---
id: antipattern-action-chain-no-stop
title: Anti-pattern — `validateForm` doesn't halt chains
kind: pattern
sources: [docs/consumer/ai-context-patterns.md#action-chains-dont-stop-on-failure]
---

# Anti-pattern — `validateForm` doesn't halt chains

**Action chains do NOT stop on failure.** `validateForm` marks errors
but does NOT halt subsequent actions in the chain. Using `validateForm`
as a gate before `fetch` runs the fetch even when validation fails.

## Wrong

```json
"press": [
  { "action": "validateForm", "params": { "formId": "f" } },
  { "action": "fetch", "params": { "url": "/api/save", "method": "POST" } }
]
```

`fetch` runs **regardless of validation result**. The user sees errors
in the form AND the bad data is sent to the server.

## Right

Use `submitForm` with `formId` — validates, blocks if invalid, submits
if valid:

```json
"press": { "action": "submitForm", "params": {
  "formId": "f",
  "url": "/api/save",
  "method": "POST",
  "body": {}
}}
```

## Related concepts

- [[@action-submit-form]]
- [[@action-form-control]]
- [[@concept-action-chains]]
- [[@concept-forms]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § Action chains don't stop on failure`
