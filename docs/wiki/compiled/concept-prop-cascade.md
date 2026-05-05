---
id: concept-prop-cascade
title: `$prop` cascade — Layer 3 propagation
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#14-prop-cascade-layer-3-custom-elements, docs/consumer/ai-context-custom-elements.md]
---

# `$prop` cascade

Inside a custom-element render tree, `$prop` references resolve eagerly at
each cascade level with the consumer's supplied values. Nesting pushes a new
prop context; the element's own `$prop` reads its merged props.

## Contract

- **Eager resolution** at each cascade level — composition requires consumer
  values (action chains, data, style tokens) to substitute into the render
  tree at expansion time. Lazy would break Layer 3 propagation.
- **Inner expressions stay lazy** — `$state` / `$template` inside a
  consumer-supplied `$prop` action chain resolve at dispatch.
- **Nearest-enclosing scope** — `$prop` reads the merged props of the
  innermost custom element that wraps it. Outer custom-element props are
  shadowed (NOT inherited).

## Examples

Author exposes a `max` prop:
```json
{
  "type": "rating-stars",
  "props": { "max": { "type": "number", "default": 5 } },
  "render": {
    "type": "icon",
    "props": { "name": "star" },
    "repeat": { "count": { "$prop": "max" } }
  }
}
```

Consumer-supplied action chain (eager outer, lazy inner):
```json
{ "type": "tab-button",
  "props": {
    "label": "Egresos SAFI",
    "onSelect": [
      { "action": "setState", "params": { "statePath": "/filter/tipoEjecucion", "value": "1" } },
      { "action": "fetch", "params": { "url": { "$template": "..." }, "method": "GET" } }
    ]
  }
}
```

The renderer resolves `$prop` at the binding level at render; inner
`$state` / `$template` / `$item` inside the action chain stay lazy and
evaluate at press time.

## Constraints

- Pass values through explicit prop declarations when nested access is
  needed — don't assume `$prop` reaches outer custom-element props.
- Identity cascade (level 1) reaches inside the box; consumer's
  instance-level `animations`/`hover`/`style` apply to the OUTER primitive
  only — see [[@concept-custom-element-black-box]].

## Related concepts

- [[@expression-prop]] — basic syntax
- [[@concept-custom-elements]]
- [[@concept-custom-element-prop-cascade]] — nesting behavior
- [[@concept-custom-element-action-props]] — action-chain props
- [[@concept-expression-timing]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 1.4`
- `docs/consumer/ai-context-custom-elements.md` — Consumer-Supplied Event Handlers section
