---
id: concept-element-key
title: Element `key` — forced remount
kind: concept
sources: [docs/consumer/ai-context.md#rules, docs/consumer/reference-doc.md#element-properties]
---

# Element `key` — forced remount

`Element.key` is a dynamic React key. When the resolved value changes, React
unmounts and remounts the element, re-triggering mount animations and
resetting any internal state. Use `key` whenever you need to force-restart
visual transitions on a state change (e.g., re-animate a preview after the
user applies new settings).

## Shape / Signature

```json
{ "type": "...", "key": "<expression>", "props": { ... } }
```

The expression supports `$template`, `$state`, and other expressions that
resolve to a string.

## Examples

Re-animate a preview when DNA tokens are applied:
```json
{
  "type": "box",
  "key": { "$template": "preview-${/internal/tokenVersion}" },
  "animations": { "mount": { "recipe": "fade-up" } },
  "children": ["preview-content"]
}
```

Each time `/internal/tokenVersion` changes, the box remounts and
`mount: fade-up` re-fires.

## Constraints / Anti-patterns

- Use sparingly — every `key` change is a real unmount/remount. Internal
  state (form fields inside, scroll position) is lost.
- Prefer `animations.stateChange` (see
  [[@concept-state-change-animation]]) when you only want to react to a
  state change, not full remount.

## Related concepts

- [[@concept-animations-engine]] — `animations.mount` recipes
- [[@concept-state-change-animation]] — softer alternative for state-driven motion

## Sources (raw)

- `docs/consumer/ai-context.md § Rules → rule 45`
- `docs/consumer/reference-doc.md § Element Properties (key row)` + rule 107
