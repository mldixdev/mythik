---
id: antipattern-style-block-duplication
title: Anti-pattern — duplicate style blocks
kind: pattern
sources: [docs/consumer/ai-context-patterns.md#rule-dont-duplicate-style-blocks-across-specs]
---

# Anti-pattern — duplicate style blocks

If the same rich style object appears in 2+ specs (or 2+ places in the
same spec), extract to a template or variant. Duplication inflates DB
storage, breaks DRY, makes updates O(N).

## Wrong

```json
// screen-a.json
{ "type": "button", "style": { "background": "linear-gradient(...)", "animation": "pulse 2s ...", ...20 lines } }

// screen-b.json
{ "type": "button", "style": { "background": "linear-gradient(...)", "animation": "pulse 2s ...", ...20 lines } }
```

## Right — extract to a template (composite)

```json
// appSpec.templates once
"templates": { "button-pulse-cta": { ...full definition... } }

// both screens
{ "type": "button-pulse-cta", "props": { "label": "..." } }
```

## Or — extract to a variant (style-only)

```json
"tokens": { "components": { "button": { "ctaPulse": { ...style + states... } } } }

// usage
{ "type": "button", "props": { "variant": "ctaPulse", "label": "..." } }
```

## Decision

See [[@concept-templates-vs-variants]] for the decision walk-through.

## Related concepts

- [[@concept-templates]]
- [[@concept-component-variants]]
- [[@concept-templates-vs-variants]]
- [[@pattern-reusable-components]]

## Sources (raw)

- `docs/consumer/ai-context-patterns.md § Rule: don't duplicate style blocks across specs`
