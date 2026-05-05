---
id: primitive-icon
title: `icon` — icon glyph
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#icon, docs/consumer/reference-doc.md#icon-primitive]
---

# `icon`

Renders an icon glyph by name (kebab-case, library-agnostic). Apps connect
a library via `plugins.setIconRenderer(Component)` from `MythikApp.onPlugins`.
The built-in primitive keeps identity wrapping and calls the registered
renderer with `{ name, size, weight, color, style }`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | string | `"circle"` | Icon name (kebab-case: `pencil-simple`, `trash`, `moon`) |
| `size` | number | `24` | Width/height in pixels |
| `weight` | string | `"regular"` | `thin`, `light`, `regular`, `bold`, `fill`, `duotone` |
| `color` | string | — | CSS color value (supports `$token`) |

## Examples

```json
{ "type": "icon", "props": { "name": "pencil-simple", "size": 16, "weight": "bold" } }
```

Conditional theme icon:
```json
{ "type": "icon", "props": {
  "name": { "$cond": { "$state": "/preferences/theme", "eq": "dark" }, "$then": "sun", "$else": "moon" },
  "size": 16, "weight": "bold"
}}
```

Inside a button:
```json
"edit-btn": {
  "type": "button", "props": { "style": { "display": "inline-flex", "alignItems": "center" } },
  "children": ["edit-icon"],
  "on": { "press": { "action": "openModal", "params": { "id": "edit-modal" } } }
},
"edit-icon": { "type": "icon", "props": { "name": "pencil-simple", "size": 16, "weight": "bold", "color": { "$token": "colors.textMuted" } } }
```

## Identity defaults

`identity.icons.weight` is the framework-level default; spec `weight`
overrides. `identity.icons.container` (`'circle'`/`'square'`/`'rounded-square'`) auto-wraps unless `container={false}` in spec.
`containerColor`: `'primary'|'accent'|'muted'|'surface'`.

## Host renderer recipe

```tsx
const PHOSPHOR_ICONS = { calendar: Calendar, trash: Trash } as const;

function PhosphorIcon({ name, size, weight, color, style }) {
  const Icon = PHOSPHOR_ICONS[name as keyof typeof PHOSPHOR_ICONS] ?? Circle;
  return <Icon size={size} weight={weight} color={color} style={style} />;
}

<MythikApp
  appSpec={appSpec}
  specStore={specStore}
  onPlugins={(plugins) => plugins.setIconRenderer(PhosphorIcon)}
/>;
```

Lucide uses the same pattern: map Mythik kebab-case names to imported
Lucide components and render the selected component with `size`, `color`,
and `style`.

## Troubleshooting

If the placeholder circle renders, verify:

- `onPlugins` calls `plugins.setIconRenderer(...)`.
- The consumer is installed from a tarball/package that includes the
  `applyPlugins()` icon renderer fix.
- Published-package validation is not accidentally using source aliases.

## Advanced override

`plugins.overridePrimitive('icon', ...)` is still supported for full
replacement, but it bypasses the built-in identity wrapper. It must return
a Mythik `RenderNode`, not JSX:

```ts
plugins.overridePrimitive('icon', (props, children) => ({
  type: 'icon',
  props: { ...props, _component: CustomIcon },
  children,
}));
```

## Related concepts

- [[@concept-identity-icons]]
- [[@expression-token]] — for color

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § icon`
- `docs/consumer/reference-doc.md § Icon Primitive`
