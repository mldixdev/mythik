# Mythik — Primitive Props Reference

> Read when generating frontend UI specs. Every primitive with its valid props, events, and gotchas.

All primitives accept `style`, `visible`, and `permission`. Theme colors auto-inherited.

**Tokens are project-defined** — no framework defaults. If no tokens defined, use direct CSS values.

**Layout:** `box`, `text`, `image`, `icon`, `stack`, `grid`, `scroll`, `divider`, `spacer`
**Form:** `input`, `textarea`, `select`, `checkbox`, `toggle`, `slider`
**Interaction:** `button`, `touchable`, `list`
**Overlays:** `modal`, `drawer`, `tabs`, `accordion`, `wizard`, `screen`
**Charts:** `bar-chart`, `line-chart`, `pie-chart`, `area-chart`, `table`, `kanban-board`
**Spatial:** `spatial-map`
**Special:** `file-upload`, `camera`, `signature`, `audio-player`, `skeleton`, `toast-container`

---

## Layout Primitives

### box

Container element. Props: `className`, `surface`.

**`surface` prop** — when set, box consumes identity surface styles (border, shadow, bg, borderRadius):
- `surface="card"` — for stat cards, form cards, content panels
- `surface="modal"` — for overlay panels
- No `surface` prop — plain layout div (default, most boxes)

```json
"stat-card": { "type": "box", "props": { "surface": "card" }, "style": { "padding": 24 }, "children": ["value", "label"] }
```

**IMPORTANT:** Always use `surface="card"` for card-like containers. Without it, the box ignores identity surface treatment.

### text

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | string/expression | — | Text content |
| `variant` | string | — | `heading` (h2), `body` (p), `caption` (span), `label` (label), `mono` (code) |
| `className` | string | — | CSS class |

### image

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | string/expression | — | Image URL |
| `alt` | string | — | Alt text |
| `aspectRatio` | number | — | Width/height ratio |
| `placeholder` | string | — | Placeholder while loading |

### icon

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | string | — | Icon name (kebab-case: `pencil-simple`, `trash`, `moon`) |
| `size` | number | — | Size in pixels |
| `weight` | string | — | `thin`, `light`, `regular`, `bold`, `fill`, `duotone` |
| `color` | string | — | Color value |

Names are kebab-case, library-agnostic.

**Icon renderer contract:** Mythik does not bundle an icon pack. The built-in `icon` primitive renders a placeholder unless the host app registers a renderer with `plugins.setIconRenderer(Component)`. Register it from `MythikApp.onPlugins`; the built-in primitive keeps identity behavior (container, default weight) and calls your renderer with `{ name, size, weight, color, style }`.

```tsx
import { MythikApp } from 'mythik-react';
import { Calendar, Circle, Trash } from '@phosphor-icons/react';

const PHOSPHOR_ICONS = {
  calendar: Calendar,
  trash: Trash,
} as const;

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

Lucide follows the same pattern with a map of kebab-case Mythik names to imported Lucide components:

```tsx
import { Calendar, Circle, Trash } from 'lucide-react';

const LUCIDE_ICONS = {
  calendar: Calendar,
  trash: Trash,
} as const;

function LucideIcon({ name, size, color, style }) {
  const Icon = LUCIDE_ICONS[name as keyof typeof LUCIDE_ICONS] ?? Circle;
  return <Icon size={size} color={color} style={style} />;
}
```

**Troubleshooting:** if you see the placeholder circle, the renderer was not present in resolved tokens when the app applied plugins. Verify `onPlugins` calls `setIconRenderer`, verify the consumer is installed from a tarball/package that includes the `applyPlugins()` icon renderer fix, and avoid using source aliases when validating published-package behavior.

**Advanced override:** `plugins.overridePrimitive('icon', ...)` is still supported, but it replaces the whole primitive and bypasses the built-in identity wrapper. The renderer function must return a Mythik `RenderNode`, not JSX:

```ts
plugins.overridePrimitive('icon', (props, children) => ({
  type: 'icon',
  props: { ...props, _component: CustomIcon },
  children,
}));
```

### stack

| Prop | Type | Default | Description |
|---|---|---|---|
| `direction` | string | `vertical` | `vertical` or `horizontal` |
| `gap` | number | — | Space between children (px) |
| `align` | string | — | Cross-axis: `start`, `center`, `end`, `stretch` |
| `justify` | string | — | Main-axis: `start`, `center`, `end`, `between`, `around` |
| `className` | string | — | CSS class |

### grid

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | number/string/expression | — | CSS grid columns (number or template string) |
| `rows` | string | — | CSS grid rows template |
| `gap` | number | — | Gap between cells (px) |
| `areas` | string | — | CSS grid-template-areas |
| `className` | string | — | CSS class |

### scroll

| Prop | Type | Default | Description |
|---|---|---|---|
| `direction` | string | `vertical` | `vertical` or `horizontal` |
| `maxHeight` | string/number | — | Max height (enables scroll) |
| `className` | string | — | CSS class |

### divider

Props: `direction` (`horizontal`/`vertical`). Renders a visual separator.

### spacer

Props: `size` (px), `direction` (`vertical`/`horizontal`). Renders empty space.

---

## Form Primitives

`input` and `select` labels are associated with their controls and the controls use border-box sizing. In constrained panels or two-column editor rows, still use `gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)"` so cells can shrink without horizontal overflow.

