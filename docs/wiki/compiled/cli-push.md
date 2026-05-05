---
id: cli-push
title: `mythik push` — three approved write paths
kind: concept
sources: [docs/consumer/ai-context.md#cli-is-the-only-approved-path-for-spec-writes, docs/consumer/reference-doc.md#rule-248]
---

# `mythik push`

CLI command for creating / replacing specs. **The only approved path for
spec writes** — `SpecStore.save()` is `@internal`.

## Three approved forms

### Shell — single file

```bash
mythik push <id> --from-file spec.json
mythik push <id> < spec.json          # stdin
cat spec.json | mythik push <id>      # pipe
mythik push <id> <<'EOF'              # heredoc
{ ... }
EOF
```

`--from-file` is **cross-shell ergonomic** for any spec containing
`$state`, `$template`, `$auth`, or `$row` — PowerShell expands
`$<word>` in double-quoted strings (rule 248).

### Bulk — directory

```bash
mythik push --from-dir ./specs/
```

Sequential per-file push of every `*.json`. **Continue-on-error**:
failures don't stop subsequent specs. **No rollback.** Partial state
recovers by fixing failures and re-running.

### Programmatic — `mythik-cli/api`

```ts
import { runPush, type PushOptions, type PushResult } from 'mythik-cli/api';

const result = await runPush({ id: 'my-screen', spec: doc, json: true });
const data = JSON.parse(result.output) as PushResult;
```

Same code path as the binary, no shell. Pass `json: true` to receive
structured `PushResult`.

## Input precedence

- `--from-file <path>` wins over ambient non-TTY stdin.
- Intentional stdin remains supported via `--from-file -` or by piping without `--from-file`.
- `--from-file` plus a positional argument is still a conflict.
- `--from-dir` is mutually exclusive with `<screen>` argument and `--from-file`.
- Conflicts produce explicit error + exit 1.

## Validation behavior

- **New screens** save even with validation errors (fix later with
  `mythik patch`).
- **Existing screens** reject invalid specs unless `--force` is used.
- Validation errors include suggested fix patches for auto-fixable
  issues (typos, orphan children).

## Versioning

`--author <name>` activates `VersionedSpecStore.saveVersion()`. See
[[@cli-versioning-author]].

## Constraints / Anti-patterns

- **Never call `SpecStore.save()` from app code** — bypasses validation,
  produces silently-broken specs. See [[@antipattern-store-save-bypass]].

## Related concepts

- [[@cli-overview]]
- [[@cli-config]]
- [[@cli-versioning-author]]
- [[@cli-programmatic-api]]
- [[@cli-lint]]
- [[@antipattern-store-save-bypass]]

## Sources (raw)

- `docs/consumer/ai-context.md § CLI is the only approved path for spec writes`
- ` § Item F`
- `docs/consumer/reference-doc.md § rule 248`
