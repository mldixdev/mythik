---
id: concept-customize-validator-rule
title: Customize — custom validator rule (NOT extensible in v0.1)
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# Customize — custom validator rule

**NOT officially extensible in v0.1.** These files are the canonical
implementations if you need to fork or contribute upstream.

## Source files

- `packages/core/src/security/spec-validator.ts` — spec-level rules
- `packages/core/src/security/api-spec-validator.ts` — ApiSpec rules
- `packages/core/src/security/app-spec-validator.ts` — AppSpec rules

## What to do

- For project-specific rules, prefer `mythik lint` extensibility (see
  [[@concept-customize-cli-lint-rule]] — also not officially extensible
  in v0.1, but easier surface).
- For framework-upstream contributions, fork and follow the existing
  patterns.

## Related concepts

- [[@concept-customize-cli-lint-rule]]
- [[@cli-validate]]
- [[@cli-lint]]

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md § Section 1 → custom validator rule`