### input

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | expression | — | Bind via `$bindState` |
| `type` | string | `text` | `text`, `password`, `email`, `number`, `date`, `tel`, `url` |
| `placeholder` | string/expression | — | Placeholder text |
| `label` | string/expression | — | Field label |
| `disabled` | boolean/expression | `false` | Disable input |
| `readOnly` | boolean | `false` | Read-only mode |
| `required` | boolean | `false` | Visual required indicator |
| `format` | string | — | `phone`, `currency` — display format |
| `formatOptions` | object | — | `{ currency, locale, decimals }` |
| `selectOnFocus` | boolean | `false` | Select all text on focus |
| `checks` | array | — | Inline validators |
| `validateOn` | string | — | `blur` or `change` |

**Events:** `on.change`, `on.submit` (fires on Enter key — use for login/search)

**Wrong:** `{ "props": { "inputType": "password" } }` — no `inputType` prop
**Right:** `{ "props": { "type": "password" } }`

### textarea

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | expression | — | Bind via `$bindState` |
| `placeholder` | string/expression | — | Placeholder text |
| `label` | string/expression | — | Field label |
| `rows` | number | `3` | Visible rows |
| `disabled` | boolean/expression | `false` | Disable |
| `readOnly` | boolean | `false` | Read-only |

**Events:** `on.change`

### select

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | expression | — | Bind via `$bindState` |
| `options` | array | — | Strings or `[{ label, value }]` objects |
| `placeholder` | string | — | Placeholder text |
| `label` | string/expression | — | Field label |
| `disabled` | boolean/expression | `false` | Disable |
| `required` | boolean | `false` | Visual indicator |

**Events:** `on.change`

Options formats:
```json
"options": ["Low", "Medium", "High"]
"options": [{ "label": "Low", "value": "low" }, { "label": "Medium", "value": "medium" }]
"options": { "$state": "/cat/services/data" }, "labelKey": "name", "valueKey": "id"
```

`labelKey` defaults to `"label"` and `valueKey` defaults to `"value"`. Use them for catalog rows such as `{ "id": 1, "name": "Cambio de aceite" }`. Values are emitted as strings from `on.change`. Malformed object options render as disabled diagnostics instead of blank clickable rows.

### checkbox

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | boolean/expression | — | Bind via `$bindState`. **NOT `value`** |
| `label` | string/expression | — | Label text |
| `disabled` | boolean/expression | `false` | Disable |

**Events:** `on.change`

Custom rendered (div+SVG, not native browser checkbox). Surface-aware — adapts to identity surface treatment (bold=thick border, neo=inset shadow, flat=no border). Unchecked uses `t.surface.input`, checked fills with primary preserving surface border. Focus uses `t.surface.inputFocus` (never includes backgroundColor — prevents overwriting checked primary bg). Uses `color: 'inherit'` from parent surface container. Label respects `labelStyle` identity.

```json
{ "type": "checkbox", "props": { "checked": { "$bindState": "/form/agreed" }, "label": "I agree" } }
```

### toggle

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | boolean/expression | — | Bind via `$bindState`. **NOT `value`** |
| `label` | string/expression | — | Label text |
| `disabled` | boolean/expression | `false` | Disable |

**Events:** `on.change`

```json
{ "type": "toggle", "props": { "checked": { "$bindState": "/preferences/darkMode" }, "label": "Dark Mode" } }
```

### slider

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | expression | — | Bind via `$bindState` |
| `min` | number | `0` | Minimum value |
| `max` | number | `100` | Maximum value |
| `step` | number | `1` | Step increment |
| `label` | string/expression | — | Label text |
| `disabled` | boolean/expression | `false` | Disable |

