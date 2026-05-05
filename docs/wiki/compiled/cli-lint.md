---
id: cli-lint
title: `mythik lint` — anti-pattern detection
kind: concept
sources: [, docs/consumer/ai-context.md#pre-push-linting, docs/consumer/reference-doc.md#rule-249]
---

# `mythik lint`

Detect known anti-patterns in specs and consumer code. **4 rules in v0.1.**

## Usage

```bash
mythik lint --from-file spec.json    # single spec file
mythik lint --from-dir specs/        # bulk over a directory
mythik lint                          # auto-discovers via .mythikrc + scans ./src for code rules
mythik lint --specs-only             # filter
mythik lint --code-only              # filter
mythik lint --code-dir <path>        # override default code scan root (default: ./src)
mythik lint --json                   # machine-readable output
```

Programmatic: `import { runLint } from 'mythik-cli/api'`.

## 4 rules in v0.1

| Rule ID | Surface | Severity | Description |
|---|---|---|---|
| `spec-row-literal` | spec | warning | `$row` is not an expression — use `$state: '/ui/selectedRow/<key>'`. See [[@antipattern-row-literal]] |
| `spec-crud-id-collision` | spec | error | `endpoint.path` ending `/:id` combined with `crud: {}` produces `/path/:id/:id`. See [[@antipattern-crud-id-collision]] |
| `spec-auth-domains-port` | spec | warning | `auth.authDomains[i]` containing `:port` strips the port silently. See [[@antipattern-auth-domains-port]] |
| `code-store-save-bypass` | code | error | Calling `*store*.save()` outside `packages/core/` and `packages/cli/` bypasses validation. See [[@antipattern-store-save-bypass]] |

## Defense in depth

Spec rules ALSO run during `mythik push` and `mythik validate` (not just
`lint`). Code rules run only via `mythik lint` (push doesn't see consumer code).

## TypeScript peer dependency

Code rules require TypeScript ^5.0.0 as `peerDependency` (optional). If
not installed, code rules emit one warning finding
`lint-meta-no-typescript` and skip cleanly. Spec rules run independently.

## Exit codes

- `0` — no errors
- `1` — errors found
- `2` — runtime error (e.g., unreadable file)

## Code rule scope (limitations)

`code-store-save-bypass` matches `<Identifier>.save()` callees only
(e.g. `myStore.save(...)`). **Does NOT detect**:
- `this.store.save()`
- `<obj>.<store>.save()`
- `(await getStore()).save()`

These slip through the AST scanner. Generation-level guidance in
`ai-context.md` (anti-patterns) covers all variants; the lint rule is
defense-in-depth, not complete catch.

## Related concepts

- [[@cli-validate]]
- [[@cli-push]]
- [[@antipattern-row-literal]]
- [[@antipattern-crud-id-collision]]
- [[@antipattern-auth-domains-port]]
- [[@antipattern-store-save-bypass]]

## Sources (raw)

- ` § Item I`
- `docs/consumer/ai-context.md § Pre-push linting`
- `docs/consumer/reference-doc.md § rule 249`
