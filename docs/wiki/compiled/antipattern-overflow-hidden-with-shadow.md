---
id: antipattern-overflow-hidden-with-shadow
title: Anti-pattern — `overflow: hidden` + `box-shadow` hover
kind: pattern
sources: [docs/consumer/ai-context.md#rule-15, docs/consumer/reference-doc.md#rule-35]
---

# Anti-pattern — `overflow: hidden` with `box-shadow` hover

Combining `overflow: hidden` with a `boxShadow` change on hover **clips
the shadow** — the hover effect is invisible.

## Wrong

```json
{ "type": "box",
  "style": { "overflow": "hidden", "borderRadius": 12 },
  "hover": { "boxShadow": "0 8px 24px rgba(0,0,0,0.15)" }
}
```

The shadow renders but is clipped to the box bounds.

## Right — drop `overflow: hidden`, or use `filter: brightness()`

If you don't need overflow clipping:
```json
{ "type": "box",
  "style": { "borderRadius": 12 },
  "hover": { "boxShadow": "0 8px 24px rgba(0,0,0,0.15)" }
}
```

If you need overflow + a hover effect, use a non-shadow effect:
```json
{ "type": "box",
  "style": { "overflow": "hidden" },
  "hover": { "filter": "brightness(1.05)" }
}
```

## Related concepts

- [[@concept-interactive-states]]
- [[@concept-css-vs-motion]]

## Sources (raw)

- `docs/consumer/ai-context.md § rule 15`
- `docs/consumer/reference-doc.md § rule 35`