---

## Interaction Primitives

### button

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | string/expression | — | Button text |
| `variant` | string | — | `primary`, `secondary`, `destructive`, `ghost`, or custom from tokens |
| `disabled` | boolean/expression | `false` | Disable |
| `className` | string | — | CSS class |

Buttons have built-in CSS transitions — only add `hover`/`active` for custom behavior.

### touchable

Invisible tap area. Props: `className`. Wire actions via `on.press`.

### list

Container for list items. Props: none besides common. Use with `repeat`.

---

## Overlay Primitives

### modal

| Prop | Type | Default | Description |
|---|---|---|---|
| `visible` | — | — | Managed by engine — do NOT set |
| `title` | string/expression | — | Modal header |

**Wrong:** Adding `visible` condition on modal element
**Right:** Engine manages via `/ui/modals/{id}`. Use `openModal`/`closeModal` actions.

```json
"my-modal": { "type": "modal", "props": { "title": "Confirm" }, "children": ["content"] }
```

### drawer

| Prop | Type | Default | Description |
|---|---|---|---|
| `visible` | — | — | Managed by engine — do NOT set |
| `side` | string | `right` | `left` or `right` |
| `width` | number | — | Width in pixels |

**Wrong:** Adding `visible` condition on drawer element
**Right:** Engine manages via `/ui/drawers/{id}`. Use `openDrawer`/`closeDrawer` actions.

### tabs

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | expression | — | Active tab key, bind via `$bindState` |
| `items` | array | — | `[{ key, label, icon? }]` tab definitions |

**Events:** `on.change`

```json
{
  "type": "tabs",
  "props": {
    "value": { "$bindState": "/ui/activeTab" },
    "items": [
      { "key": "overview", "label": "Overview", "icon": "chart-bar" },
      { "key": "sales", "label": "Sales" }
    ]
  },
  "children": ["tab-content"]
}
```

Children render below tabs. Use `visible` conditions with `$state` on the active tab key to show/hide tab content panels.

### accordion

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string/expression | — | Accordion header |
| `defaultOpen` | boolean | `false` | Open on mount |
| `badge` | string/number/boolean | — | Indicator next to title. `true` = solid dot, number/string = pill with text. Falsy hides badge |

Children render inside.

**React Native glass support:** When `identity.surface === 'glass'`, RN primitives (accordion, input, modal, select, textarea) wrap content in `<BlurView>` from `expo-blur`. No spec changes needed — the surface treatment handles it automatically.

### wizard

| Prop | Type | Default | Description |
|---|---|---|---|
| `currentStep` | number/expression | — | 0-based step index. Use `$state` (read-only display) |
| `totalSteps` | number | — | Total step count |

Renders progress bar + "Step X of Y". Use `visible` conditions on children to show/hide per step. Navigate with `setState` on the step number.

```json
{
  "type": "wizard",
  "props": { "currentStep": { "$state": "/wizard/step" }, "totalSteps": 3 },
  "children": ["step-content"]
}
```

### screen

Props: `title`. Top-level screen wrapper in AppSpec apps.

---

## Chart Primitives

All charts accept `data` (array) and `height` (pixels, default 200).

### bar-chart

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | array/expression | — | `[{ label, value, color? }]` |
| `height` | number | `200` | Chart height in pixels |

```json
{ "type": "bar-chart", "props": { "data": { "$state": "/chartData" }, "height": 300 } }
```

### line-chart

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | array/expression | — | `[{ label, value }]` |
| `height` | number | `200` | Chart height |
| `color` | string | — | Line color |

### pie-chart

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | array/expression | — | `[{ label, value, color? }]` |
| `size` | number | — | Diameter in pixels |
| `donut` | boolean | `false` | Donut style |

### area-chart

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | array/expression | — | `[{ label, value }]` |
| `height` | number | `200` | Chart height |
| `color` | string | — | Fill color |

---

## Table

```json
{
  "type": "table",
  "props": {
    "data": { "$state": "/items" },
    "columns": [
      { "key": "name", "label": "Name", "width": "2fr" },
      { "key": "amount", "label": "Amount", "align": "right", "format": "currency", "formatOptions": { "currency": "HNL", "locale": "es-HN" } }
    ],
    "sorting": { "enabled": true, "default": { "field": "amount", "direction": "desc" }, "mode": "client" },
    "pagination": { "enabled": true, "pageSize": 20, "mode": "client" },
    "selection": { "enabled": true, "mode": "multiple", "state": "/selectedIds" },
    "groupBy": { "field": "category", "header": true, "footer": "subtotal", "collapsible": true },
    "stickyHeader": true,
    "emptyState": { "icon": "inbox", "message": "No data" },
    "onRowClick": { "action": "openDrawer", "params": { "id": "detail" } }
  }
}
```

