---
id: cli-tokens
title: `mythik tokens` — DNA inspection
kind: concept
sources: [docs/consumer/reference-doc.md#cli-token-inspection]
---

# `mythik tokens`

Inspects DNA derivation. Shows full resolved token set.

## Usage

```bash
mythik tokens --dna '{"primary":"#0D9488","roundness":0.7}' --json
```

## Output

JSON tree of resolved tokens (colors, shape, typography, spacing,
elevation, motion, opacity, identity).

## Use cases

- Verify what DNA generates before applying.
- Debug unexpected resolved values.
- Compare two DNA settings side by side.

## Related concepts

- [[@concept-dna-seeds]]
- [[@concept-token-system]]
- [[@concept-cli-tokens-inspect]]
- [[@cli-overview]]

## Sources (raw)

- `docs/consumer/reference-doc.md § CLI Token Inspection`
