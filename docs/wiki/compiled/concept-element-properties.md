---
id: concept-element-properties
title: Element Properties (full catalogue)
kind: concept
sources: [docs/consumer/ai-context.md#element-properties, docs/consumer/reference-doc.md#element-properties]
---

# Element Properties

Every entry in `elements` is an Element object. `type` and (for layout
primitives) `children` are the only common-required fields; everything else is
optional. The full set is unified across all primitives — the renderer
dispatches per-type but the property surface is shared.

## Shape / Signature

| Property | Type | Purpose |
|---|---|---|
| `type` | string | Primitive name OR template name OR custom-element name |
| `props` | object | Component props (can contain expressions) |
| `children` | string[] | Child element IDs |
| `style` | object | CSS styles (can contain expressions) |
| `visible` | expression | Show/hide condition |
| `permission` | object | `{ visible, editable, readonly }` per role |
| `repeat` | object | `{ statePath, key }` or `{ source, key }` |
| `on` | object | Event handlers — `{ press, change, submit }` |
| `hover` | object | Style overrides on pointer enter |
| `active` | object | Style overrides on press |
| `focus` | object | Style overrides on keyboard focus |
| `transition` | object | `{ duration, ease }` |
| `motion` | object | Framer-Motion-style mount/exit (legacy) |
| `animations` | object | Animation engine config (preferred over `motion`) |
| `key` | expression | Dynamic remount key (forces re-mount on value change) |
| `skeleton` | boolean | `false` to opt out of auto-skeleton |

## Examples

Container with conditional visibility:
```json
{
  "type": "box",
  "props": { "surface": "card" },
  "style": { "padding": 24 },
  "visible": { "$state": "/user/role", "eq": "admin" },
  "children": ["title", "actions"]
}
```

Touchable with hover + press feedback:
```json
{
  "type": "touchable",
  "hover": { "scale": 1.02 },
  "active": { "scale": 0.97 },
  "transition": { "duration": 150 },
  "on": { "press": { "action": "openModal", "params": { "id": "edit" } } }
}
```

## Constraints / Anti-patterns

- All primitives accept `style`, `visible`, and `permission`.
- Element-level `style/hover/active/focus` overrides variant.
- Top-level `variant` field is silently ignored — `variant` lives under
  `props` (see [[@antipattern-element-variant-top-level]]).
- Don't set `visible` on `modal`/`drawer` — engine manages those via
  `/ui/modals/{id}` (see [[@antipattern-modal-drawer-visible]]).

## Related concepts

- [[@concept-element-key]] — `key` semantics
- [[@concept-interactive-states]] — `hover`/`active`/`focus`/`transition`
- [[@concept-animations-engine]] — `animations` field
- [[@concept-motion-field]] — legacy `motion` field
- [[@concept-repeat]] — `repeat` config
- [[@concept-visibility]] — `visible` expressions

## Sources (raw)

- `docs/consumer/ai-context.md § Spec Structure → Element Properties`
- `docs/consumer/reference-doc.md § Element Properties`
