---
id: antipattern-input-type-name
title: Anti-pattern — `inputType` instead of `type`
kind: pattern
sources: [docs/consumer/ai-context-primitives.md#input, docs/consumer/reference-doc.md#rule-50]
---

# Anti-pattern — `inputType`

The `input` primitive uses **`type`**, NOT `inputType`. Using `inputType`
is silently ignored — input falls back to default `"text"` type.

## Wrong

```json
{ "type": "input", "props": { "inputType": "password", "value": ... } }
```

## Right

```json
{ "type": "input", "props": { "type": "password", "value": ... } }
```

## Detection

The CLI validates prop names and warns on unknown props with "did you
mean?" suggestions (Levenshtein matching) — see [[@cli-validate]] (rule
50, 64). The output looks like:

```
⚠ unknown prop "inputType" for type "input" — did you mean "type"?
```

## Related concepts

- [[@primitive-input]]
- [[@cli-validate]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § input` (Wrong/Right examples)
- `docs/consumer/reference-doc.md § rules 50, 64`
