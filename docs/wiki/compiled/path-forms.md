---
id: path-forms
title: `/ui/forms/{id}/*` — declarative form state
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#26-forms-state-paths-formid]
---

# `/ui/forms/{id}/*`

When a form is declared in `spec.forms`, the framework reserves the
`/ui/forms/{formId}/*` subtree for form state. Internal keys (`__valid`,
`__touched`, `__errors`) are framework-owned.

## Paths

See [[@concept-form-state-paths]] for the full table:
- `/ui/forms/{id}/isValid`
- `/ui/forms/{id}/errorCount`
- `/ui/forms/{id}/isDirty`
- `/ui/forms/{id}/fields/{field}/errors`
- `/ui/forms/{id}/fields/{field}/touched`
- `/ui/forms/{id}/fields/{field}/dirty`

## Read patterns

Prefer `$formValid` / `$formField` expressions where they exist —
abstract over internal flag paths and future-proof against framework
changes.

## Related concepts

- [[@concept-forms]]
- [[@concept-form-state-paths]]
- [[@concept-state-protection]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 2.6`
