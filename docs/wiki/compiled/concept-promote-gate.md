---
id: concept-promote-gate
title: Promote gate — cross-env validation
kind: concept
sources: [docs/consumer/reference-doc.md#rules-86-87]
---

# Promote gate — cross-env validation

`runPromoteGate({ specIds, fromEnv, toEnv, store, envStore, apiIds? })`
validates ACROSS environments before moving environment pointers.

## 3 validation layers

| Layer | Always available? | Check |
|---|---|---|
| **Spec validation** | yes | Structural rules per doctype |
| **Cross-screen consistency** | yes | Referenced screens exist in destination or batch |
| **Contract validation** | only when `--api` provided | Frontend↔backend contract — see [[@cli-contract]] |

## Modes

- **Individual** — single spec promotion.
- **App-complete** — all specs in an app.
- **Batch-selective** — explicit list of specs.

**Atomic**: all specs pass or none are promoted.

## Batch-aware contract validation

When an api-spec is in the promote batch, contract validation runs against
the **batch version** (source env), not the destination version. Prevents
false alarms when promoting screens + updated api-spec together (rule 87).

When api-spec is NOT in batch, validates against destination env version.

## Related concepts

- [[@concept-environment-store]]
- [[@concept-versioned-store]]
- [[@concept-rollback]]
- [[@cli-contract]]
- [[@pattern-git-vs-db-versioning]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 86-87`
