# Mythik — Custom Element Authoring (Layer 3)

> Read when authoring or consuming custom elements registered via `plugins.registerElement`.
> For built-in primitive props, see [ai-context-primitives.md](ai-context-primitives.md).
> For the animation cascade (5 levels), see the "Interactive States & Animations" section of [ai-context.md](ai-context.md).

## What is a Custom Element?

Custom elements are reusable components that authors register via `plugins.registerElement`. They participate in the full render contract as first-class primitives — consumers use them with identical syntax to built-ins (`type`, `props`, `animations`, `hover`, `visible`, `key`, etc.). The registration consists of an `ElementDefinition`.

## ElementDefinition Shape

```json
{
  "type": "rating-stars",
  "props": {
    "max": { "type": "number", "default": 5 },
    "value": { "type": "number", "bindable": true },
    "label": { "type": "string", "default": "" }
  },
  "variants": {
    "compact": {
      "props": { "max": 3 },
      "style": { "gap": 2 }
    },
    "large": {
      "style": { "gap": 8 },
      "animations": { "mount": { "recipe": "scale-in" } }
    }
  },
  "render": {
    "type": "stack",
    "props": { "direction": "horizontal", "gap": { "$prop": "gap" } },
    "children": [
      {
        "type": "icon",
        "props": { "name": "star" },
        "repeat": { "count": { "$prop": "max" } },
        "animations": { "hover": { "recipe": "lift" } }
      },
      { "type": "text", "props": { "content": { "$prop": "label" } } }
    ]
  }
}
```

### ElementDefinition fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | Public type name consumers use in specs |
| `props` | Record\<name, PropDefinition\> | no | Declares accepted props with type/default/bindable flags |
| `variants` | Record\<name, ElementVariantSpec\> | no | Author-shipped variants (see below) |
| `render` | ElementRenderNode | yes | The render tree built from primitives (and nested custom elements + templates) |

### PropDefinition fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"string"` \| `"number"` \| `"boolean"` \| `"enum"` \| `"object"` \| `"array"` | Prop value type. Use `"object"` for expression values (`$format`, `$template`, `$let`, etc.) and `"array"` for action chains |
| `default` | any | Default value when consumer omits the prop |
| `bindable` | boolean | If `true`, consumer can pass `$bindState` for two-way binding |

## ElementRenderNode

`ElementRenderNode` is the render tree root and all its descendants. It supports the **full primitive declarative surface**:

| Field | Same as Element? | Notes |
|-------|-----------------|-------|
| `type` | yes | Primitive type or nested custom element |
| `props` | yes | Accepts `$prop`, `$state`, `$item`, all expressions |
| `style` | yes | Accepts expressions including `$prop` |
| `children` | yes | `Array<ElementRenderNode \| "$children">` — `"$children"` is the slot marker |
| `repeat` | yes | `{ count, statePath, source, key }` |
| `on` | yes | Event handlers |
| `visible` | yes | Show/hide condition |
| `hover` | yes | Style overrides on pointer enter |
| `active` | yes | Style overrides on press |
| `focus` | yes | Style overrides on keyboard focus |
| `transition` | yes | `{ duration, ease }` |
| `motion` | yes | Framer-Motion-style (legacy) |
| `animations` | yes | Animation engine config — this is the `elementDef` cascade level |
| `key` | yes | Forces remount on change |

**`$prop` inside render trees** — `{ "$prop": "max" }` reads from the nearest enclosing custom element's merged props. Nested custom elements push a new prop context — outer props are shadowed, not inherited. Pass values through explicit prop declarations when needed.

**`"$children"` slot** — write the string literal `"$children"` as an item in `children` to mark where consumer-supplied children are inserted. Multiple markers each splice the full consumer children list. Authors can position the slot anywhere in the render tree.

## ElementVariantSpec

Variants the author ships with the element. Shape is identical to primitive variant specs:

| Field | Type | Description |
|-------|------|-------------|
| `props` | object | Prop overrides that merge with consumer props (consumer wins last) |
| `style` | object | Style overrides applied to the outer primitive |
| `hover` | object | Hover overrides |
| `active` | object | Active overrides |
| `focus` | object | Focus overrides |
| `transition` | object | Transition overrides |
| `animations` | object | Animation overrides (cascade level 2 — variant) |

**Resolution order** — consumer's `{ "props": { "variant": "name" } }`:
1. `ElementDefinition.variants[name]` — author's built-in (checked first)
2. `tokens.components[type].variants[name]` — theme-level fallback

Variant props merge into consumer props before expansion; consumer-supplied props win over variant props, which win over definition defaults.

**Variant placement** — `variant` is a prop. Consumer writes `{ "type": "stat-card", "props": { "variant": "primary", ... } }`. A top-level `variant` field on the element object is silently ignored by the renderer. Consumer may drive it dynamically:

