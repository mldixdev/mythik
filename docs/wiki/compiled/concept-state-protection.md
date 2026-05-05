---
id: concept-state-protection
title: State protection — protected paths
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#2-framework-reserved-state-paths, docs/consumer/ai-context-runtime-semantics.md#53-derive-evaluation-order]
---

# State protection — protected paths

Several state paths are **read-only** to consumer specs. The `StateGuard`
blocks `setState` writes to these paths, and the validator catches
`setState → protected path` at load time. Defense in depth.

## Protected categories

- **Derive paths** — every entry in `spec.derive` is registered as
  protected. See [[@concept-derive]] + [[@concept-derive-datasources-mount-order]].
- **Auth paths** — `/auth/*` is owned by the auth engine. See
  [[@concept-auth-state-paths]].
- **Default protected patterns** — `/auth/*`, `/tx/*`, `/ui/forms/*` are
  always protected. Derive paths matching these patterns ERROR at
  validation.
- **Framework-reserved paths** — `/ui/selectedRow`, `/ui/modals/*`,
  `/ui/drawers/*`, `/ui/loading`, `/ui/lastError`, `/ui/device/*`,
  `/{target}Loading`, `/{target}Error`, `/{target}Deferred`. Some
  consumers can READ these but the framework owns the writes.

## Implementation

Derive paths are contributed via RAII handle to `protectionRegistry`;
`stateGuard` reads via lazy callback. Validator catches
`setState → derive path` at load time (8 new derive/dataSources checks);
dispatcher catches at runtime via `stateGuard.assertCanWrite`.

## What happens if you violate

- **Validator load time**: error during `mythik validate` / `mythik push`
  with path name.
- **Runtime**: dispatcher throws via `stateGuard.assertCanWrite` —
  visible only at render time if validation was bypassed.

## Related concepts

- [[@concept-derive]]
- [[@concept-auth-state-paths]]
- [[@concept-data-sources]]
- [[@path-ui-selected-row]] / [[@path-ui-modals-drawers]] / etc.

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 2`, § 5.3
