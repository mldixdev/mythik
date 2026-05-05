---
id: concept-primitive-prop-schemas
title: `PRIMITIVE_PROP_SCHEMAS` — primitive metadata
kind: concept
sources: [, docs/consumer/ai-context-runtime-semantics.md#13-column-actions-lazy-resolution-at-press-time]
---

# `PRIMITIVE_PROP_SCHEMAS`

Self-describing primitive metadata exported from `mythik`. Each
primitive declares its valid prop names AND prop subtrees that hold action
bindings (resolved at press time, not render time).

## Shape (v0.1+)

```ts
import { PRIMITIVE_PROP_SCHEMAS, type PrimitiveSchema } from 'mythik';

PRIMITIVE_PROP_SCHEMAS.table
// → { validProps: ['data', 'columns', 'style', ...], lazyActionPaths: ['columns[].actions[].onPress', 'onRowClick'] }
```

## Use cases

- **Spec validation** — `mythik validate` checks prop names against
  `validProps` (Levenshtein "did you mean?" suggestions for typos).
- **Lazy action paths** — engine consults `lazyActionPaths` to keep
  matched subtrees raw at render; the row dispatcher resolves them at
  press/click time with `/ui/selectedRow` context. Table covers both
  `columns[].actions[].onPress` and `onRowClick`. See
  [[@concept-expression-timing]].

## Migration from pre-v0.1

The shape changed from `string[]` to `{ validProps, lazyActionPaths }`:

```ts
// Before
const validProps = PRIMITIVE_PROP_SCHEMAS.table; // ['data', 'columns', ...]

// After
const validProps = PRIMITIVE_PROP_SCHEMAS.table.validProps;
```

## Related concepts

- [[@concept-expression-timing]]
- [[@cli-validate]] — uses this for prop validation

## Sources (raw)

- `` — § Breaking: `PRIMITIVE_PROP_SCHEMAS` shape
- `docs/consumer/ai-context-runtime-semantics.md § 1.3` — lazy mechanism