```json
{ "type": "tab-button",
  "props": {
    "variant": {
      "$switch": { "$state": "/filter/recordType" },
      "cases": { "1": "active" },
      "default": "inactive"
    },
    "label": "Egresos SAFI"
  }
}
```

## Consumer-Supplied Event Handlers (action-chain props)

Authors often want consumers to own the action chain fired on a user gesture (tabs, menu items, list rows). Declare the prop as an array, then reference it in the render tree's `on.<event>`:

```json
{
  "type": "tab-button",
  "props": {
    "label": { "type": "string" },
    "onSelect": { "type": "array" }
  },
  "variants": { ... },
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

Consumer supplies the full action array:

```json
{ "type": "tab-button",
  "props": {
    "label": "Egresos SAFI",
    "onSelect": [
      { "action": "setState", "params": { "statePath": "/filter/recordType", "value": "1" } },
      { "action": "setState", "params": { "statePath": "/pagination/page", "value": 0 } },
      { "action": "fetch", "params": { "url": { "$template": "..." }, "method": "GET", "target": "/response" } }
    ]
  }
}
```

The renderer resolves `$prop` at the binding level at render time; inner `$state` / `$template` / `$item` inside the action chain stay lazy — they evaluate at press time with the current state. This is the correct shape for inputs, switches, tabs, and any element where the consumer owns "what happens on interaction".

## Black-Box Contract

Custom elements enforce a strict boundary between consumer and author:

- **Consumer's scope** — instance-level `animations`, `hover`, `active`, `focus`, `motion`, `style`, `visible`, and `key` apply to the **outer primitive** of the render tree only.
- **Author's scope** — all inner primitives. Consumer cannot reach or override them directly.
- **Identity cascade reaches inside** — `tokens.identity.animations` (cascade level 1) propagates to inner primitives. The consumer cannot block this via instance-level declarations.
- **No future leakage** — a future `::part()`-style API would layer on top without breaking this contract.

## Animation Cascade Inside Custom Elements

Inner primitives participate in the full 5-level cascade:

```
identity → variant → elementDef → template → element
```

For inner primitives:
- **identity** (level 1): `tokens.identity.animations` applies globally — reaches inside the box.
- **variant** (level 2): the inner primitive's own variant if it has one.
- **elementDef** (level 3): the author's `animations` declaration on that inner node — only present inside custom element expansions.
- **template** (level 4): if the inner node uses a template.
- **element** (level 5): NOT the consumer's declaration — that stays on the outer. Inner nodes have no level-5 override unless the author wires one via `$prop`.

## Complete Example

Author registers `rating-stars`:

```json
{
  "type": "rating-stars",
  "props": {
    "max": { "type": "number", "default": 5 },
    "value": { "type": "number", "bindable": true }
  },
  "variants": {
    "compact": { "props": { "max": 3 }, "style": { "gap": 2 } }
  },
  "render": {
    "type": "stack",
    "props": { "direction": "horizontal", "gap": 4 },
    "children": [
      {
        "type": "icon",
        "props": { "name": "star" },
        "repeat": { "count": { "$prop": "max" } },
        "animations": { "hover": { "recipe": "lift" } }
      },
      "$children"
    ]
  }
}
```

Consumer uses it in a spec:

```json
{
  "tokens": { "identity": { "animations": { "mount": { "recipe": "fade-up" } } } },
  "root": "r",
  "elements": {
    "r": {
      "type": "rating-stars",
      "props": { "max": 5, "value": { "$bindState": "/form/rating" } },
      "variant": "compact",
      "animations": { "mount": { "recipe": "scale-in" } },
      "children": ["label"]
    },
    "label": { "type": "text", "props": { "content": "Rate this" } }
  }
}
```

Result:
- Outer `stack` (render root): `mount: scale-in` (consumer wins over identity's `fade-up`).
- Inner `icon` nodes: `mount: fade-up` (identity cascade reaches inside; consumer cannot override), `hover: lift` (author's elementDef).
- `"$children"` slot: consumer's `label` element is inserted after the icons.
- `variant: "compact"` applies `{ max: 3, style: { gap: 2 } }` from `ElementDefinition.variants.compact`.

## Rules Summary

See rules 63–66 in [ai-context.md](ai-context.md) for the concise rule list. Key traps:

- Do NOT try to pass `animations`/`hover`/`style` targeting inner primitives from the consumer — use `variant` or ask the author to expose props.
- Do NOT assume `$prop` inside a nested custom element references the outer element's props — it resolves against the nearest enclosing element.
- `"$children"` is a string literal item in `children`, not an expression object — `{ "$children": true }` is wrong; `"$children"` is correct.
