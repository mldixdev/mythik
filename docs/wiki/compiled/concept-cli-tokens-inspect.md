---
id: concept-cli-tokens-inspect
title: `mythik tokens` — CLI inspection
kind: concept
sources: [docs/consumer/ai-context.md#deep-design-token-system, docs/consumer/reference-doc.md#cli-token-inspection]
---

# `mythik tokens` — CLI inspection

Shows the full resolved token set for debugging and verifying what DNA
generates before applying to a spec.

## Usage

```bash
mythik tokens --dna '{"primary":"#0D9488","roundness":0.7}' --json
```

## Output

JSON tree of all resolved tokens (colors, shape, typography, spacing,
elevation, motion, opacity, identity). Useful for:

- Verifying what DNA generates before applying.
- Debugging unexpected resolved values.
- Comparing two DNA settings side by side.

## Related concepts

- [[@concept-dna-seeds]]
- [[@concept-token-system]]
- [[@cli-overview]]
- [[@cli-tokens]]

## Sources (raw)

- `docs/consumer/ai-context.md § Deep Design Token System → CLI inspection`
- `docs/consumer/reference-doc.md § CLI Token Inspection`