**Table props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | array/expression | — | Row data array |
| `columns` | array | — | Column definitions (see below) |
| `sorting` | object | — | `{ enabled, mode, default, state }` |
| `pagination` | object | — | `{ enabled, pageSize, mode, state, totalItems }` |
| `selection` | object | — | `{ enabled, mode, state }` |
| `groupBy` | object | — | `{ field, header, footer, expanded, collapsible }` |
| `stickyHeader` | boolean | `false` | Sticky table header |
| `emptyState` | object | — | `{ icon, message }` when no data |
| `rowStyle` | object/expression | — | Per-row style applied to each row. Row data is available via `/ui/selectedRow` state path after row actions fire (see `ai-context-runtime-semantics.md § 2.1`); for static or dynamic per-row styling, use a style expression that reads framework state paths. |
| `onRowClick` | action / array / function | — | Action(s) on row click — accepts `ActionBinding`, array, or function callback (programmatic) |
| `headerStyle` | object | — | Header row style |
| `cellStyle` | object | — | Default cell style |
| `grandTotal` | boolean | `false` | Show grand total row |

**Column props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `key`/`field` | string | — | Data field name |
| `label` | string | — | Column header |
| `width` | string | — | CSS grid: `fr`/`px`/`%` |
| `align` | string | `left` | `left`, `center`, `right` |
| `format` | string | — | `currency`, `number`, `percent`, `date` |
| `formatOptions` | object | — | `{ currency, locale, decimals }` |
| `sortable` | boolean | `true` | Allow sorting |
| `visible` | boolean | `true` | Show/hide column |
| `actions` | array | — | `[{ icon, color, onPress }]` action buttons |

**Sorting:** `client` sorts internally. `server` writes `{ field, direction }` to `state` path — **`state` is required** when mode is `"server"` (e.g., `"state": "sort"`).

**Pagination:** `client` slices internally. `server` writes page number to `state` path — **`state` is required** when mode is `"server"` (e.g., `"state": "page"`).

**GroupBy:** `footer: "subtotal"` auto-sums numeric columns.

**onRowClick** fires when a row is clicked. Per the row context model in `ai-context-runtime-semantics.md § 2.1`, the framework automatically writes the clicked row to `/ui/selectedRow` before dispatching the action chain (see also § 5.1). Action `params` resolve `$state` / `$template` lazily at click time — read the freshly-written row via `$state: '/ui/selectedRow/<key>'`. Same lazy-resolution contract as `columns[].actions[].onPress` (see § 1.3 table).

```json
"onRowClick": [
  { "action": "openDrawer", "params": { "id": "detail-drawer" } }
]
```

Inside the drawer content, read row fields via `$template`:

```json
{ "type": "text", "props": { "content": { "$template": "Editing: ${ /ui/selectedRow/name }" } } }
```

**Anti-pattern — do NOT use `"$row"` as a literal value.** There is no `$row` expression. A literal string `"$row"` in `setState` params writes the characters `"$row"` to state, not the row object. See `ai-context-runtime-semantics.md § 2.1` for the canonical read patterns.

**Column action buttons** (`columns[].actions[].onPress`) follow the same row-context pattern as `onRowClick`. The framework writes the clicked row to `/ui/selectedRow` before dispatching, so action params resolve `$state` at press time (lazy, not render-time):

```json
"columns": [{
  "id": "actions-col",
  "actions": [{
    "icon": "pencil-simple",
    "onPress": [{
      "action": "openModal",
      "params": {
        "id": "edit-modal",
        "itemId": { "$state": "/ui/selectedRow/id" }
      }
    }]
  }]
}]
```

`$state: "/ui/selectedRow/id"` reads the row just clicked — not a stale value. See `ai-context-runtime-semantics.md § 1.3` for the lazy press-time mechanism.

---

## Spatial

### spatial-map

Generic SVG/data-first primitive for two-dimensional spatial layouts: floor plans, seating maps, parking maps, warehouse locations, hospital beds, office maps, and similar domains. The primitive knows zones, items, geometry, status, selection, and actions. It does not know any domain workflow.

