---
id: cli-patch
title: `mythik patch` - RFC 6902 patches
kind: concept
sources: [docs/consumer/ai-context.md#cli-workflow, docs/consumer/reference-doc.md#patch-input-file-vs-stdin]
---

# `mythik patch`

Apply RFC 6902 JSON patches. Prefer `--from-file` for cross-shell
ergonomics when the patch contains `$state`, `$template`, `$auth`, or
other shell-sensitive strings.

## Usage

### Preferred path - file

```bash
mythik patch task-manager --from-file patch.json
```

`--from-file <path>` wins over ambient non-TTY stdin. Intentional stdin
still works via `--from-file -` or a pipe without `--from-file`:

```bash
cat patch.json | mythik patch task-manager
mythik patch task-manager --from-file -
```

### Inline

```bash
mythik patch task-manager '[{"op":"replace","path":"/elements/title/props/content","value":"New Title"}]'
```

Inline remains valid for tiny patches, but file input is the canonical
cross-shell path.

## Patch rules

- **`"op": "add"` with numeric index inserts BEFORE** that index - does
  NOT replace.
- Use `/-` to append at the end.
- Use `"op": "replace"` to overwrite.

## Never inline large JSON or shell-sensitive expressions

Shell quoting breaks with nested quotes and `$<word>` strings. Use
`--from-file` for anything beyond a few ops or for any patch containing
`$state`, `$template`, `$auth`, or `$row`.

## TOON input autodetection

Patch input autodetects format: JSON (starts with `[` or `{`) or TOON
(everything else):

```bash
mythik patch task-manager --from-file patch.toon
```

See [[@cli-toon]].

## AppSpec patch paths

Use `/layout/elements/...`, NOT `/elements/...`. See [[@cli-app-spec]].

## Versioning

`--author <name>` records history when the resolved store supports
`saveVersion`. JSON/TOON success output includes `versioned: boolean`
and `version?: number`. See [[@cli-versioning-author]].

## Related concepts

- [[@cli-overview]]
- [[@cli-toon]]
- [[@cli-app-spec]]
- [[@cli-versioning-author]]
- [[@cli-history]]
- [[@cli-programmatic-api]] - `runPatch`

## Sources (raw)

- `docs/consumer/ai-context.md` CLI Workflow / Patch rules
- `docs/consumer/reference-doc.md` Patch Input: File vs Stdin
