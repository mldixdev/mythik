---
id: concept-interactive-states
title: Interactive states — hover / active / focus / transition
kind: concept
sources: [docs/consumer/ai-context.md#interactive-states--animations, docs/consumer/reference-doc.md#interactive-states]
---

# Interactive states — hover / active / focus / transition

Add visual feedback to elements. Zero overhead for elements without
interactions.

## Shape / Signature

```json
"hover": { "scale": 1.03, "backgroundColor": "#F1F5F9" },
"active": { "scale": 0.97 },
"focus": { "boxShadow": "0 0 0 3px rgba(13,148,136,0.3)" },
"transition": { "duration": 150, "ease": "easeOut" }
```

## CSS vs Motion (auto-detection)

| Property | Path |
|---|---|
| `scale`, `scaleX`, `scaleY`, `rotate`, `x`, `y` | Motion wrapper |
| Everything else (color, opacity, shadow…) | CSS pseudo-classes (no extra DOM) |

## Transform shorthand

| Property | Effect |
|---|---|
| `scale` | Scale up/down |
| `x` | Move horizontally |
| `y` | Move vertically |
| `rotate` | Degrees |
| `scaleX` / `scaleY` | Axis-specific |

## Examples

Save button with full state set:
```json
"save-btn": {
  "type": "button", "props": { "label": "Save Changes" },
  "style": { "backgroundColor": { "$token": "colors.primary" }, "color": "#fff", "padding": "10px 20px", "borderRadius": 10 },
  "hover": { "scale": 1.03, "y": -1 },
  "active": { "scale": 0.97 },
  "focus": { "boxShadow": "0 0 0 3px rgba(13,148,136,0.3)" },
  "transition": { "duration": 150, "ease": "easeOut" }
}
```

## Constraints / Anti-patterns

- **CSS hover only works on**: `box`, `text`, `stack`, `grid`, `scroll`,
  `button`, `touchable`, `table`. Other types silently ignore. `mythik
  validate` catches this (rule 14, 34).
- **Don't use `overflow: hidden` with `box-shadow` hover** — overflow
  clips the shadow. See [[@antipattern-overflow-hidden-with-shadow]].
- **Buttons / touchables have built-in CSS transitions** — only add
  `hover`/`active` for custom behavior beyond defaults (rule 22).

## Related concepts

- [[@concept-css-vs-motion]]
- [[@concept-animations-engine]] — `animations` is preferred for new specs
- [[@concept-component-variants]] — variants can supply default states

## Sources (raw)

- `docs/consumer/ai-context.md § Interactive States & Animations → Hover/Active/Focus`
- `docs/consumer/reference-doc.md § Interactive States`
