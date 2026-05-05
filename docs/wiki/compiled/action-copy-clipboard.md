---
id: action-copy-clipboard
title: `copyToClipboard`
kind: action
sources: [docs/consumer/ai-context.md#action-reference, docs/consumer/reference-doc.md#action-reference]
---

# `copyToClipboard`

Copies a value to the system clipboard. Strings and numbers pass through
as-is; **objects are auto-stringified** with `JSON.stringify(value, null, 2)`
(rule 159).

## Shape / Signature

```json
{ "action": "copyToClipboard", "params": { "value": <expr-or-value> } }
```

## Examples

Copy a state value:
```json
{ "action": "copyToClipboard", "params": { "value": { "$state": "/form/email" } } }
```

Copy resolved tokens (auto-stringified):
```json
{ "action": "copyToClipboard", "params": { "value": { "$state": "/tokens/raw" } } }
```

## Mechanism

The action writes to `/ui/clipboard`. The React renderer watches that path
and calls `navigator.clipboard.writeText()` automatically.

## Related concepts

- [[@path-tokens]] — `/tokens/raw` and `/tokens/resolved`
- [[@action-show-notification]] — typical follow-up ("Copied!")

## Sources (raw)

- `docs/consumer/ai-context.md § Actions → Action Reference`
- `docs/consumer/reference-doc.md § rule 159`
