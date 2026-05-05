---
id: cli-history
title: `mythik history` — version history with diffs
kind: concept
sources: [docs/consumer/reference-doc.md#rule-93]
---

# `mythik history`

Shows version history with **inline diffs** between consecutive versions.
Uses `computeStructuralDiff` to show actual before/after values.

## Output

```
v3 (alice, 2026-04-25, push)  "Fixed layout"
   ~ element "btn" prop content: "Send" → "Submit"
v2 (bob,   2026-04-24, push)
   + element "footer-link" added
v1 (system, 2026-04-23, push)
```

## Requirements

`history` only works on specs written via `--author <name>` (which
activates `VersionedSpecStore`). See [[@cli-versioning-author]].

## Related concepts

- [[@cli-versioning-author]]
- [[@concept-versioned-store]]
- [[@concept-rollback]]
- [[@concept-promote-gate]]
- [[@concept-storage-table-versions]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 92, 93`