```json
{
  "type": "spatial-map",
  "props": {
    "viewBox": { "x": 0, "y": 0, "width": 1000, "height": 620 },
    "mode": "operate",
    "selectedItemPath": "/ui/selectedSpatialItem",
    "zones": [
      {
        "id": "main-floor",
        "label": "Main floor",
        "shape": { "type": "path", "d": "M86 92 L602 92 L602 178 L790 178 L790 526 L88 526 Z" }
      }
    ],
    "items": [
      {
        "id": "item-1",
        "label": "A1",
        "zoneId": "main-floor",
        "position": { "x": 214, "y": 174 },
        "rotation": -10,
        "shape": { "type": "rect", "width": 116, "height": 76, "radius": 24 },
        "status": "available",
        "metadata": { "capacity": 4 }
      }
    ],
    "statusStyles": {
      "available": { "fill": "#dcfce7", "stroke": "#22c55e", "text": "#14532d" }
    },
    "onItemPress": { "action": "openDrawer", "params": { "id": "item-actions" } }
  }
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `viewBox` | object/string | required | Stable SVG coordinate system |
| `zones` | array/expression | `[]` | Non-domain spatial regions |
| `items` | array/expression | `[]` | Operable spatial objects |
| `layers` | array | default layer order | Optional render order |
| `mode` | string | `operate` | `readonly`, `operate`, or `edit` |
| `statusStyles` | object | safe fallback | Semantic status-to-style map |
| `selectedItemPath` | string | `/ui/selectedSpatialItem` | State path written before item action dispatch |
| `selectedItemId` | string/number/expression | none | Optional external selected item override |
| `selectedZonePath` | string | `/ui/selectedSpatialZone` | State path written before zone action dispatch |
| `selectedZoneId` | string/expression | none | Optional external selected zone override |
| `canvasPressPath` | string | `/ui/spatialCanvasPress` | State path written before JSON `onCanvasPress` dispatch |
| `interactionPolicy` | object | mode-based | Selection, activation, canvas clear, keyboard flags |
| `editPolicy` | object | mode-based | Editor policy for drag, keyboard movement, resize, bounds, coordinate precision, snap, and authoring guide overlays |
| `canvasGuide` | object/expression | none | Optional SVG pointer guide, e.g. dotted crosshair while a consumer-owned placement mode is active |
| `itemChangePath` | string | `/ui/spatialItemChange` | State path written before JSON `onItemChange` dispatch |
| `zoneChangePath` | string | `/ui/spatialZoneChange` | State path written before JSON `onZoneChange` dispatch |
| `ariaLabel` | string | `Spatial map` | Accessible name for the SVG |
| `onItemPress` | action/array/function | none | Lazy item action. JSON actions write selected item context before dispatch; programmatic functions pass through |
| `onItemChange` | action/array/function | none | Lazy edit action. JSON actions write item-change context before dispatch; programmatic functions pass through |
| `onZonePress` | action/array/function | none | Lazy zone action. JSON actions write selected zone context before dispatch; programmatic functions pass through |
| `onZoneChange` | action/array/function | none | Lazy zone edit action. JSON actions write zone-change context before dispatch; programmatic functions pass through |
| `onCanvasPress` | action/array/function | none | Canvas action. Clearing is controlled by `interactionPolicy.clearSelectionOnCanvasPress` |

Supported shapes for zones and items: `rect`, `circle`, `ellipse`, `polygon`, and `path`. Item shapes are positioned by `position`, `rotation`, and optional `transform`; item `rect` uses `width`/`height` centered on the item. Zone shapes use map coordinates; zone `rect` requires `x`, `y`, `width`, and `height`. `polygon.points` may be an SVG points string or an array of `[x, y]` / `{ "x": n, "y": n }` points. Use semantic status keys such as `available`, `occupied`, `blocked`, `inactive`; colors belong in `statusStyles`.

Zones may include `position: { "x": n, "y": n }`, `rotation`, `transform`, and `localBounds`. For runtime zone movement, Mythik writes `position`; for runtime zone resize, Mythik writes `transform.scaleX/scaleY`; in both cases it keeps the base `shape` stable. This is the same generic transform-layer principle used by item resize: do not rewrite polygon points or SVG path data as the primary move/resize model. Rect, circle, ellipse, and polygon zones derive map bounds automatically; arbitrary path zones may provide `localBounds` when bounded editing or resize handles are required.

Items may include `transform: { "scaleX": n, "scaleY": n }` and `localBounds: { "x": n, "y": n, "width": n, "height": n }`. `transform` is the generic resize model: the base `shape` remains clean, while `position`, `rotation`, and `transform` define the visual item. Simple shapes derive edit bounds automatically. `path` items require `localBounds` for resize handles; without it they remain movable/rotatable but are not resized by handles.

`status` is semantic and visual only. Do not use a status value such as `inactive` to lock an item out of selection, activation, or editing. Use `disabled: true` only for items that must be intentionally non-interactive.

Use existing Mythik expressions for dynamic props:

```json
"items": { "$state": "/data/layout/items" },
"zones": { "$state": "/data/layout/zones" },
"statusStyles": { "$state": "/theme/spatial/statusStyles" }
```

Do not use `itemsPath`, `zonesPath`, `modePath`, or `statusStylesPath`; those aliases are not part of the runtime contract.

When an item is pressed, Mythik writes the full context to `/ui/selectedSpatialItem` before dispatching `onItemPress`. Read it in action params via `$state`, for example:

```json
"onItemPress": {
  "action": "openDrawer",
  "params": {
    "id": "item-actions",
    "itemId": { "$state": "/ui/selectedSpatialItem/itemId" }
  }
}
```

When a zone is pressed with `interactionPolicy.selectZones` or `interactionPolicy.activateZones`, Mythik writes the full context to `/ui/selectedSpatialZone` or the configured `selectedZonePath`. Zone context is domain-neutral: `kind: "zone"`, `mode`, `zoneId`, optional `label`, `position`, `rotation`, optional `transform`, `shape`, optional `metadata`, and full `zone`. By default zone press stops canvas dispatch only when zone selection/activation is enabled; set `interactionPolicy.zonePressStopsCanvas` explicitly when a map needs different press propagation.

When the SVG canvas is pressed, Mythik writes canvas context to `/ui/spatialCanvasPress` or the configured `canvasPressPath` before dispatching JSON `onCanvasPress`. The context includes `kind: "canvas"`, `mode`, `point`, `viewBox`, optional `zoneId`, and optional `zone`. With snap enabled, `point` is the effective snapped coordinate and `rawPoint` is the unmodified SVG pointer coordinate. Existing specs that read only `point` continue to work. Use this for click-to-place flows; keep the placement mode and pending item paths consumer-owned.

For edit movement, resize, and rotate, use `editPolicy` rather than `interactionPolicy`. Item drag/resize/rotate previews are local and persistence happens on pointer release through `onItemChange`; zone drag/resize previews are local and persistence happens on pointer release through `onZoneChange`; keyboard edits emit one change per valid command. Runtime item change types are `move`, `resize`, and `rotate`. Runtime zone change types include `move` and `resize`: movement writes `nextZone.position`, resize writes `nextZone.transform.scaleX/scaleY`, and both preserve `nextZone.shape`. Current viewBox bounds clamp item `position` by anchor and clamp zone `position` by transformed derived zone bounds when bounds are available. Item and zone movement use the same snap/guide resolver; zones snap by the center of their transformed derived map bounds, or by `position` for path zones without bounds. Resize snap uses the same world/map-coordinate snap guides as movement, including for item and zone resize handles: the active handle point snaps in map coordinates and is then projected into local resize math. Persist item edits with `$array: "replace"` from `/ui/spatialItemChange/nextItem`; persist zone edits with `$array: "replace"` from `/ui/spatialZoneChange/nextZone`. For undoable editors, wrap that same replacement value in `editorCommit` instead of plain `setState`. In `mode: "edit"`, item click selects/moves but does not dispatch `onItemPress` unless `interactionPolicy.activateItems: true` is set explicitly; zone click behaves the same through `activateZones`.

```json
"mode": "edit",
"items": { "$state": "/data/layout/items" },
"itemChangePath": "/ui/floorEditor/itemChange",
"editPolicy": {
  "dragItems": true,
  "dragZones": true,
  "keyboardMoveItems": true,
  "keyboardMoveZones": true,
  "resizeItems": true,
  "resizeZones": true,
  "rotateItems": true,
  "keyboardResizeItems": true,
  "keyboardResizeZones": true,
  "keyboardRotateItems": true,
  "bounds": "viewBox",
  "boundsMode": "position",
  "coordinatePrecision": 0,
  "resizeStep": 0.05,
  "resizeLargeStep": 0.25,
  "rotationStep": 5,
  "rotationLargeStep": 15,
  "minScale": 0.1,
  "maxScale": 10,
  "snap": { "enabled": true, "grid": { "enabled": true, "size": 20, "threshold": 8 } },
  "guides": { "enabled": true, "showCoordinates": true, "showSnapLines": true }
},
"onItemChange": {
  "action": "setState",
  "params": {
    "statePath": "/data/layout/items",
    "value": {
      "$array": "replace",
      "source": { "$state": "/data/layout/items" },
      "where": {
        "field": "id",
        "eq": { "$state": "/ui/floorEditor/itemChange/itemId" }
      },
      "value": { "$state": "/ui/floorEditor/itemChange/nextItem" }
    }
  }
}
```

Zone movement example:

```json
"mode": "edit",
"zones": { "$state": "/data/layout/zones" },
"selectedZonePath": "/ui/floorEditor/selectedZone",
"zoneChangePath": "/ui/floorEditor/zoneChange",
"interactionPolicy": {
  "selectZones": true,
  "activateZones": true,
  "zonePressStopsCanvas": true
},
"editPolicy": {
  "dragZones": true,
  "keyboardMoveZones": true,
  "resizeZones": true,
  "keyboardResizeZones": true,
  "bounds": "viewBox",
  "coordinatePrecision": 0
},
"onZoneChange": {
  "action": "setState",
  "params": {
    "statePath": "/data/layout/zones",
    "value": {
      "$array": "replace",
      "source": { "$state": "/data/layout/zones" },
      "where": {
        "field": "id",
        "eq": { "$state": "/ui/floorEditor/zoneChange/zoneId" }
      },
      "value": { "$state": "/ui/floorEditor/zoneChange/nextZone" }
    }
  }
}
```

Snap/guides are generic editor aids for spatial authoring. Use `editPolicy.snap` to compute effective coordinates and `editPolicy.guides` to render contextual authoring guides. When snap is enabled, item movement, zone movement, keyboard movement, item resize handles, zone resize handles, and canvas placement all use the same resolver. Grid threshold is per-axis, so X and Y can snap independently. Zone movement snaps a stable authoring anchor: the center of the zone's transformed derived map bounds, or `position` when no bounds exist. Item-center snap wins ties over grid snap on the same axis because it is the more specific alignment target. `canvasPress.point` is the effective placement coordinate; `canvasPress.rawPoint` preserves the original pointer coordinate.

```json
"editPolicy": {
  "dragItems": true,
  "keyboardMoveItems": true,
  "snap": {
    "enabled": true,
    "grid": { "enabled": true, "size": 20, "threshold": 8 },
    "itemCenters": { "enabled": true, "threshold": 8 }
  },
  "guides": {
    "enabled": true,
    "showCoordinates": true,
    "showSnapLines": true
  }
}
```

**Inspector composition pattern:** keep `spatial-map` domain-neutral. Build item inspectors outside the primitive with normal JSON primitives (`box`, `stack`, `input`, `select`, `button`) and a consumer-owned draft state path. In edit mode, set `interactionPolicy.activateItems: true` only when item press should initialize the inspector draft.

Canonical flow:

1. `selectedItemPath` receives the selected item context.
2. `onItemPress` copies `{ "$state": "<selectedItemPath>/item" }` to a consumer-owned draft path.
3. Inputs bind to draft fields with `$bindState`.
4. `Save` normalizes numeric draft fields, writes an `item-change` context with `changeType: "update"`, persists via `$array: "replace"`, and refreshes `selectedItemPath` from the saved draft while the inspector stays open.
5. `Cancel` clears the draft and `selectedItemPath` so the inspector closes without changing persisted items.
6. If drag or keyboard movement can happen while the inspector is open, append `onItemChange` actions that sync the draft `position` when the changed item id matches the draft id and refresh `selectedItemPath` from `nextItem`.

Use a non-modal overlay (`box` with absolute/fixed positioning) for editor inspectors when the map must remain interactive. The current `drawer` primitive is modal and includes a backdrop, so it is not the right default for spatial editing panels.

**Lifecycle composition pattern:** create, duplicate, and delete spatial items with JSON actions outside the primitive. For add/place, set a consumer-owned `placeMode`, drive `canvasGuide.visible` from that state for a generic dotted SVG placement guide, use `onCanvasPress` plus `canvasPressPath` to create a pending item at the SVG point, generate ids/labels with `$uniqueId`, round coordinates with `$math: "round"` when needed, append with `$array: "append"`, then refresh draft and selection paths. For duplicate, copy the selected full item, generate a new id/label, offset position, preserve shape/status/metadata, append, and select the duplicate. For delete, capture a delete candidate, call `openModal`, confirm with `$array: "remove"`, write `changeType: "delete"`, clear draft/selection/delete-candidate state, and call `closeModal`. Do not set `props.visible` on modal/drawer elements; open/close actions drive `/ui/modals/{id}` and `/ui/drawers/{id}` automatically.

In programmatic React usage, function callbacks pass through and Mythik does not write selection or edit-change state automatically. The consumer owns the selected visual state through `selectedItemId` or by writing to `selectedItemPath` directly, and owns edit persistence by handling `onItemChange`.

Compose menus, drawers, modals, and inspectors outside the primitive. The map supplies context; the app owns domain actions.

---

## Special Primitives

### kanban-board

Props: `columns` (column definitions). Board-style layout.

### file-upload

| Prop | Type | Default | Description |
|---|---|---|---|
| `accept` | string | — | MIME types (`image/*`, `.pdf`) |
| `maxSize` | number | — | Max file size in bytes |
| `multiple` | boolean | `false` | Allow multiple files |
| `maxFiles` | number | — | Max file count |
| `preview` | boolean | — | Show file preview |
| `dropZone` | boolean | `false` | Drop zone UI |
| `autoUpload` | boolean | `true` | Upload immediately on select |
| `label` | string | — | Upload button label |
| `disabled` | boolean/expression | `false` | Disable |

**Events:** `on.upload`

Always set `accept` and `maxSize`. Read URLs from `target` path, not `/ui/uploads/*`.

`autoUpload: true` — simple uploads (avatar). `autoUpload: false` — multi-field forms (upload in submit chain).

**Auto upload pattern:**
```json
{
  "type": "file-upload",
  "props": { "accept": "image/*", "maxSize": 5242880, "autoUpload": true },
  "on": { "upload": { "action": "uploadFile", "params": { "bucket": "avatars", "target": "/form/avatarUrl" } } }
}
```

**Manual upload pattern** (autoUpload false): place `uploadFile` before `submitForm` in action chain:
```json
"on": { "press": [
  { "action": "uploadFile", "params": { "bucket": "docs", "target": "/form/attachmentUrl" } },
  { "action": "submitForm", "params": { "formId": "my-form", "url": "...", "method": "POST", "body": { "attachment": { "$state": "/form/attachmentUrl" } } } },
  { "action": "showNotification", "params": { "type": "success", "message": "Sent!" } }
] }
```

### camera

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | string | — | Button label |
| `accept` | string | — | `image/*`, `video/*` |
| `disabled` | boolean/expression | `false` | Disable |

**Events:** `on.capture`

### signature

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | number | — | Canvas width |
| `height` | number | — | Canvas height |
| `lineColor` | string | — | Pen color |
| `lineWidth` | number | — | Pen width |
| `label` | string | — | Label text |

**Events:** `on.sign`

### audio-player

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | string/expression | — | Audio URL |
| `label` | string | — | Player label |

### skeleton

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | string | — | Shape variant |
| `width` | string/number | — | Skeleton width |
| `height` | string/number | — | Skeleton height |
| `count` | number | — | Number of skeleton items |
| `gap` | number | — | Gap between items |

Auto-skeleton is zero config — set `skeleton: false` on static elements to opt out.

### toast-container

| Prop | Type | Default | Description |
|---|---|---|---|
| `store` | string | — | State path for toast data |
| `position` | string | — | Screen position |
| `duration` | number | — | Auto-dismiss ms (`null` = persistent) |
| `maxVisible` | number | — | Max visible toasts |
| `offset` | number | — | Edge offset |
| `gap` | number | — | Gap between toasts |

`showNotification` renders automatically — no element needed unless custom positioning. Types: `success`, `error`, `warning`, `info`. Optional: `title`, `duration`.

### screen-outlet

Props: none besides `style`. Renders nested screen content in AppSpec apps.

---

## Device Context (auto-tracked)

| State Path | Value |
|---|---|
| `/ui/device/viewportWidth` | Viewport width px |
| `/ui/device/viewportHeight` | Viewport height px |
| `/ui/device/platform` | `"web"`, `"ios"`, `"android"` |
| `/ui/device/orientation` | `"portrait"`, `"landscape"` |
| `/ui/device/colorScheme` | `"light"`, `"dark"` |

All auto-updated. Use `$breakpoint` for responsive layout, `$platform` for cross-platform branching.
