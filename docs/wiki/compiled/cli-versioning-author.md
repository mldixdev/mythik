---
id: cli-versioning-author
title: `--author` flag — activates versioning
kind: concept
sources: [docs/consumer/reference-doc.md#rules-92-110]
---

# `--author` flag

`mythik push` and `mythik patch` **without `--author`** write directly to
the `screens` table with NO version history. **With `--author <name>`**,
they use `VersionedSpecStore` which writes to BOTH `screens` AND
`screen_versions`, enabling `history`, `diff`, and `rollback` commands.

## Usage

```bash
mythik push my-screen --author alice --description "Initial layout"
mythik patch screen-id --from-file patch.json --author alice --description "Fixed layout"
```

The version row includes:
- `author` — provided via `--author`
- `source_type` — `push` or `patch`
- `description` — optional, via `--description`

**Always use `--author` during development** (rule 110).

## Without `--author`

Commands work as before (no versioning). Useful for git-backed workflows
where `git log` IS the audit trail.

## Patch output metadata

`runPatch` records history in text, JSON, and TOON modes. JSON/TOON
success output includes `versioned: boolean` and `version?: number`.

## Auto-bootstrap

First versioned save on an existing spec with no history automatically
creates v1 (snapshot of current spec), then saves the change as v2. No
migration script needed.

## Related concepts

- [[@cli-history]]
- [[@cli-push]]
- [[@cli-patch]]
- [[@concept-versioned-store]]
- [[@concept-storage-table-versions]]
- [[@concept-rollback]]
- [[@concept-promote-gate]]
- [[@pattern-git-vs-db-versioning]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 92, 110`
