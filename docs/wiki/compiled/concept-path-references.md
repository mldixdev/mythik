---
id: concept-path-references
title: `$path` references inside variants
kind: concept
sources: [docs/consumer/reference-doc.md#path-token-references]
---

# `$path` references inside variants

Inside variant style definitions and `ResolvedVariant.animations`, string
values starting with `$` reference tokens. Resolved against the active
token tree (with dark mode + identity already applied).

## Examples

```json
"$colors.primary"           // → "#0D9488"
"$shape.radius.md"          // → 12
"$elevation.lg"             // → CSS boxShadow string
"$typography.weight.bold"   // → 700
"$spacing.scale.md"         // → 16
```

## Legacy paths

`$radius.md`, `$shadow.lg` still work for backward compat.

## Why this works for dark mode

When dark mode changes `colors.surface` to `#1E293B`, any variant using
`$colors.surface` gets the dark value automatically — no separate dark
variant needed. The `$path` resolution happens after token tree merge.

## Resolution scope (`ResolvedVariant.animations`)

`resolveTokenRefs` is **one-level-deep** for animations: nested structures
(`mount: { recipe: '$recipes.X' }`) pass through unchanged — downstream
animation runtime layers handle deeper resolution. Only top-level trigger
values resolve `$path` references (e.g., `animations: '$animations.interactive'`).

Expression-system scope: only `$path` (token-tree) lookups are recognized
here. `$prop`, `$state`, `$cond` are template-layer concepts.

## Related concepts

- [[@concept-component-variants]]
- [[@concept-token-system]]
- [[@expression-token]] — distinct mechanism (spec-level)
- [[@concept-auto-dark-mode]]

## Sources (raw)

- `docs/consumer/reference-doc.md § $path Token References` + rule 215
