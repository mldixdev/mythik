---
id: cli-programmatic-api
title: Programmatic API — `mythik-cli/api`
kind: concept
sources: [, docs/consumer/ai-context.md#cli-is-the-only-approved-path-for-spec-writes]
---

# Programmatic API — `mythik-cli/api`

Subpath that exposes CLI internals as public functions. **Use this
instead of deep imports** (`mythik-cli/dist/...`).

## Public exports

```ts
import {
  runPush, runPatch, parsePatchInput, runLint,
  type PushOptions, type PushResult,
  type PatchOptions, type CommandResult,
  type LintFinding, type LintSuggestion, type LintResult, type LintOptions,
  type LintSeverity, type LintLocation, type LintSummary,
  // re-exported from mythik:
  type SpecStore, type JsonPatch, type ValidationError, type PatchResult
} from 'mythik-cli/api';
```

## Use cases

- IDE tooling.
- Test harnesses.
- CI scripts.
- Programmatic CRUD over specs without shell.

## Example

```ts
import { runPush } from 'mythik-cli/api';

const result = await runPush({ id: 'my-screen', spec: doc, json: true });
const data = JSON.parse(result.output);
console.log(data.elementCount, data.warnings);
```

## `PushResult` extension

Gained optional `warnings?: ValidationError[]` field (additive,
non-breaking) to surface prop warnings in JSON mode (used by bulk push).

## `runPatch` JSON/TOON metadata

When `runPatch` succeeds with a versioned store and `author`, it records a
version in every output mode. JSON/TOON success output includes additive
`versioned: boolean` and `version?: number` fields.

## Migration

If your tooling uses deep imports:
```diff
- import { runPush } from 'mythik-cli/dist/commands/push.js';
+ import { runPush } from 'mythik-cli/api';
```

## Related concepts

- [[@cli-push]]
- [[@cli-patch]]
- [[@cli-lint]]
- [[@concept-package-layout]]

## Sources (raw)

- ` § Item F`
- `docs/consumer/ai-context.md § CLI is the only approved path for spec writes`
