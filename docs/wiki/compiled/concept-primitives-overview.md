---
id: concept-primitives-overview
title: Primitives — overview
kind: concept
sources: [docs/consumer/ai-context.md#primitives, docs/consumer/ai-context-primitives.md]
---

# Primitives — overview

37 built-in visual building blocks. Each accepts the standard set of
common props (`style`, `visible`, `permission`) plus per-type-specific
props.

## Categories

| Category | Primitives |
|---|---|
| Layout | [[@primitive-box]], [[@primitive-text]], [[@primitive-image]], [[@primitive-icon]], [[@primitive-stack]], [[@primitive-grid]], [[@primitive-scroll]], [[@primitive-divider]], [[@primitive-spacer]] |
| Form | [[@primitive-input]], [[@primitive-textarea]], [[@primitive-select]], [[@primitive-checkbox]], [[@primitive-toggle]], [[@primitive-slider]] |
| Interaction | [[@primitive-button]], [[@primitive-touchable]], [[@primitive-list]] |
| Overlays | [[@primitive-modal]], [[@primitive-drawer]], [[@primitive-tabs]], [[@primitive-accordion]], [[@primitive-wizard]], [[@primitive-screen]], [[@primitive-screen-outlet]] |
| Charts | [[@primitive-bar-chart]], [[@primitive-line-chart]], [[@primitive-pie-chart]], [[@primitive-area-chart]], [[@primitive-table]], [[@primitive-kanban-board]] |
| Special | [[@primitive-file-upload]], [[@primitive-camera]], [[@primitive-signature]], [[@primitive-audio-player]], [[@primitive-skeleton]], [[@primitive-toast-container]] |

## Common props (all primitives)

- `style` — CSS object
- `visible` — boolean expression
- `permission` — `{ visible, editable, readonly }` per role

## Tokens are project-defined

No framework defaults for design tokens. If no tokens are declared, use
direct CSS values. See [[@concept-token-system]].

## Spatial primitive

- [[@primitive-spatial-map]] - generic SVG/data-first map for spatial layouts and editors.

## Related concepts

- [[@concept-element-properties]]
- [[@concept-primitive-prop-schemas]] — `PRIMITIVE_PROP_SCHEMAS`
- [[@concept-token-system]]

## Sources (raw)

- `docs/consumer/ai-context.md § Primitives`
- `docs/consumer/ai-context-primitives.md` (full)
