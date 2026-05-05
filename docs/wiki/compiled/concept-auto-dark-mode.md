---
id: concept-auto-dark-mode
title: Auto dark mode
kind: concept
sources: [docs/consumer/ai-context.md#deep-design-token-system, docs/consumer/reference-doc.md#auto-dark-mode]
---

# Auto dark mode

DNA automatically generates `modes.dark` by inverting tonal palette stops.
**No manual dark theme needed.** Override with explicit `modes.dark`
values if desired.

## Behavior

- DNA is the source — palette stops invert in OKLCH lightness for
  dark mode.
- `toggleTheme` action toggles `/preferences/theme`.
- `$token` automatically reads `/preferences/theme` and resolves with
  the dark mode overrides when active.
- All primitives re-render automatically.

## Override

If the auto-derived dark mode isn't what you want:
```json
"tokens": {
  "dna": { "primary": "#0D9488" },
  "modes": {
    "dark": {
      "colors": { "background": "#0a0a0a", "surface": "#1a1a1a" }
    }
  }
}
```

## With variants

`$path` references in variants resolve against the active token tree
(dark already applied) — see [[@concept-path-references]]. No separate
dark variant definitions needed unless the dark change isn't just a token
swap.

## Related concepts

- [[@expression-token]]
- [[@action-toggle-theme]]
- [[@concept-component-variants]]
- [[@concept-path-references]]
- [[@concept-identity-color-scheme]]

## Sources (raw)

- `docs/consumer/ai-context.md § Deep Design Token System → Auto dark mode`
- `docs/consumer/reference-doc.md § Auto Dark Mode`
