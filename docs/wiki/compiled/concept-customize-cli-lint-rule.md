---
id: concept-customize-cli-lint-rule
title: Customize — custom CLI lint rule (NOT extensible in v0.1)
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# Customize — custom CLI lint rule

**NOT officially extensible in v0.1.** Reading these files is for
understanding rule shape, contributing upstream, or forking.

## Source files

| Concern | File |
|---|---|
| `spec-row-literal` (spec rule) | `packages/core/src/security/spec-validator.ts` |
| `spec-crud-id-collision`, `spec-auth-domains-port` (spec rules) | `packages/core/src/security/api-spec-validator.ts` |
| `code-store-save-bypass` (code rule) | `packages/cli/src/lint/code-rules.ts` |
| Lint orchestrator | `packages/cli/src/lint/orchestrator.ts` |
| Shared types | `packages/cli/src/lint/types.ts` |

## Related concepts

- [[@cli-lint]]
- [[@concept-customize-validator-rule]]

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md § Section 1 → custom CLI lint rule`
