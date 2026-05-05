---
id: concept-animation-caps
title: Animation performance caps
kind: concept
sources: [docs/consumer/reference-doc.md#animation-system--infrastructure-plan-2-2026-04-18]
---

# Animation performance caps

`validateAnimationCaps(animations)` returns `{ warnings, errors }` based on
soft/hard caps.

## Caps

| Scope | Soft (warn) | Hard (error) |
|---|---|---|
| Animations per trigger | 3 | 6 |
| Triggers per element with animations | 5 | 7 |

`null` triggers are excluded from the count.

## Web-only recipes

`WEB_ONLY_RECIPES: ReadonlySet<string>` — currently `{ 'glow' }`. The
validator emits a warning when a web-only recipe is referenced, calling out
the silent RN no-op until per-platform shadow parsing lands.

See [[@concept-web-only-recipes]].

## Related concepts

- [[@concept-animations-engine]]
- [[@concept-animation-triggers]]
- [[@concept-web-only-recipes]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 188, 198`
