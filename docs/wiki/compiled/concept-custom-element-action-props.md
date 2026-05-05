---
id: concept-custom-element-action-props
title: Action-chain props (consumer-supplied event handlers)
kind: concept
sources: [docs/consumer/ai-context-custom-elements.md#consumer-supplied-event-handlers-action-chain-props]
---

# Action-chain props (consumer-supplied event handlers)

Authors often want consumers to own the action chain fired on a user
gesture (tabs, menu items, list rows). Declare the prop as `array`, then
reference it in the render tree's `on.<event>` as `{ "$prop": "..." }`.

## Author

```json
{
  "type": "tab-button",
  "props": {
    "label": { "type": "string" },
    "onSelect": { "type": "array" }
  },
  "render": {
    "type": "touchable",
    "props": { "style": { ... } },
    "on": { "press": { "$prop": "onSelect" } },
    "children": [
      { "type": "text", "props": { "content": { "$prop": "label" } } }
    ]
  }
}
```

## Consumer

```json
{ "type": "tab-button",
  "props": {
    "label": "Egresos SAFI",
    "onSelect": [
      { "action": "setState", "params": { "statePath": "/filter/tipoEjecucion", "value": "1" } },
      { "action": "setState", "params": { "statePath": "/pagination/page", "value": 0 } },
      { "action": "fetch", "params": { "url": { "$template": "..." }, "method": "GET", "target": "/response" } }
    ]
  }
}
```

## Resolution timing

The renderer resolves `$prop` at the binding level **at render time**;
inner `$state` / `$template` / `$item` inside the action chain stay
**lazy** — they evaluate at press time with the current state.

This is the correct shape for inputs, switches, tabs, and any element
where the consumer owns "what happens on interaction".

## Implementation

The renderer detects the `$prop` shape at binding level and calls
`resolveDeep` to substitute the consumer's supplied value (typically an
action array). Any other binding shape (plain object, array of actions,
`TransactionBinding`) is passed through verbatim — inner `$state` /
`$template` inside binding params stay lazy so the action dispatcher
resolves them at press time (rule 239).

Eager param resolution only activates inside a `repeat` where `$item`
binding is required for correctness.

## Related concepts

- [[@expression-prop]]
- [[@concept-prop-cascade]]
- [[@concept-element-definition]]
- [[@concept-element-prop-definition]]
- [[@concept-expression-timing]]

## Sources (raw)

- `docs/consumer/ai-context-custom-elements.md § Consumer-Supplied Event Handlers`
- `docs/consumer/reference-doc.md § rule 239`
