---
id: concept-storage-evolution
title: Storage — schema evolution policy
kind: concept
sources: [docs/consumer/ai-context.md#schema-evolution]
---

# Schema evolution policy

When the framework changes the schema in a future version, that version's
release notes will gain an "Evolution from v0.X.0" subsection listing
per-version diffs (additive columns, new indexes, etc.) with idempotent
ALTER instructions.

## Canonical evolution path

AI inspects the consumer's existing schema first, then applies the
smallest set of ALTER statements to converge on the current version.

## v0.1.0 baseline

No evolution diffs yet. v0.1.0 is the first public release; consumers
running pre-v0.1.0 with manually-created tables are unaffected (schema
unchanged from what the demo script produced).

## Related concepts

- [[@concept-storage-overview]]

## Sources (raw)

- `docs/consumer/ai-context.md § Schema evolution`
