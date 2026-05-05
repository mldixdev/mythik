---
id: cli-toon
title: `--toon` - token-efficient format
kind: concept
sources: [docs/consumer/reference-doc.md#toon-format-token-efficient-output]
---

# `--toon`

TOON is a token-efficient format. Patch input autodetects JSON vs TOON;
`--toon` controls TOON output.

## Use on `elements` and `patch`

```bash
mythik elements task-manager btn,nav --toon
mythik patch task-manager --from-file patch.toon --toon
```

## TOON input autodetect

`mythik patch` autodetects format from the first character: JSON (`[` or
`{`) vs TOON (everything else).

JSON input:

```bash
mythik patch task-manager --from-file patch.json
```

TOON input:

```bash
mythik patch task-manager --from-file patch.toon
```

## Related concepts

- [[@cli-elements]]
- [[@cli-patch]]

## Sources (raw)

- `docs/consumer/reference-doc.md` TOON Format
