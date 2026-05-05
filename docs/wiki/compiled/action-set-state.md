---
id: action-set-state
title: `setState` — write to state
kind: action
sources: [docs/consumer/ai-context.md#action-reference, docs/consumer/reference-doc.md#action-reference]
---

# `setState` — write to state

Sets a value in state at the given JSON Pointer path. The value can contain
expressions and nested objects (deeply resolved). Compose objects without
`$object` — plain objects with `$state` children resolve recursively.

## Shape / Signature

```json
{ "action": "setState", "params": { "statePath": "/path", "value": <expression-or-value> } }
```

## Examples

Simple value:
```json
{ "action": "setState", "params": { "statePath": "/ui/activeTab", "value": "overview" } }
```

Expression value:
```json
{ "action": "setState", "params": {
  "statePath": "/items",
  "value": { "$array": "append", "source": { "$state": "/items" }, "value": { "name": "New" } }
}}
```

Object composition (deeply resolves `$state` inside):
```json
{ "action": "setState", "params": {
  "statePath": "/draft",
  "value": { "dna": { "$state": "/dna" }, "identity": { "$state": "/identity" } }
}}
```

## Constraints / Anti-patterns

- **Cannot write to derive paths.** `derive` paths are protected — setState
  targeting one throws at runtime. See [[@concept-state-protection]].
- **Cannot write to framework-reserved paths** (e.g., `/auth/*`,
  `/ui/selectedRow`, `/ui/modals/*`). StateGuard rejects these writes.
- Action chains commit state between steps — `[setState, navigateScreen]`
  works because the navigated screen sees the just-written state.

## Related concepts

- [[@expression-bindstate]] — equivalent two-way binding via input
- [[@concept-state-protection]] — protected paths
- [[@concept-action-chains]] — sequential commit semantics

## Sources (raw)

- `docs/consumer/ai-context.md § Actions → Action Reference`
- `docs/consumer/reference-doc.md § Actions → Action Reference`
