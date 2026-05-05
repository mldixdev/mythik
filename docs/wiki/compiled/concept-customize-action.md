---
id: concept-customize-action
title: Customize — write a custom action
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# Customize — write a custom action

Write a custom action callable from spec via
`{ action: 'myAction', params: {...} }`.

## Read order

1. **`packages/core/src/actions/dispatcher.ts`** — built-in actions
   registry + dispatch flow + action-context shape.
2. Spec's `customActions` config in `ai-context.md § Actions`.

## Why this works

Custom actions register through the **same dispatcher** used by
built-ins. Reading the built-in implementations (`setState`, `fetch`,
`navigate`) gives the canonical pattern.

## Related concepts

- [[@concept-where-to-look]]
- [[@concept-action-middleware]] — alternative for cross-cutting concerns
- [[@concept-customize-plugin]]

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md § Section 1 → custom action`
