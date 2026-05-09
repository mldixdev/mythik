# Mythik — Reference Document

> The AI reads this to produce correct JSON specs.
> Every element type, expression, action, and pattern available is documented here with examples.

---

## How to Use This Document

When asked to create or modify UI, produce a JSON **Spec** following the structure and rules below.

## CLI — Spec Modification via Mythik CLI

Use the `mythik` CLI to read and modify specs stored in Supabase (or other stores).

For AI agents, locate the bundled Mythik documentation before generating or changing specs:

```bash
mythik docs path
mythik docs copy ./mythik-docs
```

The `mythik` npm package ships `docs/llms.txt`, canonical `docs/consumer/*`, and the compiled `docs/wiki/compiled/*` wiki so the framework contract is available after install.

### Commands

```bash
# Initialize configuration
mythik init --store supabase --url <url> --key $MYTHIK_API_KEY

# See the structural tree of a screen (colorized output)
mythik manifest <screen>

# Get specific element details
mythik elements <screen> <id1,id2,...>

# Apply RFC 6902 patches
mythik patch <screen> --from-file patch.json

# Export a full screen spec for backup/review
mythik pull <screen>

# Create or intentionally replace a full screen spec from stdin
mythik push <screen>

# Validate a screen spec
mythik validate <screen>

# Delete a screen (preview without --confirm)
mythik delete <screen> --confirm
```

All commands accept `--json` for machine-parseable output and `--store`, `--url`, `--key` flags (or read from `.mythikrc`).

### Configuration — Never pass keys inline

**Always** use `.mythikrc` + environment variables. Never pass API keys as CLI flags — they appear in terminal history, chat logs, and process lists.

```json
// .mythikrc
{
  "store": "supabase",
  "supabase": {
    "url": "https://xxx.supabase.co",
    "apiKey": "$MYTHIK_API_KEY"
  }
}
```

Set the env var once per session: `export MYTHIK_API_KEY="your-key"`. The CLI resolves `$MYTHIK_API_KEY` at runtime. Add `.mythikrc` to `.gitignore`.

### Patch Input: File vs Stdin

**Preferred shell-safe path** - write patch JSON to a file:
```bash
mythik patch task-manager --from-file patch.json
```

`--from-file <path>` wins over ambient non-TTY stdin. Use `--from-file -` or pipe without `--from-file` when stdin is intentional:
```bash
cat patch.json | mythik patch task-manager
mythik patch task-manager --from-file -
```

Inline JSON still works for tiny patches, but `--from-file` is preferred for anything containing `$state`, `$template`, `$auth`, or shell-sensitive quoting.

**Array insertion:** `"op": "add"` with a numeric index (e.g., `"/elements/form/children/2"`) **inserts before** that index — it does NOT replace. Use `/-` to append at the end. Use `"op": "replace"` if you want to overwrite.

### TOON Format (Token-Efficient Output)

Use `--toon` for token-efficient output on `elements` and `patch` commands:

```bash
mythik elements task-manager btn,nav --toon
mythik patch task-manager --from-file patch.toon --toon
```

TOON reduces output by ~40% vs JSON. Lossless roundtrip. Based on `@toon-format/toon` v2.

**Patch input autodetects format** — JSON (starts with `[` or `{`) or TOON (everything else). You can send patches in either format:

```bash
# JSON input (as before)
mythik patch task-manager --from-file patch.json

# TOON input (autodetected)
mythik patch task-manager --from-file patch.toon
```

### Workflow: Manifest → Elements → Patch

1. **`mythik manifest <screen>`** — see the structure, decide what to modify
2. **`mythik elements <screen> <ids>`** — inspect specific elements you need to change
3. **`mythik patch <screen> --from-file patch.json`** - apply surgical changes
4. **`mythik manifest <screen>`** — verify the result

This is the required default loop for AI agents editing an existing spec. Do not begin a small change by pulling the full spec and rewriting it. `manifest` gives the structural map, `elements` gives the exact JSON for the target nodes, and `patch --from-file` keeps the write validated, versionable, and reviewable. Use `pull` for backup/migration/review and `push` for new specs or deliberate full replacement only.

### Full Spec Lifecycle

```bash
Create:    mythik push <id> < spec.json
Read:      mythik manifest <id> / mythik elements <id> ids / mythik pull <id>
Modify:    mythik patch <id> --from-file patch.json
Validate:  mythik validate <id>
Delete:    mythik delete <id> --confirm
Backup:    mythik pull <id> > backup.json
Restore:   mythik push <id> < backup.json
Migrate:   mythik pull <id> --store A | mythik push <id> --store B
Tokens:    mythik tokens --dna '{"primary":"#0D9488"}' --json
```

### Push — Create New Screens

Write a JSON spec and push via stdin. No seed scripts, no `.ts` files:

```bash
# From a file
mythik push login < login-spec.json

# Inline with heredoc
mythik push login <<'EOF'
{ "root": "page", "elements": { "page": { "type": "box", "children": ["title"] }, "title": { "type": "text", "props": { "content": "Login" } } } }
EOF
```

**New screens** save even with validation errors (fix with `mythik patch`). **Existing screens** reject invalid specs unless `--force` is used. Validation errors include **suggested fix patches** for auto-fixable issues (typos, orphan children).

### Delete — With Safety Gate

```bash
# Preview (no deletion)
mythik delete task-manager
# → Screen "task-manager" (107 elements). Use --confirm to delete.

# Delete + backup in one command
mythik delete task-manager --confirm > backup.json
```

### AppSpec — App-Level Configuration

The same CLI commands work on AppSpec documents (`type: "app"`). Detection is automatic.

```bash
# View app structure
mythik manifest app-demo

# Inspect specific sections (dot-notation)
mythik elements app-demo tokens.colors
mythik elements app-demo screens.task-manager
mythik elements app-demo navigation.auth

# Inspect layout elements (simple ID)
mythik elements app-demo sidebar,nav-item

# Mix both
mythik elements app-demo sidebar,tokens.colors,screens.task-manager

# Patch tokens
mythik patch app-demo '[{"op":"replace","path":"/tokens/colors/primary","value":"#2563EB"}]'

# Patch layout elements
mythik patch app-demo '[{"op":"replace","path":"/layout/elements/sidebar/props/style/width","value":280}]'

# Add a new screen
mythik patch app-demo '[{"op":"add","path":"/screens/reports","value":{"label":"Reports","icon":"chart-bar"}}]'

# Validate
mythik validate app-demo
```

**Key differences from screen specs:**
- Elements live under `/layout/elements/` (not `/elements/`)
- Dot-notation in `elements` command for inspecting tokens, screens, navigation, translations, sharedState
- Patch paths use full JSON Pointer: `/tokens/...`, `/screens/...`, `/layout/elements/...`
- Validation includes cross-reference checks (screen existence, roleAccess consistency)
- Translation key mismatches are warnings, not errors

---

## Spec Structure (Flat Tree)

Every screen is a JSON Spec with a `root` ID, a flat `elements` map, and optional `initialActions`:

```json
{
  "root": "main-layout",
  "initialActions": [
    { "action": "fetch", "params": { "url": "https://api.example.com/data", "target": "/items" } }
  ],
  "elements": {
    "main-layout": {
      "type": "stack",
      "props": { "direction": "vertical" },
      "children": ["header", "content"]
    },
    "header": {
      "type": "text",
      "props": { "content": { "$template": "${/patient/name}" }, "variant": "heading" }
    },
    "content": {
      "type": "box",
      "props": { "style": { "padding": { "$token": "spacing.unit", "multiply": 3 } } },
      "children": ["field1", "field2"]
    }
  }
}
```

### Top-Level Spec Properties

| Property | Type | Purpose |
|----------|------|---------|
| `root` | string | ID of the root element |
| `elements` | object | Flat map of element ID → element definition |
| `initialActions` | ActionBinding[] | Actions to execute when the spec mounts (e.g., fetch data) |

### Element Properties

| Property | Type | Purpose |
|----------|------|---------|
| `type` | string | Primitive or custom element name |
| `props` | object | Component props (can contain expressions) |
| `children` | string[] | IDs of child elements |
| `style` | object | CSS styles (can contain expressions) |
| `visible` | boolean or condition | Show/hide condition |
| `permission` | object | Role-based access: `{ visible, editable, readonly }` |
| `repeat` | object | Iterate over array: `{ statePath, key }` or `{ source: expression, key }` |
| `on` | object | Event handlers: `{ press: action, change: action }` |
| `hover` | object | Style overrides when pointer enters (rendered via Motion) |
| `active` | object | Style overrides when element is pressed (rendered via Motion) |
| `focus` | object | Style overrides when element has keyboard focus (rendered via Motion) |
| `transition` | object | Animation config: `{ duration, ease, delay, type, stiffness, damping }` |
| `motion` | object | Mount/exit animations: `{ initial, animate, exit, transition }` |
| `key` | expression | Dynamic React key — forces remount when value changes. Supports `$template`, `$state`. Use to re-trigger mount animations on state change |
| `skeleton` | `false` | Opt out of auto-skeleton for this element |

---

## Expression Types

Expressions are special JSON objects that resolve to dynamic values at runtime.

### `$state` — Read from state
```json
{ "$state": "/user/name" }
```
Reads the value at the given JSON Pointer path from application state.

### `$bindState` — Two-way binding
```json
{ "$bindState": "/form/email" }
```
Reads AND writes. When the user changes the input, the state updates automatically.

### `$token` — Design system token
```json
{ "$token": "colors.primary" }
{ "$token": "spacing.unit", "multiply": 3 }
```
Resolves a value from the design system. Use dot notation. `multiply` scales numeric tokens.

**Dynamic theme:** `$token` automatically reads `/preferences/theme` from state. When the theme is "dark" and dark mode tokens are configured, `$token` resolves with the dark mode overrides. No manual switching needed — use `toggleTheme` action and tokens resolve correctly.

### `$cond` / `$then` / `$else` — Conditional value
```json
{
  "$cond": { "$state": "/form/isValid" },
  "$then": { "$token": "colors.success" },
  "$else": { "$token": "colors.muted" }
}
```
Evaluates a condition. Supports operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `not`.

Nested conditionals for multi-branch logic:
```json
{
  "$cond": { "$item": "priority", "eq": "urgent" },
  "$then": "#EF4444",
  "$else": {
    "$cond": { "$item": "priority", "eq": "high" },
    "$then": "#F97316",
    "$else": "#22C55E"
  }
}
```

### `$template` — String interpolation
```json
{ "$template": "Hello, ${/user/name}! You have ${/inbox/count} messages." }
```
Interpolates values into a string. Supports two reference types:
- State paths: `${/user/name}` — reads from application state
- `$let` bindings: `${age}` or `${user.name}` — reads from a named binding defined with `$let`

### `$computed` — Registered function
```json
{ "$computed": "calculateBMI", "args": { "weight": { "$state": "/patient/weight" }, "height": { "$state": "/patient/height" } } }
```
Calls a registered function with resolved arguments. **Prefer `$math`, `$array`, `$date`, `$format` over `$computed`** — built-in operations cover 90%+ of cases without code.

### `$let` / `$ref` — Named bindings
```json
{
  "$let": { "bmi": { "$computed": "calculateBMI", "args": { ... } } },
  "$in": { "$ref": "bmi" }
}
```
Define a named value once, reference it multiple times. Avoids repetition.

`$ref` can read nested values from an object binding with dot notation:
```json
{
  "$let": { "user": { "$state": "/auth/user" } },
  "$in": { "$ref": "user.name" }
}
```
The same dotted binding lookup is available inside `$template` placeholders, for example `${user.name}`.

**Later bindings can reference earlier ones:**
```json
{
  "$let": {
    "total": { "$array": "count", "source": { "$state": "/items" } },
    "label": { "$template": "${total} items" }
  },
  "$in": { "$ref": "label" }
}
```

**IMPORTANT — JSONB array format:** When the spec is stored in a database (JSONB), key ordering is not preserved. If bindings reference each other via `$ref`, use array format to guarantee order:
```json
{
  "$let": [
    ["filtered", { "$array": "filter", "source": { "$state": "/items" }, "where": { "field": "status", "eq": "active" } }],
    ["count", { "$array": "count", "source": { "$ref": "filtered" } }]
  ],
  "$in": { "$template": "${count} active items" }
}
```
Object format is fine when bindings don't reference each other.

### `$i18n` — Translation
```json
{ "$i18n": "patient.name" }
{ "$i18n": "welcome", "args": { "name": { "$state": "/user/name" } } }
```
Resolves a translation key for the active locale.

### `$breakpoint` — Responsive value
```json
{ "$breakpoint": { "sm": 1, "md": 2, "lg": 3 } }
```
Resolves to different values based on viewport width. **Auto-tracked** — the renderer writes `/ui/device/viewportWidth` on mount and on resize. No manual setup needed.

Default breakpoints: `sm: 0`, `md: 768`, `lg: 1024`, `xl: 1280`. Override via design tokens.

### `$platform` — Cross-platform value
```json
{ "$platform": { "web": "blur(24px)", "native": null } }
```
Resolves to different values based on the current platform (`web`, `ios`, `android`). Reads `/ui/device/platform` from state — set automatically by `useDeviceContext` on both web and React Native.

**`native` alias** matches any non-web platform (ios, android). Specific platform keys take priority over `native`:
```json
{ "$platform": { "web": "layout-web", "native": "layout-native" } }
{ "$platform": { "web": "hover-card", "ios": "ios-card", "android": "android-card" } }
```

**Use with `$breakpoint`** — `$breakpoint` handles responsive layout (viewport width), `$platform` handles platform-specific techniques (CSS vs native components). They are complementary, not alternatives.

### `$item` / `$index` — Repeat context (read-only)
```json
{ "$item": "title" }
{ "$item": "" }
{ "$index": true }
```
Inside a `repeat` block: `$item` reads a field from the current item, `$index` returns the position. Can be used in `visible`, `style`, `props`, and `on` (event params are pre-resolved with item context).

### `$bindItem` — Repeat context (two-way)
```json
{ "$bindItem": "completed" }
```
Two-way binding to a field in the current repeat item.

### `$prop` — Element prop reference (Layer 3)
```json
{ "$prop": "label" }
```
References a prop passed to a custom element definition. Used inside element render trees.

### `$math` — Arithmetic operations
```json
{ "$math": "add", "args": [{ "$state": "/a" }, { "$state": "/b" }] }
{ "$math": "multiply", "args": [{ "$state": "/price" }, { "$state": "/qty" }] }
{ "$math": "round", "value": 3.14159, "decimals": 2 }
```
Operations: `add`, `subtract`, `multiply`, `divide`, `round`, `floor`, `ceil`, `abs`, `min`, `max`, `mod`

**Undefined args → 0:** If a `$math` argument resolves to `undefined` or `NaN` (e.g., reading a state path that doesn't exist yet), it is treated as `0`. This prevents NaN from propagating through the UI. For calculations that depend on data being loaded (e.g., `multiply(price, quantity)`), ensure the data exists before rendering — use `visible` conditions or `initialActions` to load data first. The spec author is responsible for data availability; `$math` is responsible for never producing NaN.

### `$array` — Array operations
```json
{ "$array": "count", "source": { "$state": "/products" } }
{ "$array": "count", "source": { "$state": "/products" }, "where": { "field": "stock", "lt": 10 } }
{ "$array": "sum", "source": { "$state": "/products" }, "field": "price" }
{ "$array": "sumProduct", "source": { "$state": "/products" }, "field1": "price", "field2": "stock" }
{ "$array": "filter", "source": { "$state": "/items" }, "where": { "field": "status", "eq": "active" } }
{ "$array": "remove", "source": { "$state": "/items" }, "where": { "field": "id", "eq": 3 } }
{ "$array": "append", "source": { "$state": "/items" }, "value": { "name": "New Item" } }
{ "$array": "replace", "source": { "$state": "/items" }, "where": { "field": "id", "eq": 1 }, "value": { "name": "Updated" } }
{ "$array": "toggle", "source": { "$state": "/selectedIds" }, "value": 5 }
{ "$array": "search", "source": { "$state": "/products" }, "query": { "$state": "/search" }, "fields": ["name", "category"] }
{ "$array": "slice", "source": { "$state": "/items" }, "from": 0, "to": 10 }
{ "$array": "sort", "source": { "$state": "/items" }, "field": "name", "direction": "asc" }
{ "$array": "find", "source": { "$state": "/items" }, "where": { "field": "id", "eq": 1 } }
{ "$array": "includes", "source": { "$state": "/tags" }, "value": "urgent" }
{ "$array": "map", "source": { "$state": "/items" }, "field": "name" }
{ "$array": "first", "source": { "$state": "/items" } }
{ "$array": "last", "source": { "$state": "/items" } }
```
Where operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`

### `$date` — Date operations
```json
{ "$date": "now" }
{ "$date": "today" }
{ "$date": "age", "from": { "$state": "/birthDate" } }
{ "$date": "diff", "from": { "$state": "/start" }, "to": { "$state": "/end" }, "unit": "days" }
{ "$date": "format", "value": { "$state": "/date" }, "pattern": "short" }
{ "$date": "add", "value": { "$state": "/date" }, "amount": 7, "unit": "days" }
```
Units: `days`, `months`, `years`, `hours`, `minutes`. Patterns: `short`, `long`, `numeric`, `time`, `datetime`

### `$format` — Value formatting
```json
{ "$format": "currency", "value": { "$state": "/price" }, "currency": "USD" }
{ "$format": "currency", "value": 1234, "currency": "HNL", "locale": "es-HN" }
{ "$format": "number", "value": 1234.5, "decimals": 2 }
{ "$format": "number", "value": 1234567, "notation": "compact" }
{ "$format": "number", "value": -500, "signDisplay": "always", "decimals": 2 }
{ "$format": "percent", "value": 0.75 }
{ "$format": "phone", "value": { "$state": "/phone" } }
{ "$format": "uppercase", "value": { "$state": "/name" } }
{ "$format": "lowercase", "value": "HELLO" }
{ "$format": "capitalize", "value": "hello world" }
{ "$format": "truncate", "value": "long text...", "length": 20 }
```

**Extended options for `currency` and `number`:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `locale` | string or Expression | context locale | Override locale per-field (e.g., `"es-HN"`) |
| `notation` | `"standard"` \| `"compact"` \| `"scientific"` \| `"engineering"` | `"standard"` | Number notation style |
| `signDisplay` | `"auto"` \| `"always"` \| `"exceptZero"` \| `"negative"` | `"auto"` | Sign display mode |
| `useGrouping` | boolean | `true` | Thousands separator on/off |

All parameters are optional — existing specs work unchanged.

### `$and` / `$or` / `$not` — Boolean logic
```json
{ "$and": [{ "$state": "/form/name" }, { "$state": "/form/price" }] }
{ "$or": [{ "$state": "/user/isAdmin" }, { "$state": "/user/isModerator" }] }
{ "$not": { "$state": "/form/isValid" } }
```
Works everywhere — `visible`, `disabled`, `style`, any prop. Returns true/false.

### `$switch` — Multi-branch conditional
```json
{
  "$switch": { "$state": "/filter/type" },
  "cases": {
    "1": "Current Expenses",
    "2": "Capital Expenses",
    "3": { "$token": "colors.warning" },
    "4": { "$template": "Type ${/count}" }
  },
  "default": "Other"
}
```
Evaluates `$switch` value, converts to string, looks up in `cases`. Only the matching case is resolved (lazy). `default` is required — prevents silent `undefined`.

Replaces deeply nested `$cond` for 3+ branches. Cases can contain any expression.

### `$group` — Group context (inside repeat.groupBy)
```json
{ "$group": "key" }
{ "$group": "count" }
{ "$group": "index" }
{ "$group": "items" }
{ "$group": "sum", "field": "amount" }
{ "$group": "avg", "field": "price" }
{ "$group": "min", "field": "score" }
{ "$group": "max", "field": "score" }
{ "$group": "subtotal.total" }
```

| Operation | Description | Available in |
|-----------|-------------|-------------|
| `key` | Group key value (e.g., "Institution A") | groupHeader, groupFooter |
| `count` | Number of items in this group | groupHeader, groupFooter |
| `index` | Group index (0-based) | groupHeader, groupFooter |
| `items` | Array of items in this group | groupHeader, groupFooter |
| `sum` | Sum of `field` across group items | groupHeader, groupFooter |
| `avg` | Average of `field` | groupHeader, groupFooter |
| `min` | Minimum of `field` | groupHeader, groupFooter |
| `max` | Maximum of `field` | groupHeader, groupFooter |
| `dot.path` | Dot-notation access to raw group object (pre-grouped mode) | groupHeader, groupFooter |

**Only valid inside `repeat` with `groupBy` or `groupKey`.** Throws error if used outside.

### `$selection` — Selection state (inside repeat.selection)
```json
{ "$selection": "selected" }
{ "$selection": "count" }
```
| Operation | Returns | Description |
|-----------|---------|-------------|
| `selected` | boolean | Whether the current item's key is in the selection array |
| `count` | number | Total number of selected items |

**Only valid inside `repeat` with `selection` config.** Throws error if used outside.

### `$auth` — Authenticated user data
```json
{ "$auth": "email" }
{ "$auth": "role" }
{ "$auth": "isAuthenticated" }
{ "$auth": "metadata.department" }
```
Reads from the authenticated user's data. **Security whitelist** — only safe fields resolve. Sensitive fields (token, password, secret, session, and variants) always return `undefined`. See blocked fields list below.

| Field | Returns |
|-------|---------|
| `isAuthenticated` | boolean — false when no auth state |
| `id`, `email`, `name`, `avatar` | User profile fields |
| `role` | Primary role (string) |
| `roles` | All roles (string[]) |
| `metadata` | Full metadata object |
| `metadata.*` | Nested metadata field (dot notation) |
| `user` | Full user object |
| `loading` | Auth operation in progress |
| `error` | Last auth error message or null |

**Blocked fields:** `token`, `accessToken`, `access_token`, `refreshToken`, `refresh_token`, `password`, `secret`, `session`, `metadata.token`, `metadata.password` — always return `undefined`.

**Prefer `$auth` over `$state` for auth data** — `$auth` has security whitelist, clear semantics, and stable paths.

---

## Available Primitives

These are the built-in visual building blocks. Use them as the `type` field in elements.

**Layout:** `box`, `text`, `image`, `icon`, `stack`, `grid`, `scroll`, `divider`, `spacer`
**Form:** `input`, `textarea`, `select`, `checkbox`, `toggle`, `slider`
**Interaction:** `button`, `touchable`, `list`
**Overlays:** `modal`, `drawer`, `tabs`, `accordion`, `wizard`, `screen`
**Data visualization:** `bar-chart`, `line-chart`, `pie-chart`, `area-chart`, `table`, `kanban-board`
**Special:** `file-upload`, `camera`, `signature`, `audio-player`

Each primitive accepts `style` (CSS object), `visible` (condition), and `permission` (role-based access).

### Icon Primitive

The `icon` primitive renders icons from a connected icon library. By default it's a placeholder — apps connect a library via `plugins.overridePrimitive('icon', ...)`.

```json
{ "type": "icon", "props": { "name": "pencil-simple", "size": 16, "weight": "bold", "color": "#666" } }
```

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `name` | string | `"circle"` | Icon name in kebab-case (e.g., `pencil-simple`, `trash`, `moon`) |
| `size` | number | `24` | Icon width/height in pixels |
| `weight` | string | `"regular"` | `thin`, `light`, `regular`, `bold`, `fill`, `duotone` |
| `color` | string | — | CSS color value. Supports `$token` expressions |

Icon names are library-agnostic (kebab-case). The connected library resolves them to the actual icon component.

**Icon inside a button:**
```json
"edit-btn": {
  "type": "button",
  "props": { "style": { "display": "inline-flex", "alignItems": "center" } },
  "children": ["edit-icon"],
  "on": { "press": { "action": "openModal", "params": { "id": "edit-modal" } } }
},
"edit-icon": {
  "type": "icon",
  "props": { "name": "pencil-simple", "size": 16, "weight": "bold", "color": { "$token": "colors.textMuted" } }
}
```

**Conditional icon name (e.g., theme toggle):**
```json
"theme-icon": {
  "type": "icon",
  "props": {
    "name": { "$cond": { "$state": "/preferences/theme", "eq": "dark" }, "$then": "sun", "$else": "moon" },
    "size": 16, "weight": "bold"
  }
}
```

### Modal & Drawer Auto-Visibility

Modals and drawers **automatically manage their own visibility**. You do NOT need to add a `visible` condition. The engine binds:
- `type: "modal"` → visible when `/ui/modals/{elementId}` is truthy
- `type: "drawer"` → visible when `/ui/drawers/{elementId}` is truthy

Use `openModal`/`closeModal` actions to control them:
```json
"my-dialog": {
  "type": "modal",
  "props": { "title": "Confirm Action" },
  "children": ["dialog-content"]
}
```
Open it with: `{ "action": "openModal", "params": { "id": "my-dialog" } }`
Close it with: `{ "action": "closeModal", "params": { "id": "my-dialog" } }`

The `modal` primitive renders a `title` prop as an h2 heading above the children.

**Drawer example:**
```json
"detail-drawer": {
  "type": "drawer",
  "props": { "side": "right", "width": 400, "style": { "padding": 24 } },
  "children": ["drawer-content"]
}
```
Open it with: `{ "action": "openDrawer", "params": { "id": "detail-drawer" } }`
Close it with: `{ "action": "closeDrawer", "params": { "id": "detail-drawer" } }`

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `side` | string | `"left"` | `"left"` or `"right"` — which edge the drawer slides from |
| `width` | number/string | `300` | Width of the drawer panel |

### Toast Notifications

Toasts render automatically — no configuration needed. The `showNotification` action writes to `/ui/notifications` and the renderer displays toasts with entry/exit animations, auto-dismiss, and type-based icons.

**Basic usage:**
```json
{ "action": "showNotification", "params": { "message": "Task created successfully", "type": "success" } }
```

**With title:**
```json
{ "action": "showNotification", "params": { "title": "Error", "message": "Could not save. Server returned 500.", "type": "error" } }
```

**Persistent (no auto-dismiss):**
```json
{ "action": "showNotification", "params": { "message": "Unsaved changes", "type": "warning", "duration": null } }
```

**Custom duration:**
```json
{ "action": "showNotification", "params": { "message": "Copied!", "type": "info", "duration": 2000 } }
```

**Dismiss programmatically:**
```json
{ "action": "dismissNotification", "params": { "id": "notification-id" } }
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | string | — | Toast message text (required) |
| `type` | string | `"info"` | `success`, `error`, `warning`, `info` |
| `title` | string | — | Optional bold heading above message |
| `duration` | number or null | container default (4000) | Auto-dismiss time in ms. `null` = persistent |

**Override with toast-container element:**

By default, toasts appear at top-right with 4s duration. For custom positioning or behavior, add a `toast-container` element to your spec:

```json
"notifications": {
  "type": "toast-container",
  "props": {
    "position": "bottom-center",
    "duration": 6000,
    "maxVisible": 3,
    "offset": 16,
    "gap": 12
  }
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | string | `"top-right"` | `top-right`, `top-left`, `top-center`, `bottom-right`, `bottom-left`, `bottom-center` |
| `duration` | number | `4000` | Default auto-dismiss time in ms |
| `maxVisible` | number | `5` | Maximum toasts shown at once |
| `offset` | number | `24` | Distance from viewport edge in px |
| `gap` | number | `8` | Space between toasts in px |

Without a `toast-container` in the spec, defaults are used automatically. Icons use the connected icon library (Phosphor, Lucide, etc.) or fallback SVGs.

### Device Context (Auto-Tracked)

The renderer automatically tracks device information and writes it to state. Specs can read these values for responsive behavior, platform detection, and OS preferences.

| State Path | Type | Description |
|-----------|------|-------------|
| `/ui/device/viewportWidth` | number | Current viewport width in px |
| `/ui/device/viewportHeight` | number | Current viewport height in px |
| `/ui/device/platform` | string | `"web"`, `"ios"`, or `"android"` |
| `/ui/device/orientation` | string | `"portrait"` or `"landscape"` (auto-computed) |
| `/ui/device/colorScheme` | string | OS preference: `"light"` or `"dark"` |

All values update in real-time (viewport on resize, colorScheme on OS change).

**Usage in specs:**
```json
{ "$breakpoint": { "sm": 1, "md": 2, "lg": 4 } }
{ "$platform": { "web": "blur(24px)", "native": null } }
{ "$platform": { "web": "layout-web", "native": "layout-native" } }
{ "$cond": { "$state": "/ui/device/orientation", "eq": "portrait" }, "$then": "vertical", "$else": "horizontal" }
```

**Opt-out:** If the host app manages device context manually, disable auto-tracking:
```tsx
<MythikRenderer spec={spec} autoDeviceContext={false} />
```

**Legacy compatibility:** `$breakpoint` reads `/ui/device/viewportWidth` first, falls back to `/ui/viewportWidth` for existing apps that write there manually.

### Render Error Visibility

`createMythik({ security: { exposeErrors } })` controls how much render error detail the UI exposes.

```tsx
const svc = createMythik({
  security: { exposeErrors: false },
});

<MythikRenderer spec={spec} instance={svc} />
```

- Default is `true` (`secConfig.exposeErrors !== false`).
- `_error` render nodes still write diagnostics to `/ui/renderErrors` when error exposure is enabled.
- Primitive/component exceptions are caught by a renderer-level error boundary. In development with `exposeErrors !== false`, the boundary renders a visible overlay with the error message and component stack.
- In production or with `exposeErrors: false`, the boundary renders a neutral placeholder and does not leak error details.
- If a broken spec is replaced with a valid spec, the boundary resets on spec change and renders the recovered content.

### Table Primitive (Enhanced)

Feature-rich table with sorting, pagination, grouping, selection, and formatting. The AI enables/disables features with flags — no need to compose from primitives.

**Basic usage (backwards compatible):**
```json
"my-table": {
  "type": "table",
  "props": {
    "columns": [
      { "key": "name", "label": "Name", "width": "2fr", "align": "left" },
      { "key": "amount", "label": "Amount", "width": "1fr", "align": "right", "format": "currency", "formatOptions": { "currency": "HNL", "locale": "es-HN" } },
      { "key": "status", "label": "Status", "width": "120px" }
    ],
    "data": { "$state": "/items" }
  }
}
```

Columns accept both `"key"` and `"field"` for the data field name.

**Full configuration:**
```json
{
  "type": "table",
  "props": {
    "data": { "$state": "/response/data" },
    "columns": [ "..." ],
    "sorting": { "enabled": true, "default": { "field": "amount", "direction": "desc" }, "mode": "client" },
    "pagination": { "enabled": true, "pageSize": 20, "mode": "client" },
    "selection": { "enabled": true, "mode": "multiple", "state": "/selectedIds" },
    "groupBy": { "field": "institution", "header": true, "footer": "subtotal", "collapsible": true },
    "stickyHeader": true,
    "emptyState": { "icon": "inbox", "message": "No data" },
    "rowStyle": { "hover": { "backgroundColor": "#F1F5F9" } },
    "onRowClick": { "action": "openDrawer", "params": { "id": "detail-drawer" } }
  }
}
```

**Column properties:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` / `key` / `field` | string | — | Field name in data objects |
| `label` | string | — | Header text |
| `width` | string | `"1fr"` | CSS Grid width (`fr`, `px`, `%`) |
| `align` | `"left"` \| `"center"` \| `"right"` | `"left"` | Text alignment |
| `format` | `"currency"` \| `"number"` \| `"percent"` \| `"date"` | — | Auto-format cell values |
| `formatOptions` | object | — | `{ currency, locale, decimals }` |
| `sortable` | boolean | `true` | Column can be sorted |
| `visible` | boolean | `true` | Column visibility |
| `actions` | array | — | Action buttons in column: `[{ icon, color, onPress }]` |

**Sorting:** `{ enabled, mode, default, state }` — `"client"` sorts internally, `"server"` writes `{ field, direction }` to state (triggers dataSource re-fetch).

**Pagination:** `{ enabled, pageSize, mode, state, totalItems }` — `"client"` slices internally, `"server"` writes page number to state.

**Selection:** `{ enabled, mode, state }` — `"multiple"` adds checkbox column with select-all. `"single"` adds radio column.

**GroupBy:** `{ field, header, footer, expanded, collapsible }` — `footer: "subtotal"` auto-sums numeric columns.

### Design Token Auto-Inheritance

All primitives automatically inherit from deep design tokens — not just colors but also shape (border-radius), typography (font family, size, weight), spacing (padding, gaps), elevation (shadows), motion (transitions), and opacity (disabled/pressed states). No `$token` references needed for primitive defaults. Use explicit `style` props only for per-element overrides. Sub-elements (modal title, input label, error text) also read from tokens.

### Input Format Prop

The `input` primitive supports a `format` prop for display masking:
- `"phone"` — displays as (555) 123-4567, stores raw digits
- `"currency"` — displays as $1,234.56, stores raw number

### Input Type: Color

`type: "color"` renders a native color picker. Use with `$bindState` for interactive color selection:
```json
{ "type": "input", "props": { "type": "color", "label": "Pick Color", "value": { "$bindState": "/form/color" } } }
```

---

## Actions

Wire actions to events with the `on` property:

```json
{
  "on": {
    "press": { "action": "navigate", "params": { "screen": "detail" } }
  }
}
```

### Multiple Actions (Sequential)

Actions in an array execute sequentially — each async action (like `fetch`) completes before the next one starts:
```json
{
  "on": {
    "press": [
      { "action": "fetch", "params": { "url": "...", "method": "POST", "body": { ... } } },
      { "action": "closeModal", "params": { "id": "my-modal" } },
      { "action": "fetch", "params": { "url": "...", "method": "GET", "target": "/items" } }
    ]
  }
}
```

### fireAndForget Mode

Add `"fireAndForget": true` to dispatch an action without waiting for it to complete:
```json
{
  "action": "fetch",
  "fireAndForget": true,
  "params": { "url": "...", "method": "GET", "target": "/items" }
}
```
The action executes in the background. The next action in the chain starts immediately.

**Use case:** Background re-fetches after closing a modal. The user sees the modal close instantly while the data refreshes behind the scenes.

### Action Reference

| Action | Params | Purpose |
|--------|--------|---------|
| `setState` | `{ statePath, value }` | Set a value in state. Value can contain expressions and nested objects |
| `navigateScreen` | `{ screen, ...params }` | Navigate to a screen (MythikApp context) |
| `goBackScreen` | — | Go to previous screen using navigation history (MythikApp context) |
| `navigate` | `{ screen, ...params }` | Set navigation intent in state (low-level, prefer `navigateScreen`) |
| `goBack` | — | Set goBack intent in state (low-level, prefer `goBackScreen`) |
| `openModal` | `{ id }` | Show a modal (sets `/ui/modals/{id}` to true) |
| `closeModal` | `{ id }` | Hide a modal (sets `/ui/modals/{id}` to false) |
| `openDrawer` | `{ id }` | Open a drawer |
| `closeDrawer` | `{ id }` | Close a drawer |
| `showNotification` | `{ message, type }` | Show a toast/snackbar |
| `toggleTheme` | — | Switch dark/light mode |
| `setLocale` | `{ locale }` | Change language |
| `copyToClipboard` | `{ value }` | Copy to clipboard. Objects auto-stringified as JSON |
| `openUrl` | `{ url }` | Open external URL |
| `fetch` | `{ url, method, body, target, headers }` | HTTP request, writes response to target state path |
| `submitForm` | `{ url, method, body, target, successMessage }` | Validate + HTTP request + success notification |
| `dismissNotification` | `{ id }` | Remove a toast notification by id |
| `login` | `{ email, password, ... }` | Authenticate via auth provider. Writes user to `/auth/*` state. Clears credentials after. |
| `logout` | — | Clear session, tokens, state. Navigate to loginScreen. |
| `refreshSession` | — | Manual token refresh. Normally automatic (proactive refresh). |
| `validateForm` | `{ formId }` | Mark all fields touched, validate all, write errors |
| `touchField` | `{ formId, field }` | Mark single field touched and validate it |
| `resetForm` | `{ formId }` | Reset form to initial values, clear errors |
| `uploadFile` | `{ bucket, target, path? }` | Upload file(s) to storage via StorageAdapter. Writes URL(s) to target path |
| `deleteFile` | `{ path, bucket }` | Delete file from storage |
| `export` | `{ source, columns, filename, format? }` | Export data as CSV (built-in) or via adapter (XLSX/PDF). Triggers download |
| `updateTokens` | `{ dna?: {...}, identity?: {...}, _replace?: true }` | Hot-swap design tokens at runtime. Deep-merges by default; `_replace: true` fully replaces. Persists raw config to `/tokens/raw`. Numeric DNA seeds > 1 auto-normalized (÷100) during DNA derivation |

### fetch Action Details

The `fetch` action supports:
- **Custom headers:** `"headers": { "apikey": "...", "Authorization": "Bearer ..." }`
- **Body with expressions:** Nested expressions in `body` are deeply resolved before sending
- **Empty string sanitization:** Empty strings in body are automatically converted to `null` (prevents database errors for typed columns)
- **Loading state:** Sets `/ui/loading` to true while in flight, false when done
- **Error handling:** On failure, sets `/ui/lastError` with status and message

```json
{
  "action": "fetch",
  "params": {
    "url": { "$template": "${/config/apiUrl}/rest/v1/tasks" },
    "method": "POST",
    "headers": { "$state": "/config/headers" },
    "body": {
      "title": { "$state": "/form/title" },
      "description": { "$state": "/form/description" },
      "due_date": { "$state": "/form/dueDate" }
    },
    "target": "/lastResult"
  }
}
```

Action arrays may also mix normal action bindings and transaction bindings. Mythik runs each entry in order and waits for a transaction to finish before dispatching the next entry.

Any action binding can include `params.skipIf`. Mythik resolves `skipIf` at dispatch time before the rest of the params; if it is truthy, that action is skipped and the surrounding action chain continues.

### Transactions (Optimistic Updates)

Use `transaction` for CRUD operations that need instant UI feedback. The framework takes a state snapshot, applies your changes instantly, then confirms with the server. On failure, it rolls back automatically.

```json
{
  "on": {
    "press": {
      "transaction": {
        "before": [/* UI transitions — NOT rolled back */],
        "optimistic": [/* Data changes — ROLLED BACK on error */],
        "confirm": [/* Network request — determines success/failure */],
        "onSuccess": [/* Post-success sync (optional) */],
        "onError": [/* User notification (optional, runs after rollback) */]
      }
    }
  }
}
```

**Decision rule:**
- **"Would I undo this if the server says no?"** → `optimistic`
- **"Should this happen regardless?"** → `before`

| Action | Phase | Why |
|--------|-------|-----|
| `closeModal` | `before` | Don't reopen on error |
| `setState` (data) | `optimistic` | Rollback if server rejects |
| `setState` (form reset) | `optimistic` | Restore form so user can retry |
| `navigate` | `before` | Stay on page, show error there |

**Confirm result access:** The `fetch` in `confirm` can write to `/tx/result` via `target`. `onSuccess` reads it with `{ "$state": "/tx/result" }`. On error, `/tx/error` contains `{ message }`; fetch-based HTTP failures preserve backend details when available (`status`, `data`, nested `error.code`, nested `error.message`). Both are cleaned up automatically.

**Timeout:** Default 10 seconds. Override with `timeout` (ms):
```json
{ "transaction": { "timeout": 30000, "confirm": [...] } }
```

### Transaction Templates

Copy the template for your CRUD operation, replace the `{{PLACEHOLDERS}}`.

#### CREATE — Add item to list

```json
{
  "transaction": {
    "before": [
      { "action": "closeModal", "params": { "id": "{{MODAL_ID}}" } }
    ],
    "optimistic": [
      { "action": "setState", "params": {
        "statePath": "{{ARRAY_PATH}}",
        "value": { "$array": "append", "source": { "$state": "{{ARRAY_PATH}}" }, "value": {
          "id": { "$template": "temp-${/form/title}" },
          "{{FIELD_1}}": { "$state": "/form/{{FIELD_1}}" },
          "{{FIELD_2}}": { "$state": "/form/{{FIELD_2}}" }
        }}
      }}
    ],
    "confirm": [
      { "action": "fetch", "params": {
        "method": "POST",
        "url": "{{API_URL}}",
        "headers": { "Prefer": "return=representation" },
        "body": {
          "{{FIELD_1}}": { "$state": "/form/{{FIELD_1}}" },
          "{{FIELD_2}}": { "$state": "/form/{{FIELD_2}}" }
        },
        "target": "/tx/result"
      }}
    ],
    "onSuccess": [
      { "action": "fetch", "params": {
        "method": "GET",
        "url": "{{API_URL}}?select=*&order=created_at.desc",
        "target": "{{ARRAY_PATH}}"
      }}
    ],
    "onError": [
      { "action": "showNotification", "params": { "type": "error", "message": "Could not create {{ENTITY}}. Please try again." } }
    ]
  }
}
```

#### UPDATE — Edit item in list

```json
{
  "transaction": {
    "before": [
      { "action": "closeModal", "params": { "id": "{{MODAL_ID}}" } }
    ],
    "optimistic": [
      { "action": "setState", "params": {
        "statePath": "{{ARRAY_PATH}}",
        "value": { "$array": "replace", "source": { "$state": "{{ARRAY_PATH}}" },
          "where": { "field": "id", "eq": { "$state": "/form/editId" } },
          "value": {
            "id": { "$state": "/form/editId" },
            "{{FIELD_1}}": { "$state": "/form/{{FIELD_1}}" },
            "{{FIELD_2}}": { "$state": "/form/{{FIELD_2}}" }
          }
        }
      }}
    ],
    "confirm": [
      { "action": "fetch", "params": {
        "method": "PATCH",
        "url": { "$template": "{{API_URL}}?id=eq.${/form/editId}" },
        "headers": { "Prefer": "return=representation" },
        "body": {
          "{{FIELD_1}}": { "$state": "/form/{{FIELD_1}}" },
          "{{FIELD_2}}": { "$state": "/form/{{FIELD_2}}" }
        },
        "target": "/tx/result"
      }}
    ],
    "onError": [
      { "action": "showNotification", "params": { "type": "error", "message": "Could not update {{ENTITY}}. Please try again." } }
    ]
  }
}
```

Note: UPDATE has no `onSuccess` — the optimistic data is already correct. A re-fetch would cause a visible flash.

#### DELETE — Remove item from list

```json
{
  "transaction": {
    "before": [
      { "action": "closeModal", "params": { "id": "{{CONFIRM_MODAL_ID}}" } }
    ],
    "optimistic": [
      { "action": "setState", "params": {
        "statePath": "{{ARRAY_PATH}}",
        "value": { "$array": "remove", "source": { "$state": "{{ARRAY_PATH}}" },
          "where": { "field": "id", "eq": { "$state": "/ui/deleteId" } }
        }
      }}
    ],
    "confirm": [
      { "action": "fetch", "params": {
        "method": "DELETE",
        "url": { "$template": "{{API_URL}}?id=eq.${/ui/deleteId}" }
      }}
    ],
    "onError": [
      { "action": "showNotification", "params": { "type": "error", "message": "Could not delete {{ENTITY}}. Please try again." } }
    ]
  }
}
```

#### TOGGLE — Flip a boolean value

```json
{
  "transaction": {
    "optimistic": [
      { "action": "setState", "params": {
        "statePath": "{{BOOLEAN_PATH}}",
        "value": { "$not": { "$state": "{{BOOLEAN_PATH}}" } }
      }}
    ],
    "confirm": [
      { "action": "fetch", "params": {
        "method": "PATCH",
        "url": { "$template": "{{API_URL}}?id=eq.{{ITEM_ID}}" },
        "body": { "{{FIELD}}": { "$state": "{{BOOLEAN_PATH}}" } }
      }}
    ],
    "onError": [
      { "action": "showNotification", "params": { "type": "error", "message": "Could not update. Please try again." } }
    ]
  }
}
```

Note: TOGGLE has no `before` — there's no modal to close.

### Legacy CRUD Pattern (without transactions)

For simple cases that don't need optimistic updates, use sequential action arrays:

```json
{
  "on": {
    "press": [
      { "action": "closeModal", "params": { "id": "edit-modal" } },
      { "action": "fetch", "params": { "url": "...", "method": "PATCH", "body": { ... } } },
      { "action": "fetch", "params": { "url": "...", "method": "GET", "target": "/items" } }
    ]
  }
}
```

The modal closes instantly. The PATCH waits for completion, then GET fetches fresh data. The user sees the list update ~500ms later. **Prefer transactions for instant UX.**

---

## Validation

Add validation to input fields:

```json
{
  "type": "input",
  "props": {
    "value": { "$bindState": "/form/email" },
    "checks": [
      { "type": "required", "message": "Email is required" },
      { "type": "email", "message": "Invalid email format" }
    ],
    "validateOn": "blur"
  }
}
```

| Validator | Args | Purpose |
|-----------|------|---------|
| `required` | — | Non-empty value |
| `email` | — | Valid email format |
| `minLength` | `{ min }` | Minimum string length |
| `maxLength` | `{ max }` | Maximum string length |
| `pattern` | `{ pattern }` | Regex match |
| `min` | `{ min }` | Minimum number |
| `max` | `{ max }` | Maximum number |
| `numeric` | — | Must be a number |
| `url` | — | Valid URL |
| `matches` | `{ other }` | Must equal another field |
| `equalTo` | `{ other }` | Must equal another field |
| `greaterThan` | `{ other }` | Must be greater than another field |
| `lessThan` | `{ other }` | Must be less than another field |
| `requiredIf` | `{ field }` | Required when condition field is truthy |

---

## Repeat (Lists)

Render an element once per item in an array:

```json
"task-list": {
  "type": "stack",
  "repeat": { "statePath": "/tasks", "key": "id" },
  "children": ["task-row"]
}
```

Use `source` for filtered/paginated lists:
```json
"repeat": {
  "source": {
    "$array": "slice",
    "source": {
      "$array": "filter",
      "source": { "$state": "/tasks" },
      "where": { "field": "status", "eq": { "$state": "/filter/status" } }
    },
    "from": { "$math": "multiply", "args": [{ "$state": "/page" }, 10] },
    "to": { "$math": "multiply", "args": [{ "$math": "add", "args": [{ "$state": "/page" }, 1] }, 10] }
  },
  "key": "id"
}
```

Inside repeated elements, use `$item` and `$index` to access the current item's data. These work in `props`, `style`, `visible`, and `on` (event params).

### Grouped Repeat (`groupBy`)

Two modes — auto-detected:

**Mode 1: Client-Side Grouping** — engine groups a flat array by field value:

```json
"task-list": {
  "type": "stack",
  "repeat": {
    "source": { "$state": "/tasks" },
    "key": "id",
    "groupBy": "category",
    "groupHeader": ["category-header"],
    "groupFooter": ["category-subtotal"]
  },
  "children": ["task-row"]
}
```

**Mode 2: Pre-Grouped Data** — server already grouped the data:

```json
"budget-table": {
  "type": "stack",
  "repeat": {
    "source": { "$state": "/response/groups" },
    "key": "name",
    "groupKey": "name",
    "groupItems": "rows",
    "groupHeader": ["institution-header"],
    "groupFooter": ["subtotal-row"],
    "footer": ["grand-total-row"]
  },
  "children": ["data-row"]
}
```

Pre-grouped data format: `[{ "name": "Group A", "rows": [...], "subtotal": { "total": 50000 } }, ...]`

**Detection:** `groupBy` (string) → client-side. `groupKey` + `groupItems` → pre-grouped.

| Property | Type | Description |
|----------|------|-------------|
| `groupBy` | string | Field name for client-side grouping |
| `groupKey` | string | Field in group objects containing the key (pre-grouped) |
| `groupItems` | string | Field in group objects containing the items array (pre-grouped) |
| `groupHeader` | string[] | Element IDs to render as group header (receives `$group` context) |
| `groupFooter` | string[] | Element IDs to render as group footer (receives `$group` context) |
| `footer` | string[] | Element IDs to render once after all groups |

Inside `groupHeader` and `groupFooter`, use `$group` expressions. Inside `children`, use `$item`/`$index` as usual.

### Repeat Selection (`selection`)

Adds multi-select behavior to a repeat:

```json
"task-list": {
  "type": "stack",
  "repeat": {
    "source": { "$state": "/tasks" },
    "key": "id",
    "selection": {
      "state": "/selectedIds",
      "mode": "multiple"
    }
  },
  "children": ["task-row"]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `state` | string | State path for selected IDs array |
| `key` | string | Field from each item used as the selection identifier |
| `mode` | `"single"` \| `"multiple"` | Single selects one at a time, multiple allows many |

Inside the repeat, use `$selection` expressions:
```json
"select-checkbox": {
  "type": "checkbox",
  "props": { "value": { "$selection": "selected" } },
  "on": { "change": { "action": "toggleSelection", "params": { "statePath": "/selectedIds", "value": { "$item": "id" } } } }
}
```

**Selection helper actions:**

| Action | Params | Description |
|--------|--------|-------------|
| `toggleSelection` | `{ statePath, value, mode? }` | Add/remove value from selection array. `mode: "single"` replaces |
| `selectAll` | `{ statePath, values }` | Set selection to provided values array |
| `selectNone` | `{ statePath }` | Clear selection array |

---

## Visibility Conditions

```json
{ "$state": "/user/role", "eq": "admin" }
[{ "$state": "/form/isValid" }, { "$state": "/form/hasChanges" }]
{ "$or": [{ "$state": "/user/isVIP" }, { "$state": "/cart/total", "gt": 200 }] }
{ "$and": [{ "$state": "/user/active" }, { "$state": "/user/verified" }] }
```

### Loading/Content/Empty Pattern

For data-driven screens, use this visibility pattern:

```json
"loading-section": {
  "visible": { "$and": [{ "$state": "/ui/loading" }, { "$not": { "$array": "count", "source": { "$state": "/items" } } }] }
},
"content-section": {
  "visible": { "$and": [{ "$not": { "$state": "/ui/lastError" } }, { "$array": "count", "source": { "$state": "/items" } }] }
},
"empty-section": {
  "visible": { "$and": [{ "$not": { "$state": "/ui/loading" } }, { "$not": { "$state": "/ui/lastError" } }, { "$not": { "$array": "count", "source": { "$state": "/items" } } }] }
},
"error-section": {
  "visible": { "$state": "/ui/lastError" }
}
```

**Key:** Loading skeleton shows only on initial load (loading AND no data). Content stays visible during background re-fetches (data exists, regardless of loading state).

---

## Derived State (`derive`)

Auto-computed state values that update reactively when their dependencies change. Declared at the spec level.

```json
{
  "root": "...",
  "elements": { "..." },
  "derive": {
    "/stats/totalItems": {
      "$array": "count", "source": { "$state": "/items" }
    },
    "/stats/avgPrice": {
      "$math": "divide", "args": [
        { "$array": "sum", "source": { "$state": "/items" }, "field": "price" },
        { "$array": "count", "source": { "$state": "/items" } }
      ]
    },
    "/stats/completionRate": {
      "$math": "multiply", "args": [
        { "$math": "divide", "args": [
          { "$array": "count", "source": { "$state": "/tasks" }, "where": { "field": "status", "eq": "completed" } },
          { "$array": "count", "source": { "$state": "/tasks" } }
        ]},
        100
      ]
    }
  }
}
```

**How it works:**
1. On spec mount: all derive expressions are evaluated in dependency order (topological sort)
2. On state change: only derives whose dependencies changed re-evaluate
3. Derive paths are **read-only** — `setState` to a derive path is blocked by StateGuard
4. Circular dependencies are detected at mount time (throws error, not silent loop)

**Derive A can reference Derive B** — as long as there's no cycle. The engine evaluates them in topological order.

---

## Form Validation (`forms`)

Declarative form-level validation. Coordinates field validation as a unit, tracks form-level validity, supports cross-field rules, and gates `submitForm`.

```json
{
  "forms": {
    "task-form": {
      "fields": {
        "title": {
          "statePath": "/form/title",
          "rules": [{ "type": "required", "message": "Title is required" }]
        },
        "email": {
          "statePath": "/form/email",
          "rules": [{ "type": "required" }, { "type": "email", "message": "Invalid email" }]
        },
        "maxPrice": {
          "statePath": "/form/maxPrice",
          "rules": [
            { "type": "greaterThan", "args": { "other": { "$state": "/form/minPrice" } }, "message": "Max must exceed min" }
          ]
        }
      },
      "validateOn": "blur"
    }
  }
}
```

### Form State (auto-generated)

| Path | Type | Description |
|------|------|-------------|
| `/ui/forms/{formId}/isValid` | boolean | True when ALL fields pass validation |
| `/ui/forms/{formId}/errorCount` | number | Total displayed errors across all fields |
| `/ui/forms/{formId}/isDirty` | boolean | True when any field value differs from initial |
| `/ui/forms/{formId}/fields/{fieldId}/errors` | string[] | Error messages (empty when valid) |
| `/ui/forms/{formId}/fields/{fieldId}/touched` | boolean | User has interacted with this field |
| `/ui/forms/{formId}/fields/{fieldId}/dirty` | boolean | Value differs from initial |

**Key behavior:** `isValid` reflects actual validity even for untouched fields (for submit button state). But `errors` are only shown for touched fields (no error messages on fields the user hasn't interacted with yet).

### Form Actions

| Action | Params | Description |
|--------|--------|-------------|
| `validateForm` | `{ formId }` | Mark all fields as touched, validate all, write errors |
| `touchField` | `{ formId, field }` | Mark one field as touched and validate it |
| `resetForm` | `{ formId }` | Restore initial values, clear all errors/touched/dirty |
| `submitForm` | `{ formId, url, ... }` | When `formId` present: validates first, blocks if invalid |

### Spec Author Usage

```json
// Disable submit until form is valid
"disabled": { "$not": { "$state": "/ui/forms/task-form/isValid" } }

// Show inline field error
"error-text": {
  "type": "text",
  "visible": { "$array": "count", "source": { "$state": "/ui/forms/task-form/fields/title/errors" } },
  "props": {
    "content": { "$array": "first", "source": { "$state": "/ui/forms/task-form/fields/title/errors" } },
    "style": { "color": "#EF4444", "fontSize": 12 }
  }
}

// Submit with validation gate
{ "action": "submitForm", "params": { "formId": "task-form", "url": "...", "method": "POST", "body": {...} } }
```

### Compatibility

Forms are 100% opt-in. Existing specs with inline `checks` on inputs continue working. `submitForm` without `formId` behaves exactly as before.

---

## Data Sources (`dataSources`)

Declarative reactive data fetching. Makes specs self-contained — no host-app code needed for GET requests.

```json
{
  "root": "...",
  "elements": { "..." },
  "dataSources": {
    "tasks": {
      "url": { "$template": "${/config/apiUrl}/rest/v1/tasks?select=*&order=created_at.desc" },
      "method": "GET",
      "headers": { "$state": "/config/headers" },
      "params": {
        "status": { "$state": "/filter/status" },
        "page": { "$state": "/pagination/page" },
        "search": { "$state": "/filter/search" }
      },
      "target": "/tasks",
      "trigger": "auto",
      "debounce": 300,
      "initialFetch": true,
      "emptyWhileLoading": false
    }
  }
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `url` | Expression | — | Request URL (supports `$template`, `$state`) |
| `method` | string | `"GET"` | HTTP method |
| `headers` | Expression | — | Request headers (from state, NOT from spec — keys must not live in the database) |
| `params` | `Record<string, Expression>` | — | Reactive parameters. Changes trigger re-fetch |
| `target` | string | — | State path where response is written |
| `trigger` | `"auto"` \| `"manual"` | `"auto"` | `auto`: re-fetch when params change. `manual`: only via `refreshDataSource` action |
| `debounce` | number | `0` | Debounce time in ms for auto-trigger |
| `initialFetch` | boolean | `true` | Fetch on spec mount |
| `emptyWhileLoading` | boolean | `false` | If `true`, clear target while loading. If `false`, keep previous data |

**Auto-generated state paths** for a dataSource with `"target": "/tasks"`:
- `/tasks` — response data
- `/tasksLoading` — boolean
- `/tasksError` — error object or null

**Param filtering:** Values `null`, `undefined`, `""`, or `"all"` are omitted from the query string (inactive filter).

**Force re-fetch action:**
```json
{ "action": "refreshDataSource", "params": { "id": "tasks" } }
```

**Security:** Headers come from state, not from spec. API keys must NOT be in the spec (which lives in the database). The host app injects them via `initialState`:
```json
"sharedState": {
  "config": { "headers": { "apikey": "...", "Authorization": "Bearer ..." } }
}
```

**Interaction with `fetch` action:** `dataSources` handles reactive GET. `fetch` action handles one-shot operations (POST/PATCH/DELETE in transactions). They complement each other.

---

## Element Templates (`templates`)

Reusable element definitions within specs. Reduces repetition for patterns like monetary columns, stat cards, etc.

```json
{
  "templates": {
    "monetary-col": {
      "type": "text",
      "defaults": { "color": "#0F172A", "bold": 400, "currency": "HNL" },
      "props": {
        "content": {
          "$format": "currency",
          "value": { "$prop": "value" },
          "currency": { "$prop": "currency" },
          "locale": "es-HN"
        }
      },
      "style": {
        "textAlign": "right",
        "fontFamily": "monospace",
        "fontSize": 13,
        "fontWeight": { "$prop": "bold" },
        "color": { "$prop": "color" }
      }
    }
  },
  "elements": {
    "col-votado": {
      "type": "monetary-col",
      "props": { "value": { "$item": "allocatedAmount" } }
    },
    "col-mod": {
      "type": "monetary-col",
      "props": { "value": { "$item": "modificaciones" }, "color": "#D97706", "bold": 600 }
    }
  }
}
```

**How it works:**
1. Engine encounters element with `type: "monetary-col"` (not a registered primitive)
2. Checks `spec.templates` → found
3. Merges element props with template `defaults` (element props win)
4. Expands template: replaces `$prop` references with merged props
5. Renders the resulting element as if defined inline

**Template properties:**

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | Primitive type this template wraps |
| `defaults` | `Record<string, unknown>` | Default prop values |
| `props` | object | Props using `$prop` for parameterization |
| `style` | object | Style using `$prop` |
| `children` | `string[]` | Child element IDs. Use `"$children"` marker to insert the consuming element's children |

Templates support all Element fields: `visible`, `hover`, `active`, `motion`, etc.

**Templates with children:**
```json
{
  "templates": {
    "card": {
      "type": "box",
      "defaults": { "padding": 16 },
      "style": { "padding": { "$prop": "padding" }, "borderRadius": 12, "backgroundColor": { "$token": "colors.surface" } },
      "children": ["$children"]
    }
  },
  "elements": {
    "my-card": { "type": "card", "children": ["title", "body"] }
  }
}
```

`"$children"` is replaced with the consuming element's actual children at expansion time.

**Sharing:** Templates defined in an AppSpec are available to all screens. Screen-level templates override app-level templates.

---

## App Spec & Screen Outlet

`AppSpec` defines the app-level layout, navigation, shared state, and screen registry. Screens render inside a `screen-outlet` pseudo-primitive. **100% opt-in** — without AppSpec, everything works as today.

```json
{
  "type": "app",
  "name": "my-application",
  "navigation": {
    "type": "sidebar",
    "initialScreen": "task-manager",
    "breadcrumb": "history",
    "auth": {
      "loginScreen": "login",
      "protectedScreens": ["*"],
      "roleAccess": { "admin": ["*"], "user": ["task-manager", "profile"] }
    }
  },
  "screens": {
    "task-manager": {
      "label": "Task Manager",
      "icon": "clipboard-text",
      "roles": ["admin", "user"],
      "statePolicy": "preserve"
    },
    "new-task": {
      "label": "New Task",
      "icon": "plus",
      "roles": ["admin", "user"],
      "statePolicy": "reset",
      "parent": "task-manager"
    }
  },
  "tokens": { "colors": { "primary": "#0D9488" } },
  "translations": { "en": { "..." }, "es": { "..." } },
  "sharedState": { "preferences": { "theme": "light", "locale": "en" } },
  "templates": { "monetary-col": { "..." } },
  "layout": {
    "root": "app-shell",
    "elements": {
      "app-shell": { "type": "stack", "props": { "direction": "horizontal" }, "children": ["sidebar", "screen-outlet"] },
      "sidebar": { "type": "box", "children": ["nav-menu"] },
      "screen-outlet": { "type": "screen-outlet", "style": { "flex": 1 } }
    }
  }
}
```

### Screen Definition

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | string or Expression | — | Display name (sidebar, breadcrumb) |
| `icon` | string | — | Icon name (kebab-case) |
| `roles` | `string[]` | `["*"]` | Which roles can access this screen (used only when `roleAccess` is NOT defined) |
| `statePolicy` | `"preserve"` \| `"reset"` \| `"reload"` | `"preserve"` | State behavior on navigation |
| `parent` | string | — | Parent screen ID (for hierarchy breadcrumb) |

### State Policies

| Policy | On navigate away | On navigate back | Use case |
|--------|-----------------|-----------------|----------|
| `preserve` | State kept | Restores previous state | Lists, dashboards |
| `reset` | State cleared | Fresh initialState | Create forms |
| `reload` | State cleared | initialActions re-execute | Always-fresh data |

### Inheritance

Screens inherit from AppSpec:
- **Tokens**: deep merge (screen overrides app)
- **Translations**: merged (screen extends app)
- **Templates**: screen overrides app with same name

### Auto-Generated State

| Path | Content |
|------|---------|
| `/navigation/currentScreen` | Active screen ID |
| `/navigation/history` | Array of visited screen IDs |
| `/navigation/breadcrumb` | Enriched array with label, icon |
| `/app/screens` | Array of accessible screen definitions (filtered by role, excludes loginScreen) |

**Sidebar auto-filtering:** `/app/screens` only includes screens the current user can access. The loginScreen is always excluded from the sidebar. When the user logs in or roles change, call `refreshScreenList()` on the AppEngine to re-compute the sidebar.

### Breadcrumb Modes

| Mode | Behavior |
|------|----------|
| `"history"` | Follows navigation stack |
| `"hierarchy"` | Follows `parent` chain from current screen to root |
| `"none"` | No auto-computed breadcrumb |

### Access Control — roleAccess vs Screen Roles

Two models exist for controlling screen access. **Only one is active per app** — they don't mix.

**Model 1: `roleAccess` map (recommended for multi-role apps)**

Define in `navigation.auth.roleAccess`. This is the **source of truth** when present — `ScreenDefinition.roles` is ignored.

```json
"roleAccess": {
  "admin": ["*"],
  "user": ["task-manager", "dashboard", "profile"],
  "viewer": ["dashboard"]
}
```

- A role listed with `["*"]` can access every screen.
- A role NOT listed in `roleAccess` has **zero access** (denied everywhere).
- The loginScreen is always accessible regardless of roleAccess — prevents infinite redirect loops.

**Model 2: `ScreenDefinition.roles` (backward compatible)**

When `roleAccess` is NOT defined (or undefined), each screen's `roles` array controls access:

```json
"screens": {
  "dashboard": { "label": "Dashboard", "roles": ["admin", "user", "viewer"] },
  "admin-panel": { "label": "Admin", "roles": ["admin"] }
}
```

- `roles: ["*"]` (default) means any role can access the screen.

**Navigation behavior on access denial:**

| User state | Behavior |
|------------|----------|
| **Unauthenticated** (no role, no `/auth/isAuthenticated`) | Redirect to `loginScreen` |
| **Authenticated but unauthorized** (`/auth/isAuthenticated` is true, role doesn't match) | Stay on current screen, set `/auth/error` with denial message — **no redirect to login** |

**Sidebar auto-refresh:**

`MythikApp` automatically re-computes `/app/screens` when auth state changes (`/auth/user/*` or `/auth/isAuthenticated`). No manual call needed — login, logout, session restore, cross-tab sync, and role changes all trigger sidebar refresh automatically. If building a custom host app without `MythikApp`, call `appEngine.refreshScreenList()` after auth state changes.

---

## Interactive States

Add visual feedback to elements with `hover`, `active`, `focus`, and `transition`. Zero overhead for elements without interactions.

**CSS vs Motion — automatic detection:** If hover/active/focus contains any of these 6 transform properties → Motion wrapper: `scale`, `scaleX`, `scaleY`, `rotate`, `x`, `y`. Everything else → CSS `:hover`/`:active`/`:focus-visible` pseudo-classes (no wrapper, no extra DOM node).

### Hover — pointer enters

```json
"hover": { "scale": 1.03, "backgroundColor": { "$token": "colors.primaryHover" } }
```

### Active — element is pressed

```json
"active": { "scale": 0.97 }
```

### Focus — keyboard focus

```json
"focus": { "boxShadow": "0 0 0 3px rgba(13,148,136,0.3)" }
```

### Transition — how changes animate

```json
"transition": { "duration": 200, "ease": "easeOut" }
```

### Transform shorthand

Use `scale`, `x`, `y`, `rotate` directly — no CSS transform strings needed:

| Property | Effect |
|----------|--------|
| `scale` | Scale up/down |
| `x` | Move horizontally |
| `y` | Move vertically |
| `rotate` | Rotate in degrees |
| `scaleX`, `scaleY` | Axis-specific scale |

### Complete example

```json
"save-btn": {
  "type": "button",
  "props": { "label": "Save Changes" },
  "style": { "backgroundColor": { "$token": "colors.primary" }, "color": "#fff", "padding": "10px 20px", "borderRadius": 10 },
  "hover": { "scale": 1.03, "y": -1 },
  "active": { "scale": 0.97 },
  "focus": { "boxShadow": "0 0 0 3px rgba(13,148,136,0.3)" },
  "transition": { "duration": 150, "ease": "easeOut" }
}
```

All fields support `$token`, `$state`, `$cond`, and other expressions.

---

## Animations

### Mount animation (fade in, slide up, etc.)

```json
"card": {
  "type": "box",
  "props": {},
  "motion": {
    "initial": { "opacity": 0, "y": 20 },
    "animate": { "opacity": 1, "y": 0 },
    "transition": { "duration": 0.3, "ease": "easeOut" }
  }
}
```

### Exit animation

```json
"motion": {
  "initial": { "opacity": 0 },
  "animate": { "opacity": 1 },
  "exit": { "opacity": 0, "y": -10 }
}
```

### Staggered children

Parent defines stagger, children animate in sequence:

```json
"list": {
  "type": "stack",
  "motion": {
    "animate": {},
    "transition": { "staggerChildren": 0.05 }
  },
  "children": ["card-1", "card-2", "card-3"]
}
```

Each child should have its own `motion.initial`/`motion.animate`.

### Motion design tokens

Define once at app level alongside `colors`, `spacing`, `radius`:

```json
{
  "tokens": {
    "motion": {
      "duration": { "fast": 150, "normal": 250, "slow": 400 },
      "ease": {
        "default": "easeOut",
        "spring": { "type": "spring", "stiffness": 300, "damping": 20 },
        "smooth": [0.16, 1, 0.3, 1]
      },
      "presets": {
        "hoverLift": { "y": -2, "scale": 1.02 },
        "hoverGlow": { "boxShadow": "0 0 0 3px rgba(13,148,136,0.2)" },
        "press": { "scale": 0.97 },
        "fadeIn": { "initial": { "opacity": 0 }, "animate": { "opacity": 1 } },
        "slideUp": { "initial": { "opacity": 0, "y": 20 }, "animate": { "opacity": 1, "y": 0 } },
        "scaleIn": { "initial": { "scale": 0.9, "opacity": 0 }, "animate": { "scale": 1, "opacity": 1 } }
      }
    }
  }
}
```

Reference tokens or write custom values:

```json
"hover": { "$token": "motion.presets.hoverLift" }
"transition": { "duration": { "$token": "motion.duration.fast" } }
```

---

## Rules

1. **Always use the flat tree structure** — root + elements map with string IDs for children
2. **Use `$token` for all visual values** — never hardcode colors, spacing, fonts
3. **Use `$bindState` for form inputs** — enables two-way data binding
4. **Use `$cond` for dynamic styles** — conditional colors, sizes, visibility
5. **Use `$template` for computed strings** — interpolation over concatenation
6. **Use `$math`, `$array`, `$date`, `$format` instead of `$computed`** — built-in operations cover 90%+ of cases without code
7. **Use `$and`/`$or`/`$not` for boolean logic** — works in `disabled`, `style`, `visible`, anywhere
8. **Use `$array: 'search'` for filtering lists** — case-insensitive multi-field search
9. **Use `repeat.source` for paginated/filtered lists** — chain `$array: 'filter'` → `$array: 'search'` → `$array: 'slice'`
10. **Don't add `visible` to modals/drawers** — the engine manages it automatically via `/ui/modals/{id}`
11. **Use `$let` array format when stored in JSONB** — `[["a", expr], ["b", expr]]` preserves order
12. **Use `transaction` for all CRUD operations** — instant UX with automatic rollback on failure
13. **In transactions: `closeModal` goes in `before`, data changes in `optimistic`** — before is not rolled back, optimistic is
14. **UPDATE transactions don't need `onSuccess`** — optimistic data is already correct, re-fetch causes visible flash
15. **Use `type: 'icon'` with `name` prop for icons** — not emoji text. Names are kebab-case: `pencil-simple`, `trash`, `moon`
16. **`$array: 'append'` and `$array: 'replace'` use `value`, not `item`** — `item` silently does nothing
17. **Field IDs must be unique within the spec** — use descriptive names: `patient-name`, `submit-btn`
18. **Arrays for ordered collections** — never objects
19. **Use `hover`/`active`/`focus` for interactive feedback** — not inline styles or event handlers
20. **Use `transition` to control animation speed** — default duration is fine for most cases
21. **Use `motion.initial`/`motion.animate` for entrance animations** — elements animate when they first appear
22. **Buttons and touchables have built-in CSS transitions** — only add explicit `hover`/`active` when you need custom behavior beyond the defaults
23. **Use `$switch` for 3+ branches** — replaces deeply nested `$cond`. `default` is required
24. **Use `$format` with `locale` for localized numbers** — `"locale": "es-HN"` for country-specific formatting
25. **Use `derive` for computed stats** — auto-computed, dependency-tracked, read-only. Don't recompute in multiple elements
26. **Use `dataSources` for reactive GET** — self-contained specs. `fetch` action for one-shot POST/PATCH/DELETE
27. **Use `repeat.groupBy` for grouped data** — client-side (`groupBy` field) or pre-grouped (`groupKey` + `groupItems`)
28. **Use templates for repetitive elements** — 7 identical columns become 7 one-liners with `$prop`
29. **Use AppSpec for multi-screen apps** — sidebar, navigation, shared state, tokens, translations all in JSON
30. **Table `mode: "server"` for large datasets** — writes sort/page to state, `dataSources` re-fetches
31. **`$group` only inside groupBy context** — throws error if used in regular elements
32. **`$selection` only inside repeat with selection** — throws error if used outside
33. **CSS hover for color/opacity, Motion hover for transforms** — automatic detection, no manual choice needed
34. **CSS hover only works on supported primitives** — `box`, `text`, `stack`, `grid`, `scroll`, `button`, `touchable`, `table`. Other types silently ignore className. `mythik validate` catches this
35. **Don't use `overflow: hidden` with `box-shadow` hover** — overflow clips the shadow. Use `filter: brightness()` or remove overflow
36. **Toasts render automatically** — `showNotification` writes to state, the renderer picks it up. No need to add a `toast-container` element unless you want custom positioning
37. **Device context is auto-tracked** — viewport, platform, orientation, OS color scheme write to `/ui/device/*` automatically. Use `$breakpoint` for responsive values, `$platform` for cross-platform branching, `$state` for orientation detection
38. **Use `forms` for coordinated validation** — form-level `isValid`, cross-field rules, submit gating. Use inline `checks` on inputs for standalone fields without form coordination
39. **Use `$auth` for user data, not `$state`** — `{ "$auth": "email" }` is safer (whitelisted fields only) and more stable than `{ "$state": "/auth/user/email" }`. `$auth` blocks access to tokens/passwords even if somehow in state
40. **Auth headers are auto-injected** — specs don't need to specify auth headers in `fetch`/`submitForm`. The framework injects Bearer tokens automatically for configured `authDomains`
41. **Login screen is a normal spec** — build login forms with regular primitives (input, button). The `login` action connects to the auth provider. No special components needed. Use `$bindState: "/login/username"` and `"/login/password"` for form fields. The `login` action receives `{ email: "$state /login/username", password: "$state /login/password" }`
42. **Never trust client auth as security** — `AppAuthConfig` is UX routing (hide screens by role), not server-side security. Always validate tokens on the backend
43. **Use `roleAccess` for centralized access control** — when defined, it's the sole source of truth. Roles not listed get zero access. `ScreenDefinition.roles` is only used when `roleAccess` is absent
44. **loginScreen is always accessible** — exempt from `protectedScreens`, even with `["*"]`. Prevents infinite redirect loops
45. **Sidebar auto-refreshes on auth changes** — `MythikApp` subscribes to `/auth/user/*` and `/auth/isAuthenticated` state changes and calls `refreshScreenList()` automatically. No manual call needed after login/logout
46. **Login screen renders fullscreen without layout** — `MythikApp` automatically renders the login screen WITHOUT the app layout (no sidebar, no header) when the user is not authenticated. After login, the full layout appears reactively. No `visible` conditions needed on the sidebar
47. **Logout clears login form automatically** — the `logout` action clears `/login/*` state before navigating to the login screen. Credentials never persist after logout. No `statePolicy: "reset"` needed on the login screen for this (though it doesn't hurt)
48. **Auth errors are silent in production** — auth action errors (login, logout, refreshSession) are logged to console only in development (`NODE_ENV !== 'production'`). In production, they're suppressed to prevent stack trace leakage to attackers. Errors still appear in the UI via `/auth/error` state
49. **Use `createAuthSpecStore` for authenticated spec loading** — when specs are served by a Mythik server with auth, use `createAuthSpecStore(API_URL)` from `mythik-react` instead of a plain specStore. It auto-injects Bearer tokens for protected screen loading. MythikApp syncs the token from AuthEngine automatically
50. **Input `type` not `inputType`** — the input primitive accepts `type: "password"`, not `inputType`. The CLI validates prop names and warns on unknown props with "did you mean?" suggestions (Levenshtein matching)
51. **Use `mythik push` for spec creation** — no seed scripts, no .ts spec files. Write JSON, push via CLI, modify with patches. All spec operations go through the CLI
52. **Use `uploadFile` for file uploads** — not custom `fetch` with FormData. The action handles validation, progress tracking, retry, and state management
53. **Set `accept` and `maxSize` on every file-upload** — framework defaults (10MB, any type) protect, but explicit is better for UX and security
54. **`autoUpload: true` (default) for simple cases, `false` for multi-field forms** — auto-upload sends files immediately on selection. Manual mode lets users select files first, then upload all together on form submit
55. **File URLs go to `target` path — don't read from `/ui/uploads/*`** — `/ui/uploads/{elementId}/files` is internal state for the primitive (progress, preview). The spec author reads the `target` path for the final URL(s)
56. **Auto-skeleton activates when spec has `fetch` in initialActions + loading + empty data** — zero config needed. Set `skeleton: false` on elements that show static content. Set `autoSkeleton={false}` on MythikRenderer to disable entirely
57. **Use `export` action for data downloads, not custom fetch** — format `"csv"` is always available (built-in). For `"xlsx"` or `"pdf"`, register an ExportAdapter via `exportAdapters` prop on MythikRenderer
58. **Export columns support formatting** — `format: "currency"` with `formatOptions: { currency: "USD", locale: "en-US", decimals: 2 }`. Same Intl formatters as `$format` expression handler
59. **Use `variant` prop for consistent component styling** — don't copy style objects between elements. Define variants in `tokens.components.{type}.{variant}` and reference with `"variant": "primary"`
60. **Element-level style/hover/active overrides variant** — variant is always the base. For one-off customizations, add explicit style/hover on the element. For reusable customizations, define a new variant
61. **Use `$path` references in variant definitions** — `$colors.primary` resolves against active tokens so dark mode works automatically. No need for separate dark variant definitions unless the dark change isn't just a token swap
62. **AppSpec patches use `/layout/elements/` not `/elements/`** — Screen spec elements are at `/elements/{id}`. AppSpec layout elements are at `/layout/elements/{id}`. Use dot-notation with `mythik elements` for inspecting non-element sections (tokens, screens, etc.)
63. **AppSpec is filtered without Bearer token** — `GET /api/app/:id` strips `roleAccess` and `protectedScreens` from the response when no valid Bearer token is present. This prevents information disclosure of the authorization model. With a valid Bearer, the full AppSpec is returned. The endpoint never returns 401 — only the payload changes
64. **CLI warns on unknown prop names** — `mythik push` and `mythik validate` check prop names against known schemas for all 38 primitives. Unknown props generate warnings (not errors) with Levenshtein suggestions: `⚠ unknown prop "inputType" for type "input" — did you mean "type"?`. Warnings don't block saves
65. **Use `audit` config for automatic change tracking** — endpoint-level config that auto-injects username and timestamp into CRUD INSERT and UPDATE operations. Column names are configurable per table. All fields are optional — only configured fields are injected. Audit values override client-sent values (prevents spoofing)
66. **Audit `timezone` for correct local timestamps** — set `"timezone": "America/El_Salvador"` (IANA string) in audit config. Without timezone, timestamps are UTC. Use timezone when the database stores local time. The framework converts using `Intl.DateTimeFormat` — works regardless of server location
67. **CRUD queries are dialect-aware** — Generated CRUD routes compile through the active SQL driver. SQL Server uses trigger-safe identity retrieval; PostgreSQL/SQLite use `RETURNING` where available; MySQL uses the driver insert id path and targets MySQL 8.0.19+ for generated upsert SQL. Custom SQL remains dialect-native and is not translated between databases.
68. **CustomJWTProvider maps response paths explicitly** — `tokenPath`, `refreshTokenPath`, and `userPath` are dot paths against the full login/refresh response. `rolePath` and `rolesPath` are compat dual: plain keys (`"role"`, `"roles"`) resolve inside the extracted user object, dotted paths (`"user.role"`, `"data.user.role"`) resolve against the full response. If no role/roles are found, `defaultRole` is used and development logs a warning. HTTP errors read `response.error.message` first, then `response.message`
69. **ApiSpec is pure declarative — no connection, no secrets** — `createServer` receives database connection and JWT secret in `MythikServerConfig`, not in the ApiSpec. The ApiSpec only contains endpoints, catalogs, auth model (provider, policies, scopeFilter), and audit config. This allows the ApiSpec to be stored safely in the database
70. **Server loads api-spec from SpecStore** — `createServer({ spec: { store: myStore, id: 'my-api' }, database: {...}, auth: {...} })`. Supports three modes: file path (string), ApiSpec object (testing), or `{ store, id }` (database). The server never owns a SpecStore — the caller provides one
71. **SpecStore table is configurable** — Generic SQL stores use `new SqlSpecStore({ driver, table: 'api_specs' })` from `mythik/server`; Supabase uses `new SupabaseSpecStore({ ..., table: 'api_specs' })` from `mythik`. Default: `'screens'`. Enables separate tables for frontend specs and backend specs with different DB permissions.
72. **Api-specs are never served to the browser** — `GET /api/screens/:id` and `GET /api/app/:id` return 404 for documents with `type: "api"`. Prevents information disclosure of table names, SQL queries, and auth config
73. **CLI operates on api-specs automatically** — `mythik validate my-api`, `mythik pull my-api`, `mythik push my-api` detect `type: "api"` and use the apiHandler. Manifest shows catalogs, endpoints, auth config. Elements support dot-notation: `mythik elements my-api endpoints.records-crud`
74. **Use `mythik contract` for frontend↔backend validation** — `mythik contract --app app-demo --api records-api`. Cross-validates screen fetch URLs against api-spec endpoints. Supports multiple api-specs (comma-separated). Use `--api-table` when api-specs are in a separate table. Use `--base-url` to strip host from URLs. Use `--json` for CI/CD integration
75. **Contract validates 4 rules** — (1) endpoints-exist: fetch URLs must match api-spec endpoints/catalogs (error). (2) fields-valid: POST/PUT body fields must be in CRUD insertable/updatable (error). (3) params-match: query params must match endpoint param definitions (warning). (4) permissions-consistent: UI roleAccess must be consistent with API policies (warning). All rules include Levenshtein "did you mean?" suggestions
76. **Contract permission check is unique** — no other framework can detect "Role X can access screen Y but API denies the action." This is only possible because both frontend (roleAccess) and backend (policies) are declarative JSON that can be cross-referenced statically. In code-based systems, UI visibility and API permissions live in separate layers
77. **Input `on.submit` fires on Enter key** — add `on: { submit: { action: "login", params: {...} } }` to an input element. Pressing Enter triggers the action. Use for login forms and search fields
78. **`_motion.whileTap` and `_motion.whileHover` work in specs** — Motion animations from `_motion` now forward `whileTap` and `whileHover` to Framer Motion. Use `"Infinity"` (string) for `repeat` in JSON — the renderer converts it to JS `Infinity` automatically. Enables infinite looping animations declared in specs
79. **Contract deduplicates findings** — identical findings (same rule + screen + level + message) are collapsed into one with a `count` field. CLI shows `(×N)` when count > 1. Prevents noise from repeated fetch references to the same missing endpoint
80. **Contract handles template domain URLs** — fetch URLs like `http://${authDomain}/api/items` are normalized to `/api/items` before matching. The extractor detects `http(s)://:param/path` patterns after template replacement and strips the domain portion. Works with any variable name and optional port
81. **Contract --base-url is explicit only** — there is no auto-detection from authDomains. If screen specs use absolute URLs and no `--base-url` is provided, the engine emits a warning: "Absolute URLs detected... Use: mythik contract --base-url http://your-server:port". Template domain URLs (containing `${`) do not trigger this warning since they're already normalized
82. **VersionedSpecStore extends SpecStore** — adds `saveVersion(id, doc, meta)`, `loadVersion(id, version)`, `listVersions(id, limit?)`, `currentVersion(id)`. Backward compatible — `load(id)` still returns the current spec. Versioning is opt-in; existing code works without changes
83. **Version history uses patch-chain with snapshots** — v1 stores the full spec. Subsequent versions store RFC 6902 patches. Every N versions (configurable, default 10) a full snapshot is stored. Reconstructing version X = nearest snapshot + apply patches. `computePatches(before, after)` generates patches; `applyPatches` (existing) applies them
84. **EnvironmentStore manages version pointers** — environments (dev, uat, prod, any custom name) are pointers to versions: `{ name, version, promotedAt, promotedBy }`. Created on-demand. `setEnvironment(specId, env, version, author)` creates or moves a pointer. Loading by environment = resolve pointer → loadVersion
85. **Structural diff is semantic with before/after values** — `computeStructuralDiff(before, after)` produces `StructuralChange[]` with kinds: element-added, element-removed, prop-changed, action-changed, section-changed. Type-aware: screen specs diff elements/props, api specs diff endpoints/catalogs at item level, app specs diff navigation/tokens. Shows actual values: `prop content: "Send" → "Submit"`, `orderBy: added "year DESC"`, `orderBy: removed (was "year DESC")`. Summary: `+2 elements, ~3 changes, -1 element`
86. **Promote gate validates across environments before moving pointers** — `runPromoteGate({ specIds, fromEnv, toEnv, store, envStore, apiIds? })` runs 3 validation layers: (1) spec validation — structural rules, always available; (2) cross-screen consistency — referenced screens exist in destination or batch, always available; (3) contract validation — against target env api-spec, only when `--api` provided. Supports individual, app-complete, and batch-selective modes. Atomic: all specs pass or none are promoted
87. **Promote uses batch-aware contract validation** — when an api-spec is in the promote batch, contract validation runs against the batch version (source env), not the destination version. This prevents false alarms when promoting screens + updated api-spec together. When api-spec is NOT in batch, validates against destination env version
88. **Rollback creates new version, never rewrites history** — `executeRollback(specId, toVersion)` creates vN+1 with the content of the target version. All intermediate versions are preserved. Impact analysis shows lost changes with author attribution and affected environments. Moving an environment pointer is a separate operation via `envs --set`
89. **Lazy bootstrap for existing specs** — first versioned save on an existing spec with no history automatically creates v1 (snapshot of current spec), then saves the change as v2. No migration script needed. Specs without history continue working via base `SpecStore.load()`
90. **Use `navigateScreen` and `goBackScreen` in specs** — `navigateScreen` and `goBackScreen` are registered by MythikApp and call the AppEngine directly. The built-in `navigate` and `goBack` only set state intents. Always use `navigateScreen`/`goBackScreen` in specs for navigation that works. Example: `{ "action": "goBackScreen" }` goes back to the previous screen in the navigation history, regardless of which screen navigated to the current one
91. **CLI `--table` flag overrides the current spec table** — all commands accept `--table <name>` to read/write from a different base table. Use `--table api_specs` to operate on api-specs. The flag overrides the base table for Supabase, SQL Server, PostgreSQL, MySQL, and SQLite stores. Version and environment tables are configured separately with `MYTHIK_VERSIONS_TABLE`, `MYTHIK_ENVIRONMENTS_TABLE`, or the equivalent `.mythikrc` SQL settings.
92. **`push` and `patch` version automatically with `--author`** — when `--author` is provided, both commands use `VersionedSpecStore.saveVersion()` instead of `SpecStore.save()`. The version includes author, source type (`push`/`patch`), and optional `--description`. Without `--author`, commands work as before (no versioning). Example: `mythik patch screen-id --author alice --description "Fixed layout"`
93. **`mythik history` shows inline diffs** — each version in the history output shows the actual changes (before/after values), not just a summary. Uses `computeStructuralDiff` between consecutive versions. Example output: `~ element "btn" prop content: "Send" → "Submit"`
95. **`ai-context.md` is the AI-optimized spec reference** — compressed from this reference-doc (1145 lines vs 2658). Use ai-context.md for spec generation, reference-doc for full human reference. Validated via agent-based testing with progressive difficulty levels (L1-L4). Test scenarios in `../ai-context-test-scenarios.md`, results in `../ai-context-test-results.md` (framework-dev, not part of consumer publish surface)

94. **Generic SQL versioned stores are available** — `resolveVersionedStore` supports `sqlserver`, `postgres`, `mysql`, and `sqlite` store types. It creates a driver-backed `SqlVersionedSpecStore` (specs + version history) plus `SqlEnvironmentStore` (environment pointers). Requires `screens`, `screen_versions`, and `screen_environments`; initialize with `mythik init-store` or apply the DDL from `mythik init-store --dry-run`.
96. **SupabaseVersionedSpecStore available** — `resolveVersionedStore` supports `supabase` store type. Uses PostgREST REST API (no `@supabase/supabase-js` dependency). Same snapshot+patches pattern as SqlServer. Environment upsert uses `on_conflict=screen_id,environment` for PostgREST compatibility. Requires `screen_versions` and `screen_environments` tables created in Supabase dashboard
97. **`variant` is a universal prop** — any primitive can use `variant` when component variants are defined in `tokens.components.{type}.{variant}`. The validator accepts `variant` on all primitives (via `COMMON_PROPS`). The render engine resolves variants before passing props to the primitive
98. **Use DNA seeds for app identity** — define `tokens.dna` in AppSpec with 1-8 seed values. The framework derives all visual tokens (colors via OKLCH tonal palette, shape, typography, spacing, elevation, motion, opacity) plus auto dark mode. No manual color palette or radius scale needed — DNA generates it from `{ "primary": "#0D9488" }`
99. **Three-layer token resolution** — Framework DEFAULTS (always present) → DNA derivation (if `dna` seed exists) → Manual overrides (explicit `tokens.*` values always win). Specs without tokens use defaults. Specs with only DNA get full derived identity. Specs with DNA + overrides get derived base with surgical customization
100. **`$token` auto-converts elevation to CSS** — `{ "$token": "elevation.md" }` returns a CSS `boxShadow` string on web (e.g., `"0px 4px 12px rgba(0,0,0,0.15)"`). On RN, primitives handle elevation internally via native shadow props. No manual conversion needed
101. **`updateTokens` for runtime token changes** — `{ "action": "updateTokens", "params": { "dna": { "primary": "#F97316" } } }` hot-swaps all tokens without page reload. All primitives re-render with new values. Numeric DNA seeds > 1 are auto-normalized during DNA derivation (divided by 100 for 0-100 legacy/slider compatibility)
102. **Font loading is the project's responsibility** — DNA derives font family names (Inter, DM Sans, Playfair Display, Georgia, Source Sans) but does NOT load them. Web: include Google Fonts link or `@font-face`. RN: use `expo-font`. Without loading, browser falls back to system fonts
103. **`useDesignTokens` replaces `useThemeColors` in primitives** — all 35 migrated primitives (18 web + 17 RN) use `useDesignTokens` internally. It extracts colors, shape, typography, spacing, elevation, motion, and opacity with framework defaults as fallback. `useThemeColors` is deprecated but still works as wrapper
104. **`mythik tokens` inspects DNA derivation** — `mythik tokens --dna '{"primary":"#0D9488"}' --json` shows the full resolved token set. Use for debugging and verifying what DNA generates before applying to a spec
105. **Formality drives 5 font tiers + continuous properties** — Body: Inter (0) → Space Grotesk (0.25) → Source Sans 3 (0.5) → Lora (0.75) → Merriweather (1.0). Heading: Inter → Space Grotesk → DM Sans → Lora → Playfair Display. Font names include CSS fallbacks (e.g., `'Inter', sans-serif`). Additionally, formality continuously varies `letterSpacing` (0 → 0.03em), `headingLetterSpacing` (0 → -0.02em), `lineHeight` ratio (1.45 → 1.6), and bold weight (700 → 800)
106. **Neutral palette is visually distinct per mode** — `warm` uses amber hue (55°), `cool` uses blue (250°), `natural` uses primary hue. Chroma is 0.025 (natural) / 0.035 (warm/cool) — strong enough to be visible in backgrounds, borders, and surfaces
107. **`Element.key` forces remount on value change** — Add `key` to any element with a dynamic expression (e.g., `{ "$template": "preview-${/internal/tokenVersion}" }`). When the resolved value changes, React unmounts and remounts the element, re-triggering mount animations. Used by DNA Playground to re-animate preview on Apply DNA
108. **Input supports `type: "color"`** — Renders native OS color picker. Use with `$bindState` for interactive color selection in specs
109. **Slider label is display-only** — The slider primitive renders the `label` prop as-is without appending the current value. Use `$template` in the label to include the value if desired (e.g., `"label": { "$template": "Roundness: ${/dna/roundness}%" }`)
110. **`--author` activates CLI versioning** — `mythik push` and `mythik patch` without `--author` write directly to the `screens` table with NO version history. With `--author ai-agent`, they use `VersionedSpecStore` which writes to both `screens` AND `screen_versions`, enabling `history`, `diff`, and `rollback` commands. Always use `--author` during development
111. **Identity System — `tokens.identity` controls visual identity beyond DNA** — DNA controls continuous/color values. Identity controls categorical dimensions: `surface` (how containers render), `radiusPattern` (corner shape), `typographyHierarchy` (heading scale), `labelStyle` (label formatting), `textDecoration` (heading decoration), `depth` (shadow intensity 0-1), `shadowAngle` (shadow direction 0-360°), `colorScheme` (light/dark/colored polarity), `colorWeight` (where color appears), `accentApplication` (where accent appears). Set via `tokens.identity` in AppSpec or screen Spec. Lint validates deep identity enum/range values; for example use `colorScheme: "light-surface"`, not `"light"`
112. **Surface Treatment — 6 types transform all containers** — `identity.surface`: `elevated` (shadow+border, material), `flat` (color blocks only, no borders/shadows), `outlined` (borders only, transparent bg, Linear-like), `glass` (backdrop-filter blur, semi-transparent), `bold` (thick 2-3px borders, brutalist), `neo` (neumorphic inset+outset shadows). Every input, button, card, modal, select, textarea, checkbox, accordion, table adapts automatically
113. **Surface styles are explicit — every property set, no implicit values** — All 6 surface types define `border` and `boxShadow` explicitly for every component category. Properties are `'none'` when not used, never omitted. This prevents browser defaults from showing (e.g., native button borders in flat mode)
114. **`resolveSurfaceStyles()` returns structured platform-neutral objects** — Returns `StructuredSurfaceStyles` with 6 component categories: `card`, `input`, `inputFocus`, `buttonPrimary`, `buttonSecondary`, `modal`. Each is a `StructuredSurfaceStyleProps` with `backgroundColor?`, `color?`, `border?: BorderDef`, `borderTop/Right/Bottom/Left?: BorderDef`, `shadows: ShadowDef[]`, `blur?: BlurDef`, `backgroundOpacity?`. NO CSS strings — data only. Platform serializers convert: `surfaceToCSS()` for web (React/Vue/Angular/Svelte), `surfaceToRN()` for React Native. Core stays platform-neutral
115. **Surface-aware focus per surface type** — `inputFocus` in SurfaceStyles. Elevated/outlined: 1px border primary + ring. Flat: no border, ring only. Bold: 2px border primary + ring (preserves thickness). Neo: primary-tinted inset shadow + ring. Glass: semi-transparent primary border + ring. Primitives use `t.surface.inputFocus` instead of hardcoded focus styles
116. **Box primitive gains `surface` prop** — `{ "type": "box", "props": { "surface": "card" } }` applies identity surface styles (border, shadow, bg, borderRadius). Without `surface` prop, box renders as plain layout div. Use `surface="card"` for card-like containers, `surface="modal"` for overlay panels. AI should mark card-like boxes with this prop
117. **Select dropdown uses `surface.modal` not `surface.card`** — Dropdowns are overlays that need opaque backgrounds for readability. In outlined mode, `card` has transparent bg which breaks dropdowns. Modal always has solid bg regardless of surface type
118. **Flat inputs differentiate by background color, not borders** — Flat spec: "NO borders, differentiation through background color blocks only." Inputs and buttonSecondary use `colors.background` (#f8fafc off-white) instead of `colors.surface` (#ffffff) to remain visible without borders
119. **Radius Pattern — 11 asymmetric corner options** — `identity.radiusPattern`: `all` (default), `top`, `bottom`, `left`, `right`, `diagonal` (TL+BR), `inverse-diagonal` (TR+BL), `single` (TL only), `single-tr`, `single-bl`, `single-br`. Applied via `t.radius(baseValue)` helper in all primitives. `resolveRadiusPattern()` converts to CSS border-radius string
120. **Typography Hierarchy — 6 heading scales** — `identity.typographyHierarchy`: `dramatic` (3×, 800w), `uniform` (1.3×, 600w — Notion-like), `editorial` (2.2×, 700w, -0.02em tracking), `display` (4×, 900w, -0.03em — magazine hero), `mono` (1.5×, monospace font), `contrast` (2.5×, 300w ultra-thin — luxury/Apple). Applied to `<Text variant="heading">`
121. **Label Style — 3 modes on all form labels** — `identity.labelStyle`: `normal`, `uppercase` (textTransform + letterSpacing 0.08em), `accent-colored` (label text in accent color). Applied to labels inside input, textarea, select, and checkbox primitives — not just `<Text variant="label">`
122. **Text Decoration — 6 heading effects, multi-select** — `identity.textDecoration`: `stroke` (webkit-text-stroke), `underline-accent` (3px bottom border, accent color), `highlight` (accent bg tint behind text), `overline` (3px top border), `shadow` (3px hard offset, no alpha — solid accent). Supports array for combinations: `["underline-accent", "shadow"]`. `resolveTextDecorations()` merges styles from all selected decorations
123. **Custom checkbox is surface-aware** — Replaced native `<input type="checkbox">` with custom div+SVG. Unchecked: uses `t.surface.input` styles. Checked: fills with primary, preserves surface border (bold keeps 2px, neo keeps shadow). Focus uses `t.surface.inputFocus`. Hidden input preserved for accessibility
124. **Elevation and border resolvers ready but not yet consumed** — `resolveElevationStyle()` (diffuse/solid/color/none) and `resolveBorderStyle()` defined, tested, exported, values in `t.identity.*`. Primitives don't consume them yet — reserved for future phases when elevation identity overrides surface defaults
125. **`colors.background` is the STATIC base page background** — Distinct from `colors.surface` (card/component bg). Returns `#f8fafc` light gray (or dark-mode equivalent via `/preferences/theme`), but does NOT respond to preset `identity.colorScheme` changes. Safe for light-only apps. For preset-aware layouts (apps that support dark-surface or colored-surface presets), use `backgroundCSS` instead — see rule 155. Visible failure mode: dark preset with layout using `colors.background` produces a light frame around dark content
126. **`updateTokens` does deep merge — partial updates work** — Calling `updateTokens({ dna: { roundness: 0.5 } })` merges with previously-applied tokens instead of replacing them. Previous primary color, surface settings, etc. persist. Enables live playground controls where each slider updates only its dimension. Legacy 0-100 values are tolerated by runtime normalization, but generated specs should use canonical 0-1 values.
127. **`deepMergeTokens` exported from core** — `import { deepMergeTokens } from 'mythik'`. Recursively merges objects (arrays and non-objects replace, objects deep-merge). Used internally by `updateTokens`
128. **Depth and angle are serializer concerns, not data concerns** — `identity.depth` (0-1) and `identity.shadowAngle` (0-360°) are NOT in `StructuredSurfaceStyleProps`. Shadows store raw `magnitude`/`blur`/`opacity`. The serializer (`surfaceToCSS`/`surfaceToRN`) applies `depthScale()` and sin/cos angle rotation when converting to platform-specific format. This keeps the structured data pure and reusable
129. **`resolveIdentity<T>()` — unified orchestrator** — Single function in core orchestrates: resolveSchemeColors → generateTonalStep → resolveSurfaceStyles → serializer(T) → resolveColorWeight → resolveRadiusPattern. Accepts a `SurfaceSerializer<T>` function — each platform passes its own (surfaceToCSS, surfaceToRN). Returns `{ schemeColors, surface: T, colorWeight, radius }`. Web/RN hooks call this one function instead of 6+ manual steps
130. **Color Scheme — surface polarity with configurable layers** — `identity.colorScheme`: `light-surface` (default, pass-through), `dark-surface` (uses `modes.dark` from DNA), `colored-surface` (3 configurable tonal layers from primary palette). `colored-surface` uses `identity.coloredSurfaceLayers: { background: 25, surface: 45, primitive: 65 }` — tonal steps from the primary OKLCH palette. `generateTonalStep()` produces colors at any step 0-100. Default 25/45/65 validated across 8 hues. Focus ring uses accent (not primary) in colored-surface to avoid invisible ring on primary background
131. **`t.colors` stays original palette, scheme only affects surfaces** — `t.colors.text` always returns the original light palette text color. Surface styles (`t.surface.card`, etc.) use scheme-adjusted colors internally. This separation ensures UI controls (selects, labels) remain readable while the preview/app content adapts to the scheme. Preview elements use `$token: schemeColors.*` for scheme-aware text
132. **Glass fix — derives rgba from actual surface color** — `hexToRgba(c.surface, opacity)` replaces hardcoded `rgba(255,255,255,...)`. Dark scheme + glass = semi-transparent dark, not semi-transparent white. All glass card, input, button, modal use `hexToRgba` for background and border
133. **Color Weight — WHERE color appears in layout** — `identity.colorWeight`: `monochrome` (all neutral), `branded-nav` (primary navbar, white text), `gradient-hero` (primary→accent gradient hero section), `ambient` (subtle primary tint on sections via rgba), `dark-native` (dark nav using modes.dark). `resolveColorWeight()` returns `{ navBg, navText, sectionBg, heroBg, heroGradient }`. Layout tokens available via `$token: colorWeight.navBg`
134. **Accent Application — where accent color appears** — `identity.accentApplication`: `buttons` (boolean — buttonPrimary uses accent), `navItems` (boolean — highlight active nav), `cardLine` (array of positions — accent border on cards), `links` (boolean — link color), `backgrounds` (boolean — section bg uses accentLight), `iconContainers` (boolean). `cardLine` supports multi-select: `["top", "left"]` for L-shape accent border. Applied inside `resolveSurfaceStyles` via `SurfaceOptions.accent/cardLine/accentButtons`
135. **Surface styles include color: c.text for CSS inheritance** — All 6 surface types set `color: c.text` on card, input, and modal categories. Child primitives use `color: 'inherit'` to pick up the parent's scheme-adjusted color. This makes dark/colored surface text automatically correct via CSS inheritance
136. **Text/Input/Select/Textarea/Checkbox primitives use `color: 'inherit'`** — These primitives no longer hardcode `t.colors.text`. They inherit text color from their parent container's surface style. Standalone usage inherits from body/page default color. Surface containers (Box, Accordion, Modal) set the correct color
137. **`injectColorTokens` in factory.ts** — After `resolveDeepTokens`, the factory computes `colorWeight` and `schemeColors` and injects them into the resolved token tree. This makes `$token: "colorWeight.navBg"` and `$token: "schemeColors.text"` available in specs
138. **colorWeight always returns heroBg + heroGradient** — Non-gradient modes return `'transparent'`/`'none'` instead of undefined. Prevents $token resolution errors when specs reference `colorWeight.heroGradient` regardless of active weight mode
139. **`surfaceToCSS` emits `border: 'none'` explicitly** — When a surface has no border (flat, neo, glass buttons), the CSS serializer outputs `border: 'none'` instead of omitting the property. This resets browser defaults (native inputs have 2px inset border). Without explicit 'none', flat/neo inputs show unwanted browser borders
140. **`inputFocus` has NO backgroundColor** — Focus styles only contain border and shadow changes, never backgroundColor. If inputFocus included backgroundColor, it would overwrite the checkbox's primary bg when checked+focused, making the white checkmark invisible on white background
141. **BlurView support in React Native** — When `surface === 'glass'`, the RN serializer passes `blur: { radius }` through to surface props. RN primitives (accordion, input, modal, select, textarea) detect blur and wrap content in `<BlurView>` from `expo-blur`. `toViewStyle()` helper strips `blur` and `focusRing` from surface props before spreading into RN style objects
142. **Glass border uses semi-transparent rgba** — Glass surface borders use `hexToRgba(c.surface, 0.2)` for cards/modal/secondary and `hexToRgba(c.surface, 0.15)` for inputs. NOT opaque surface color. Glass inputFocus border uses `c.primary + '80'` (50% opacity hex suffix)
143. **Identity icons — weight default + container from tokens** — `identity.icons.weight` applies as default on all icon primitives. Spec `weight` prop overrides. `identity.icons.container` ('none'|'circle'|'square'|'rounded-square') auto-wraps icons with colored background. `container={false}` in spec suppresses. `containerColor`: 'primary'|'accent'|'muted'|'surface'
144. **Identity images — corners, overlay, border from tokens** — `identity.images.corners` applies as default borderRadius ('match-card' uses card radius, 'circle'=50%, 'square'=0, 'rounded'=8px). `identity.images.overlay` adds gradient-bottom or color-tint overlay div. `identity.images.border` adds 1px border. Spec `style.borderRadius` or `overlay="none"` overrides
145. **Gradient text on headings** — `identity.gradients.text = true` applies `background-clip: text` with primary→accent gradient on all `<Text variant="heading">`. Spec `style.color` overrides (gradient deactivates when explicit color set). Web-only (RN deferred — requires expo-linear-gradient)
146. **Gradient buttons** — `identity.gradients.buttons = true` applies `linear-gradient(135deg, primary, accent)` on primary buttons. Spec `style.background` overrides. Web-only (RN deferred)
147. **Background treatment — LayerBackground v2** — `identity.background` is `{ color?: string, layers?: LayerConfig[] }` consumed by `<BackgroundStack>` mounted at the root of `MythikRenderer` when present. Layer kinds: `'solid' | 'gradient' | 'pattern' | 'grain' | 'image' | 'blobs'`, each carrying `LayerCommonProps` (`opacity?`, `blendMode?`, `zIndex?`). `resolveBackgroundLayers(bg)` → `LayerSpec[]` → `<BackgroundLayer>` per kind. Blob layers route to `<BlobLayer>` when palette is available. Legacy `resolveBackgroundCSS`, `resolveBlobStyles`, `BackgroundConfig`, `BlobStyle`, and `tokens.backgroundCSS` are not part of the public contract.
148. **Blob layer v2 — preset + explicit forms, motion dimensions** — `BlobV2Config` carries `preset: 'organic-duo'|'organic-trio'|'circle-pair'` + `palette: Array<'primary'|'accent'|hex>` + `motion: 'drift-gentle'|'drift-fluid'|'drift-snappy'|'static'` for framework-curated compositions, OR `blobs: BlobInstance[]` for explicit declarations. Each `BlobInstance` carries `shape` (6 curated + `'custom-svg'` with `path`+`viewBox`), `position`, `size`, `color`, optional `opacity`/`blur`/`rotation`/`motion`. Motion breaks into three independently composable dimensions (`drift`, `rotate`, `scale`) that `resolveBlobLayer` converts to `ElementAnimations.ambient` arrays. `useShapeAnimations` (web: CSSOM keyframes singleton; RN: Reanimated `useAnimatedProps` + `HARD_PER_TRIGGER` SV pool) drives them at render time
149. **Coordinated page entrance** — do not emit legacy `identity.motionEntrance` or `identity.motionHover`. Entrance animations live in the animation engine: app-wide defaults use `tokens.identity.animations.mount`, while template-level and element-level overrides use `animations.mount` with a recipe reference (e.g., `{ mount: { recipe: 'fade-up' } }`). See rules 180-193 for the engine.
150. **Gradient interpolation in OKLCH** — All gradient text and gradient buttons use `linear-gradient(in oklch, ...)` for vibrant transitions. sRGB interpolation crosses through desaturated midpoints (purple→gold becomes muddy brown); OKLCH maintains saturation through the hue arc. Graceful degradation on older browsers
151. **Gradient modes: vibrant, soft, muted** — `identity.gradients.text`, `identity.gradients.buttons`, and `identity.gradients.cards` accept `boolean | 'vibrant' | 'soft' | 'muted'`. For text and buttons: Vibrant = OKLCH primary→accent. Soft = OKLCH primaryLight→accentLight (subtle). Muted = sRGB primary→accent (desaturated center, luxury/editorial aesthetic). For cards: Vibrant = 33% primary alpha (dramatic). Muted = 20% primary alpha (balanced default). Soft = 8% primary alpha (subtle kiss). `true` maps to vibrant for text/buttons, muted for cards
152. **Explicit accent hex preserved as-is** — When `dna.accent` is set explicitly, `deriveDna` uses the exact hex for `colors.accent` instead of passing through `generateTonalPalette` step 60. The palette is still generated (for `accentLight`), but the primary accent color is the user's exact choice
153. **`setIconRenderer` replaces `overridePrimitive` for icons** — `plugins.setIconRenderer(Component)` registers a custom icon renderer. The framework's `icon.tsx` handles identity wrapping (container, weight default) while the registered component renders the actual icon. `overridePrimitive('icon', ...)` still works but bypasses identity features
154. **Do not emit Box `backgroundBlobs`** — Box `backgroundBlobs` and legacy per-element blob rendering are not part of the public primitive contract. App-level background lives exclusively at `tokens.identity.background` (rule 147) and mounts at MythikRenderer via `<BackgroundStack>`. Box is a pure surface-styled wrapper; primitives do not rely on `dangerouslySetInnerHTML` for keyframe injection.
155. **Do not emit `$token: "backgroundCSS"`** — `$token: "backgroundCSS"` does not resolve. For preset-aware app backgrounds, set `tokens.identity.background` as a LayerBackground (rule 147) — presets update that field directly so the root `<BackgroundStack>` re-resolves on preset switch. No token alias indirection needed.
156. **Accordion `badge` prop** — `accordion` accepts optional `badge` prop (`string | number | boolean`). Renders as: solid 8px primary-colored dot for `true`, pill with text/number for string/number values. Hidden when `false`, `0`, `undefined`, or `''`. Use with `$state` for reactive indicators: `"badge": { "$state": "/modified/mySection" }`
157. **`updateTokens` `_replace` flag** — Pass `{ _replace: true, dna: {...}, identity: {...} }` to bypass `deepMergeTokens` and fully replace accumulated token state. Without `_replace`, each `updateTokens` call deep-merges onto previous values. Use `_replace` for reset-to-defaults scenarios where accumulated overrides must be cleared entirely
158. **`/tokens/raw` state path** — After every `updateTokens` call, the framework persists `currentRawTokens` to `/tokens/raw` in the state store. This is the accumulated raw input (pre-normalization), useful for exporting the current DNA+Identity configuration. Read via `{ "$state": "/tokens/raw" }`
159. **`copyToClipboard` stringifies objects** — The `copyToClipboard` action auto-stringifies object values with `JSON.stringify(value, null, 2)` before writing to `/ui/clipboard`. String and number values pass through as-is. The React renderer watches `/ui/clipboard` and calls `navigator.clipboard.writeText()` automatically
160. **Identity module structure** — Identity system split into `packages/core/src/design/identity/` with 8 focused modules: `types.ts` (all types/interfaces), `surface.ts` (6 surface variants), `shape.ts` (radius/border), `elevation.ts` (depth/shadow), `typography.ts` (hierarchy/decoration/labels), `color.ts` (scheme/weight/hexToRgba), `background.ts` (CSS/blobs), `motion.ts` (entrance). Barrel `index.ts` re-exports all public API. Internal helpers (`sh`, `neoShadows`, `seededRandom`, etc.) are module-private
161. **Border & elevation identity override** — `identity.borderWidth`, `borderStyle`, `borderColor`, `elevationStyle`, `elevationColor` override surface-produced borders/shadows via `applyBorderElevationCSS` (web) and `applyBorderElevationRN` (RN). Override is gated by two independent boolean flags: `overrideSurfaceBorders` (card+modal) and `overrideInputButtons` (input+buttonPrimary+buttonSecondary). Both default `false` — surface type controls everything until explicitly enabled. `inputFocus` is never overridden (accessibility). `borderColor` is semantic: `'neutral'|'primary'|'accent'|'text'` → resolved to hex via schemeColors. `elevationColor`: `'dark'|'primary'|'accent'` → resolved to hex (`dark`=#000000)
162. **Elevation styles** — `elevationStyle` controls shadow rendering: `'none'` (no shadow), `'diffuse'` (soft blur shadow, rgba), `'solid'` (no-blur offset shadow, direct color — comic book style), `'color'` (blur shadow using elevationColor in rgba). Shadow angle decomposed via sin/cos matching the surface serializer's `shadowToCSS` pattern. `depthScale()` modulates intensity
163. **deepResolve composes objects from multiple $state paths** — Action params and element props support nested objects where each value is a `$state` expression: `{ "dna": { "$state": "/dna" }, "identity": { "$state": "/identity" } }` → resolved to `{ dna: {...}, identity: {...} }`. Works in action params via `deepResolve` in dispatcher.ts and in element props via the unified deep resolver (`resolveDeep`) in engine.ts. No `$object` expression handler needed
164. **Primary color preserved as-is** — `deriveDna` uses `seed.primary` directly as `colors.primary` (the exact hex the user chose). Variants derived via relative OKLCH lightness: `primaryLight` = L+15%, `primaryDark` = L-20%. Tonal palette still generated for dark mode (step 80) and neutrals. Previously, palette step 60 was used, which destroyed naturally light colors (amber L=77% → brown L=60%)
165. **headingColor** — `identity.headingColor` (`'default'|'primary'|'accent'|'primary-dark'`) controls heading text color. `'default'` = inherit from container. Resolves to scheme colors. Gradient text (`identity.gradients.text`) takes precedence when active. Priority: `style.color > gradient > headingColor > inherit`. Applied in text.tsx for web and RN
166. **Object composition in expressions already works** — Plain objects with `$state` children resolve recursively in both action params and element props. The framework walks the object tree: if a key starts with `$` and has a handler → resolve as expression; otherwise recurse into values. This means `{ "user": { "$state": "/user" }, "prefs": { "$state": "/prefs" } }` resolves without any `$object` handler
167. **Presets system** — `PresetDefinition` interface in core defines the contract for curated DNA+Identity snapshots. `plugins.registerPresets(presets)` stores them, writes `/presets/available` to state (array of `{ value, label }` for dropdown consumption), and auto-registers `applyPreset` action. Framework provides tools (contract, registration, application); preset definitions live outside core. Architectural principle: framework provides tools, not opinions
168. **applyPreset action** — Takes `{ preset: string }` param. Looks up registered preset by ID, calls `updateTokens({ _replace: true, dna, identity })`. `'custom'` is a silent no-op (not a real preset). Unknown IDs throw. `_replace: true` ensures zero stale flags between preset switches (addresses the override flag footgun where forgetting `overrideSurfaceBorders: true` would silently ignore border values)
169. **Preset dropdown pattern** — Use `$bindState` on the select's `value` prop (not `$state`) for two-way binding. `on:change` reads the already-written value via `$state`. Do NOT use `$event` in action params — `$event` is not a supported expression handler. Pattern: `"value": { "$bindState": "/ui/currentPreset" }` + `"on": { "change": [{ "action": "applyPreset", "params": { "preset": { "$state": "/ui/currentPreset" } } }] }`
170. **Custom detection in presets** — Every control that modifies tokens should include `{ "action": "setState", "params": { "statePath": "/ui/currentPreset", "value": "custom" } }` in its `on:change` array. This switches the preset dropdown back to "Custom" when any individual value is modified after applying a preset

---

## Authentication

### AppSpec Auth Config

```json
{
  "navigation": {
    "auth": {
      "provider": "supabase",
      "loginScreen": "login",
      "protectedScreens": ["*"],
      "roleAccess": {
        "admin": ["*"],
        "viewer": ["dashboard", "reports"]
      },
      "persistence": "local",
      "tokenRefresh": true,
      "authDomains": ["myproject.supabase.co"],
      "sessionExpiredMessage": "Your session expired, please sign in again"
    }
  }
}
```

**`authDomains` matcher behavior:** the matcher compares the URL's hostname only — the port is stripped. `"myproject.supabase.co"` matches requests to that hostname on any port. In dev, use `["localhost"]` (NOT `["localhost:5173"]`) — the port in the entry never matches because URL hostnames never contain ports. Subdomain matching is also supported: `"example.com"` matches `api.example.com`. See `ai-context-runtime-semantics.md § 4.1` for the full contract including URL scheme filter and subdomain rules.

### `$auth` Expression

Access authenticated user data. Whitelisted fields only — tokens/passwords are BLOCKED.

```json
{ "$auth": "email" }
{ "$auth": "role" }
{ "$auth": "roles" }
{ "$auth": "isAuthenticated" }
{ "$auth": "name" }
{ "$auth": "avatar" }
{ "$auth": "id" }
{ "$auth": "metadata" }
{ "$auth": "metadata.department" }
{ "$auth": "user" }
{ "$auth": "loading" }
{ "$auth": "error" }
```

**Blocked fields (return undefined):** `token`, `accessToken`, `access_token`, `refreshToken`, `refresh_token`, `password`, `secret`, `session`, `metadata.token`, `metadata.password`

### Auth Actions

**`login`** — authenticate via provider:
```json
{
  "action": "login",
  "params": {
    "email": { "$state": "/screens/login/email" },
    "password": { "$state": "/screens/login/password" }
  }
}
```
After login: tokens stored in closure (never state), user data written to `/auth/*`, credentials cleared from state, proactive refresh scheduled. Navigates to `initialScreen` (or first accessible screen if `initialScreen` is denied for the user's role).

**`logout`** — clear session:
```json
{ "action": "logout" }
```
Clears tokens, state, persistence. Broadcasts to other tabs. Navigates to loginScreen (with `statePolicy: "reset"`, form fields are cleared automatically).

### Auth State Paths (read-only, auto-managed)

```
/auth/isAuthenticated   → boolean
/auth/loading           → boolean
/auth/error             → string | null
/auth/user/id           → string
/auth/user/email        → string
/auth/user/name         → string | null
/auth/user/avatar       → string | null
/auth/user/role         → string (primary)
/auth/user/roles        → string[] (all roles)
/auth/user/metadata     → object | null
```

These are protected by StateGuard — specs cannot write to `/auth/*`.

### Login Screen Example

**IMPORTANT:** Login form fields MUST use screen-namespaced state paths (`/screens/login/...`), not root-level paths (`/form/...`). Combined with `statePolicy: "reset"` on the login screen definition, this ensures credentials are automatically cleared on logout — the AppEngine clears `/screens/login` when navigating to the login screen with reset policy. Root-level paths like `/form/email` persist across logouts because nothing clears them.

```json
{
  "root": "login-page",
  "elements": {
    "login-page": {
      "type": "box",
      "style": { "display": "flex", "alignItems": "center", "justifyContent": "center", "minHeight": "100vh", "backgroundColor": { "$token": "colors.surfaceMuted" } },
      "children": ["login-card"]
    },
    "login-card": {
      "type": "box",
      "style": { "width": 400, "padding": 32, "backgroundColor": { "$token": "colors.surface" }, "borderRadius": 16, "boxShadow": "0 4px 24px rgba(0,0,0,0.08)" },
      "children": ["title", "email-input", "password-input", "error-msg", "login-btn"]
    },
    "title": { "type": "text", "props": { "content": { "$i18n": "auth.login" } }, "style": { "fontSize": 24, "fontWeight": "bold", "marginBottom": 24 } },
    "email-input": {
      "type": "input",
      "props": { "placeholder": { "$i18n": "auth.email" }, "value": { "$bindState": "/screens/login/email" } },
      "style": { "marginBottom": 12 }
    },
    "password-input": {
      "type": "input",
      "props": { "placeholder": { "$i18n": "auth.password" }, "type": "password", "value": { "$bindState": "/screens/login/password" } },
      "style": { "marginBottom": 16 }
    },
    "error-msg": {
      "type": "text",
      "visible": { "$auth": "error" },
      "props": { "content": { "$auth": "error" } },
      "style": { "color": { "$token": "colors.error" }, "fontSize": 13, "marginBottom": 12, "padding": "8px 12px", "backgroundColor": "#FEF2F2", "borderRadius": 8 }
    },
    "login-btn": {
      "type": "button",
      "props": {
        "label": { "$cond": { "$auth": "loading" }, "$then": { "$i18n": "auth.signing_in" }, "$else": { "$i18n": "auth.login" } },
        "disabled": { "$auth": "loading" }
      },
      "style": { "width": "100%", "padding": "12px 0", "backgroundColor": { "$token": "colors.primary" }, "color": "#FFFFFF", "border": "none", "borderRadius": 10, "fontSize": 15, "fontWeight": 600, "cursor": "pointer" },
      "hover": { "backgroundColor": { "$token": "colors.primaryHover" } },
      "on": {
        "press": {
          "action": "login",
          "params": {
            "email": { "$state": "/screens/login/email" },
            "password": { "$state": "/screens/login/password" }
          }
        }
      }
    }
  }
}
```

**AppSpec screen definition for login:**
```json
"login": { "label": "Login", "icon": "sign-in", "statePolicy": "reset" }
```

The `statePolicy: "reset"` is what clears `/screens/login` on every navigation to the login screen. Without it, credentials persist after logout.

### Security Guarantees

- Tokens NEVER exist in the state store — only in engine closure
- `$auth` blocks token/password fields via whitelist
- Auth headers only injected for `authDomains` URLs
- Credentials cleared from state after login (success AND failure)
- Refresh mutex: max 1 concurrent refresh (anti-stampede)
- Login rate limit: 5 attempts/min with exponential backoff
- Cross-tab sync: logout in one tab = logout in all tabs
- StateGuard blocks spec writes to `/auth/*`
- XSS-resistant by architecture: JSON → primitives → React escaping

### Fetch Interceptors

The framework uses a scoped fetch wrapper (NOT `globalThis.fetch`). All `fetch` and `submitForm` spec actions go through this wrapper. Interceptors can be enabled declaratively in AppSpec:

```json
{
  "navigation": {
    "auth": {
      "interceptors": {
        "logging": true,
        "timeout": { "ms": 15000 },
        "retryOnError": { "maxRetries": 2, "statuses": [502, 503] }
      }
    }
  }
}
```

| Interceptor | Config | Behavior |
|-------------|--------|----------|
| **Auth** | Auto when auth configured | Injects Bearer token for `authDomains` URLs. Triggers refresh+retry on 401. |
| **Logging** | `"logging": true` | Logs request method/URL and response status. Redacts sensitive query params (token, password, key). |
| **Timeout** | `"timeout": { "ms": 15000 }` | Aborts request after configured milliseconds. Uses AbortController. |
| **Retry** | `"retryOnError": { ... }` | Retries on transient server errors (502, 503, 504) with exponential backoff. |

Auth interceptor is always first in the chain. Custom interceptors from the host app run after built-in ones.

### Action Middleware

Pre/post/onError hooks that run on EVERY dispatcher action (not just fetch). Configured at the host app level:

```tsx
<MythikApp
  auth={{
    provider: createSupabaseAuthProvider(client),
    middleware: [myLoggingMiddleware, myAnalyticsMiddleware],
  }}
/>
```

Middleware API:

```typescript
{
  name: "my-middleware",
  before: (ctx) => {
    // Runs before action. ctx.action, ctx.params, ctx.getState(), ctx.setParam()
  },
  after: (ctx, result) => {
    // Runs after successful action
  },
  onError: (ctx, error) => {
    // Runs on action failure. Individual errors are isolated.
  }
}
```

Middleware executes in registration order. `before` can modify params via `ctx.setParam()`. `onError` handlers are isolated — one failing handler does not prevent others from running.

**Separation of concerns:** Fetch Interceptors = networking (headers, retry, timeout). Action Middleware = business logic (logging, analytics, auth lifecycle).

### Session Persistence

Auth session persistence is configurable in AppSpec:

| Mode | Config Value | Behavior |
|------|-------------|----------|
| **Local** | `"persistence": "local"` (default) | Survives browser close. Refresh token + safe user data in localStorage. |
| **Session** | `"persistence": "session"` | Lost on browser/tab close. Uses sessionStorage. |
| **Memory** | `"persistence": "memory"` | Lost on page refresh. Most secure — re-login required every time. |

**What's persisted:** Refresh token + user profile (id, email, name, avatar, role, roles, metadata).
**What's NEVER persisted:** Access tokens. They live exclusively in the engine closure.

On page load, `mount()` restores the session from persistence and attempts a token refresh to validate the session is still alive. If refresh fails, the persisted session is cleared.

### Cross-Tab Synchronization

Auth events are automatically synchronized across browser tabs:

| Event | Trigger | Effect on other tabs |
|-------|---------|---------------------|
| `SIGNED_IN` | Login completes | Other tabs can restore session from persistence |
| `SIGNED_OUT` | Logout | All tabs clear session and redirect to loginScreen |
| `TOKEN_REFRESHED` | Token refresh completes | Other tabs pick up new refresh token from persistence |
| `SESSION_EXPIRED` | Refresh fails | All tabs clear session |

**Primary mechanism:** BroadcastChannel API (97%+ browser support).
**Fallback:** localStorage `storage` events for legacy browsers.

No configuration needed — cross-tab sync is automatic when auth is configured.

---

## Audit (SP3)

### Audit Config

Declarative audit config per endpoint — auto-injects username and timestamp into CRUD INSERT and UPDATE queries:

```json
{
  "endpoints": {
    "items": {
      "path": "/api/items",
      "crud": { "table": "Items", "primaryKey": "id", "insertable": ["name"], "updatable": ["name"] },
      "audit": {
        "createdBy": "created_by",
        "createdAt": "created_at",
        "updatedBy": "updated_by",
        "updatedAt": "updated_at",
        "timezone": "UTC"
      }
    }
  }
}
```

All fields are optional — only configured fields are injected.

### Behavior

| Operation | Fields injected | Source |
|-----------|----------------|--------|
| **INSERT** | `createdBy` + `createdAt` + `updatedBy` + `updatedAt` | `req.user.username` + timestamp |
| **UPDATE** | `updatedBy` + `updatedAt` | `req.user.username` + timestamp |
| **DELETE** | None | No change |

### Timezone

- Without `timezone` → UTC (default)
- With `timezone` → IANA string (e.g., `"America/El_Salvador"`, `"America/Tegucigalpa"`, `"US/Eastern"`)
- Use timezone when the database stores local time (most enterprise DBs)
- Uses `Intl.DateTimeFormat` — works regardless of server physical location

### Security

- Audit values **override** any client-sent values — prevents spoofing
- No username available (public endpoint) → only timestamp fields injected

---

## Typed Contract (SP4)

Cross-validate screen specs against api-specs before deploy. Only possible because both sides are declarative JSON.

### Usage

```bash
# Single api-spec
mythik contract --app app-demo --api records-api

# Multiple api-specs (modular backends)
mythik contract --app app-demo --api inventory-api,users-api

# Api-specs in separate table
mythik contract --app app-demo --api records-api --api-table api_specs

# Strip base URL from screen fetch URLs
mythik contract --app app-demo --api records-api --base-url http://localhost:3010

# JSON output for CI/CD (exit code 1 on errors)
mythik contract --app app-demo --api records-api --json
```

### Rules

| Rule | Level | What it checks |
|------|-------|----------------|
| `endpoints-exist` | error | Every fetch URL in screens matches an endpoint, catalog, or builtin in the api-spec |
| `fields-valid` | error | POST/PUT body fields exist in CRUD `insertable`/`updatable` definitions |
| `params-match` | warning | Query params match endpoint `params` config. `page`/`pageSize` always valid |
| `permissions-consistent` | warning | If AppSpec `roleAccess` grants role access to a screen, endpoints used by that screen allow that role via `policies` |

All rules include Levenshtein "did you mean?" suggestions when names are close matches.

Duplicate findings (same rule + screen + level + message) are automatically collapsed with a `count` field. Template domain URLs (`http://${authDomain}/api/items`) are normalized to relative paths before matching.

### Extensibility

Rules are pluggable. Adding a new rule = creating one file that implements `ContractRule` interface + adding to the rules array. No engine changes needed. When the backend evolves (data models, enums, response schemas), new rules plug in trivially.

---

## File Upload

### File Upload Primitive

The `file-upload` primitive is a god-primitive with preview, progress, validation, drop zone, and auto/manual upload modes.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `accept` | string | `"*"` | Accepted MIME types or extensions. e.g., `"image/*"`, `".pdf,.docx"`, `"image/jpeg"` |
| `multiple` | boolean | `false` | Allow multiple files |
| `maxSize` | number | `10485760` (10MB) | Max bytes per file |
| `maxFiles` | number | `10` | Max files (when multiple) |
| `preview` | boolean | `true` | Show file previews (thumbnails for images, extension icons for others) |
| `dropZone` | boolean | `false` | Drag-and-drop area instead of button |
| `autoUpload` | boolean | `true` | Upload immediately on file selection |
| `label` | string/expression | `"Choose file"` | Button/zone text. Supports `$i18n` |

**Example — avatar upload:**
```json
{
  "type": "file-upload",
  "props": {
    "accept": "image/*",
    "maxSize": 5242880,
    "dropZone": true,
    "label": { "$i18n": "upload.avatar" }
  },
  "on": {
    "upload": {
      "action": "uploadFile",
      "params": {
        "bucket": "avatars",
        "path": { "$template": "users/${/auth/user/id}/${filename}" },
        "target": "/form/avatarUrl"
      }
    }
  }
}
```

**Example — document upload (manual):**
```json
{
  "type": "file-upload",
  "props": {
    "accept": ".pdf,.docx,.xlsx",
    "multiple": true,
    "maxFiles": 5,
    "autoUpload": false,
    "label": "Attach documents"
  },
  "on": {
    "upload": {
      "action": "uploadFile",
      "params": {
        "bucket": "documents",
        "target": "/form/attachments"
      }
    }
  }
}
```
With `autoUpload: false`, files are selected and previewed but not uploaded until triggered by a button with the `uploadFile` action.

### `uploadFile` Action

Uploads files to storage via the configured StorageAdapter. Writes the resulting URL(s) to the `target` state path.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `bucket` | string | Yes | Storage bucket name |
| `path` | string/expression | No | Path within bucket. `${filename}` replaced with original name. Default: original filename |
| `target` | string | Yes | State path to write URL(s). String for single file, array for multiple |

**Behavior:**
- Validates file type against `accept` and `maxSize`
- Uploads via StorageAdapter with progress tracking
- Writes progress to `/ui/uploads/{elementId}/files` (internal — don't read directly)
- On success: URL written to `target`, status `done`
- On failure: 1 automatic retry after 1s, then `error` status with retry button
- Single file → `target` receives a URL string
- Multiple files → `target` receives a URL array

### `deleteFile` Action

Deletes a file from storage.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | File path in storage |
| `bucket` | string | Yes | Storage bucket name |

```json
{ "action": "deleteFile", "params": { "path": { "$state": "/form/avatarPath" }, "bucket": "avatars" } }
```

### StorageAdapter Setup (Host App)

The host app provides a StorageAdapter to enable file uploads:

**Supabase Storage:**
```tsx
import { createSupabaseStorageAdapter } from 'mythik';

<MythikRenderer
  spec={spec}
  instance={svc}
  storage={createSupabaseStorageAdapter({ client: supabaseClient })}
/>
```

**Generic URL (any backend):**
```tsx
import { createUrlStorageAdapter } from 'mythik';

<MythikRenderer
  spec={spec}
  instance={svc}
  storage={createUrlStorageAdapter({
    uploadUrl: 'https://api.example.com/upload',
    deleteUrl: 'https://api.example.com/files',
    responsePath: 'data.url',
    headers: { 'X-Api-Key': apiKey },
  })}
/>
```

**Global limits (optional security backstop):**
```tsx
<MythikRenderer
  spec={spec}
  instance={svc}
  storage={adapter}
  storageConfig={{
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 10_485_760,
  }}
/>
```

### Upload State Paths

| Path | Owner | Description |
|------|-------|-------------|
| `target` (e.g., `/form/avatarUrl`) | Spec author | URL string (single) or URL array (multiple). Use this for persistence |
| `/ui/uploads/{elementId}/files` | Framework | Array of `{ name, size, type, progress, status, previewUrl, error }`. Internal — don't read directly |

The primitive reads `/ui/uploads/*` automatically. The spec author only needs to read the `target` path.

---

## Skeleton Primitive

Loading placeholders that replicate spec structure while data loads.

### Auto-Skeleton (Zero Config)

When a spec has `initialActions` with a `fetch` action, the renderer auto-detects loading state and replaces data-dependent primitives with shimmer skeletons. No configuration needed.

**Activation conditions (all must be true):**
1. Spec has `initialActions` containing a `fetch` action
2. `/ui/loading` is `true`
3. The fetch target path is empty/undefined/empty array

**Shape mapping:** `text` → text line, `image` → rectangle, `button` → button shape, `input/textarea/select` → input rectangle, `icon` → circle, charts → large rectangle, `table` → table placeholder. Layout containers (`stack`, `grid`, `box`, `scroll`) pass through to children. Overlays (`modal`, `drawer`, `tabs`) are skipped.

### Element-Level Opt-Out

```json
{
  "type": "text",
  "props": { "content": "Static Header" },
  "skeleton": false
}
```

Elements with `skeleton: false` render normally during loading. Use for static content that doesn't depend on fetched data.

### Manual Skeleton

For custom loading layouts, place `type: "skeleton"` elements directly:

```json
{
  "type": "skeleton",
  "props": {
    "variant": "text",
    "width": "80%",
    "height": 16,
    "count": 3,
    "gap": 8
  },
  "visible": { "$state": "/ui/loading" }
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"text" \| "circle" \| "rect"` | `"rect"` | Shape of the skeleton |
| `width` | `string \| number` | `"100%"` | Width (px or %) |
| `height` | `number` | `16` | Height in px |
| `count` | `number` | `1` | Number of shapes to render |
| `gap` | `number` | `8` | Gap between shapes (when count > 1) |

### Disable Auto-Skeleton

Set `autoSkeleton={false}` on `MythikRenderer` to disable completely:

```tsx
<MythikRenderer spec={spec} instance={svc} autoSkeleton={false} />
```

---

## Export Action

Declarative data export with CSV built-in and adapter pattern for XLSX/PDF.

### Usage

```json
{
  "action": "export",
  "params": {
    "source": "/tasks",
    "columns": [
      { "field": "title", "label": "Title" },
      { "field": "price", "label": "Price", "format": "currency", "formatOptions": { "currency": "USD" } },
      { "field": "createdAt", "label": "Created", "format": "date" }
    ],
    "filename": "tasks-report",
    "format": "csv"
  }
}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string | Yes | State path to array of data |
| `columns` | ExportColumn[] | Yes | Column definitions with optional formatting |
| `filename` | string | Yes | Download filename (without extension) |
| `format` | string | No | `"csv"` (default), or any custom format with registered adapter |

### Column Formatting

| Format | Example Output | Options |
|--------|---------------|---------|
| `currency` | `$1,234.50` | `currency` (code), `decimals`, `locale` |
| `number` | `1,234.50` | `decimals`, `locale` |
| `percent` | `75%` | `decimals`, `locale` |
| `date` | `4/5/2026` | `locale` |

### CSV (Built-in, Zero Dependencies)

Format `"csv"` is always available. RFC 4180 escaping. Downloads as `.csv` file.

### XLSX / PDF (Via Adapter)

Register adapters via `exportAdapters` prop:

```tsx
<MythikRenderer
  spec={spec}
  instance={svc}
  exportAdapters={{
    xlsx: myXlsxAdapter,
    pdf: myPdfAdapter,
  }}
/>
```

Adapters implement `ExportAdapter`:

```typescript
interface ExportAdapter {
  generate(data: ExportData, format: string): Promise<Blob>;
}
```

`ExportData` includes both raw `rows` and pre-formatted `formattedRows`. XLSX adapters may use raw values with number formatting, PDF adapters may use formatted strings.

---

## Deep Design Token System

Three-layer token resolution that gives every app a unique visual identity from minimal configuration:

```
Layer 1: Framework DEFAULTS (always present — app looks good out of the box)
Layer 2: DNA derivation (OKLCH color science — 8 seeds generate full identity)
Layer 3: Manual overrides (explicit values always win)
```

### DNA Seeds

Define in `tokens.dna` at the AppSpec level. The framework derives ALL token categories automatically:

```json
{
  "tokens": {
    "dna": {
      "primary": "#0D9488",
      "harmony": "analogous",
      "roundness": 0.7,
      "density": 0.5,
      "depth": 0.6,
      "motion": "fluid",
      "formality": 0.3
    }
  }
}
```

| Seed | Type | Default | Controls |
|------|------|---------|----------|
| `primary` | hex | (required) | Base color → OKLCH 13-stop tonal palette |
| `harmony` | `complementary` \| `analogous` \| `triadic` \| `split-complementary` | `complementary` | Accent color hue rotation (analogous=+50°, triadic=+120°, split=+150°, complementary=+180°) |
| `accent` | hex | derived | Explicit accent (skips harmony) |
| `neutral` | `warm` \| `cool` \| `natural` | `natural` | Neutral palette tint. warm=amber hue (55°), cool=blue (250°), natural=primary hue. Chroma 0.025 (natural) / 0.035 (warm/cool) — visible in backgrounds and borders |
| `roundness` | 0–1 | 0.5 | Border radii: 0=sharp, 1=pill |
| `density` | 0–1 | 0.5 | Font size + spacing: 0=airy, 1=compact |
| `depth` | 0–1 | 0.5 | Shadow intensity: 0=flat, 1=elevated |
| `motion` | `fluid` \| `snappy` \| `gentle` \| `energetic` | `gentle` | Animation duration, spring, stagger |
| `formality` | 0–1 | 0.5 | Typography: 5 font tiers. Body: Inter → Space Grotesk → Source Sans 3 → Lora → Merriweather. Heading: Inter → Space Grotesk → DM Sans → Lora → Playfair Display. Also drives continuous letterSpacing (0 → 0.03em), headingLetterSpacing (0 → -0.02em), lineHeight ratio (1.45 → 1.6), bold weight (700 → 800) |

Numeric seeds are canonical `0–1` values. Generate `0.7`, not `70`. For backward compatibility with legacy exports and percentage-style inputs, values greater than `1` are auto-normalized by dividing by `100` during DNA derivation, so both initial AppSpec load and runtime `updateTokens` resolve consistently.

### Three Control Levels

**Level 1 — Just a color:** `"dna": { "primary": "#0D9488" }` → full coherent identity.

**Level 2 — Personality:** `"dna": { "primary": "#0D9488", "roundness": 0.7, "motion": "fluid" }` → unique identity from 5 values.

**Level 3 — Override specific tokens:** DNA generates base, explicit values win:
```json
{ "tokens": { "dna": { "primary": "#0D9488" }, "colors": { "error": "#DC2626" }, "shape": { "radius": { "md": 24 } } } }
```

### Token Categories & `$token` Paths

All primitives consume these via `useDesignTokens` hook internally. Specs reference them via `$token`:

| Category | Paths | Example |
|----------|-------|---------|
| Colors | `colors.primary`, `colors.surface`, `colors.text`, `colors.error`, `colors.accent`, etc. (13 semantic colors) | `{ "$token": "colors.primary" }` |
| Shape | `shape.radius.none/sm/md/lg/xl/full` | `{ "$token": "shape.radius.lg" }` |
| Typography | `typography.fontFamily.base/heading/mono`, `typography.scale.xs/sm/md/lg/xl/2xl` (each has `.fontSize`, `.lineHeight`), `typography.weight.normal/medium/semibold/bold`, `typography.letterSpacing`, `typography.headingLetterSpacing` | `{ "$token": "typography.scale.xl.fontSize" }` |
| Spacing | `spacing.unit`, `spacing.scale.xs/sm/md/lg/xl/2xl` | `{ "$token": "spacing.scale.md" }` |
| Elevation | `elevation.none/sm/md/lg/xl` — auto-converts to CSS `boxShadow` string when used in `$token` | `{ "$token": "elevation.lg" }` |
| Motion | `motion.duration.fast/normal/slow`, `motion.easing.default/enter/exit`, `motion.spring.damping/stiffness/mass`, `motion.stagger` | `{ "$token": "motion.duration.fast" }` |
| Opacity | `opacity.disabled/pressed/backdrop/muted` | `{ "$token": "opacity.backdrop" }` |

### Auto Dark Mode

DNA automatically generates `modes.dark` by inverting tonal palette stops. No manual dark theme needed. Override with explicit `modes.dark` values if desired. `toggleTheme` action works automatically.

### Runtime Token Update

Use `updateTokens` action to change tokens without page reload:
```json
{ "action": "updateTokens", "params": { "dna": { "primary": "#F97316", "roundness": 0.9 } } }
```
All primitives re-render with new tokens. Numeric seeds > 1 are auto-divided by 100 during DNA derivation (legacy slider 0-100 compatibility).

### Presets System

Complete DNA+Identity snapshots that transform the entire look of an app with a single action. The framework provides the **tools** (contract, registration, application); preset definitions live **outside core** (in the app, a file, or a future API like mythik.dev).

**PresetDefinition interface:**
```typescript
interface PresetDefinition {
  id: string;           // 'startup-saas'
  name: string;         // 'Startup SaaS'
  description: string;  // 'Clean, professional, outlined'
  tags?: string[];      // ['professional', 'minimal']
  tokens: {
    dna: DnaSeed;
    identity: IdentityConfig;
  };
}
```

**Registration:**
```typescript
const svc = createMythik({ tokens: { dna: { primary: '#0D9488' } } });
svc.plugins.registerPresets(myPresets);  // stores presets + writes /presets/available to state
svc.applyPlugins();
```

`registerPresets` automatically:
1. Stores presets in internal Map
2. Writes dropdown options to state at `/presets/available` (array of `{ value, label }`)
3. Auto-registers `applyPreset` action

**Applying a preset from a spec:**
```json
{ "action": "applyPreset", "params": { "preset": "startup-saas" } }
```

Uses `_replace: true` internally — fully replaces all tokens, no stale values from previous presets.

`applyPreset` with `preset: 'custom'` is a no-op (silently returns). Unknown preset IDs throw.

**Dynamic dropdown in specs:**
```json
{
  "type": "select",
  "props": {
    "options": { "$state": "/presets/available" },
    "value": { "$bindState": "/ui/currentPreset" }
  },
  "on": {
    "change": [{ "action": "applyPreset", "params": { "preset": { "$state": "/ui/currentPreset" } } }]
  }
}
```

**Accessors:** `plugins.getPresets()` returns all registered presets. `plugins.getPreset(id)` returns one by ID.

### Font Loading

DNA generates font family names but does NOT load fonts. Web projects must include `@font-face` or Google Fonts. RN projects use `expo-font`. This is the project's responsibility, not the framework's.

### CLI Token Inspection

```bash
mythik tokens --dna '{"primary":"#0D9488","roundness":0.7}' --json
```
Shows the full resolved token set for debugging and inspection.

---

## Component Variants

Token-driven component styling for any primitive. Define variant definitions in `tokens.components` — the engine applies style, hover, active, focus, and transition automatically.

### Defining Variants

Variants live in `tokens.components.{primitiveType}.{variantName}`:

```json
{
  "tokens": {
    "colors": { "primary": "#0D9488", "surface": "#FFFFFF", "text": "#0F172A", "error": "#EF4444" },
    "radius": { "md": 12, "lg": 16 },
    "shadow": { "md": "0 4px 6px rgba(0,0,0,0.07)", "lg": "0 10px 25px rgba(0,0,0,0.1)" },

    "components": {
      "button": {
        "primary": {
          "style": { "backgroundColor": "$colors.primary", "color": "#FFF", "borderRadius": "$radius.md", "padding": "10px 22px", "fontWeight": 700 },
          "hover": { "scale": 1.05, "y": -1 },
          "active": { "scale": 0.95 },
          "transition": { "duration": 0.15 }
        },
        "danger": {
          "style": { "backgroundColor": "$colors.error", "color": "#FFF", "borderRadius": "$radius.md" },
          "hover": { "scale": 1.03 },
          "active": { "scale": 0.95 }
        }
      },
      "box": {
        "card": {
          "style": { "backgroundColor": "$colors.surface", "borderRadius": "$radius.lg", "padding": 16, "boxShadow": "$shadow.md" },
          "hover": { "boxShadow": "$shadow.lg", "y": -2 },
          "transition": { "duration": 0.2 }
        }
      },
      "text": {
        "heading": {
          "style": { "fontSize": 24, "fontWeight": 700, "color": "$colors.text" }
        }
      }
    }
  }
}
```

### Using Variants in Specs

Just set `variant` in props — no style copying needed:

```json
{ "type": "button", "props": { "label": "Save", "variant": "primary" } }
{ "type": "button", "props": { "label": "Delete", "variant": "danger" } }
{ "type": "box", "props": { "variant": "card" }, "children": ["content"] }
```

### Supported Variant Properties

| Property | Type | Purpose |
|----------|------|---------|
| `style` | object | CSS styles — applied as base |
| `hover` | object | Hover state overrides |
| `active` | object | Active/tap state overrides |
| `focus` | object | Focus state overrides |
| `transition` | object | Animation config |

### `$path` Token References

String values starting with `$` reference other tokens. Resolved against the active token tree (with dark mode already applied):

- `"$colors.primary"` → `"#0D9488"`
- `"$shape.radius.md"` → `12`
- `"$elevation.lg"` → CSS boxShadow string
- `"$typography.weight.bold"` → `700`
- `"$spacing.scale.md"` → `16`

Legacy paths (`$radius.md`, `$shadow.lg`) still work for backward compatibility.

**Dark mode works automatically.** When dark mode changes `colors.surface` to `#1E293B`, any variant using `$colors.surface` gets the dark value — no separate dark variant needed.

### Merge Precedence

Variant is base, element-level overrides. Same as CSS (class defaults + inline override):

```json
{
  "type": "button",
  "props": { "variant": "primary" },
  "style": { "borderRadius": 20 },
  "hover": { "rotate": 5 }
}
```

Result: variant's `backgroundColor`, `color`, `padding` apply. Element's `borderRadius: 20` overrides variant's `borderRadius: 12`. Hover merges: variant's `scale: 1.05` + element's `rotate: 5`.

### Works for Any Primitive

Not just buttons — boxes, text, inputs, any primitive type can have variants defined in `tokens.components`.

---

## Background System v2 — Layered Backgrounds

Mythik backgrounds use a structured `LayerBackground` model. Apps declare `tokens.identity.background` with a base color and ordered layers; the renderer mounts a root `BackgroundStack` so backgrounds remain app-level composition, not per-card decoration.

### Layered background contract

171. **`LayerBackground` type** — New structured background type with `color?: string` and `layers?: LayerConfig[]`. Unions: `SolidLayerConfig`, `GradientLayerConfig`, `PatternLayerConfig`, `GrainLayerConfig`, `ImageLayerConfig`. See `packages/core/src/design/identity/types.ts`

172. **`resolveBackgroundLayers(config)` function** — Transforms `LayerBackground` into `LayerSpec[]` (structured renderer-ready specs). Base color always emitted first, then layers in array order. `zIndex` uses array index as fallback or explicit override. Entry point for any consumer rendering custom backgrounds

173. **8 curated background recipes shipped in `tokens.backgrounds.*`** — `linear-aura` (Linear-like), `stripe-ribbons` (Stripe-like), `vercel-center`, `arc-organic`, `grid-subtle`, `notion-warm`, `raycast-mono`, `comic-pop`. Exported as `BACKGROUND_RECIPES` constant. Consumers access via recipe name string or expand and modify

174. **Pattern primitives** — 6 curated kinds (`grid`, `dots`, `diagonal`, `iso`, `crosshatch`, `chevron`) + `custom-svg` escape hatch. Each emits `<pattern>` SVG fragment. Params: `spacing`, `thickness`, `color`, `angle`, `dotRadius` (dots only). Custom-svg passes through `sanitizeSVGShapes` (strict allowlist: shapes + geometric attrs only; rejects `<script>`, `<foreignObject>`, `<use href>`, `on*` events, `javascript:` URLs)

175. **Gradient primitive enhanced** — Linear/radial/conic with custom `stops[]` (each with `color`, `opacity`, `at` percentage), `position`, `size`, `shape`. Opacity→rgba conversion automatic. Previously was `{ angle }` only with hardcoded `30% 50%` position and fixed opacity values. New API: `{ type: 'gradient', kind: 'radial', shape: 'circle', size: '500px', position: '0% 20%', stops: [...] }`

176. **Grain primitive** — `{ type: 'grain', intensity, scale, monochrome }` emits SVG `feTurbulence` filter for noise overlay. Default `intensity: 0.05`, `scale: 0.9`, `monochrome: true` (premium desaturated grain). Cross-platform (web + react-native-svg)

177. **Layer composition via `layers[]` array** — Any mix of primitives (solid, gradient, pattern, grain, image) composed as ordered stack. Each layer supports `opacity`, `blendMode` (normal, multiply, screen, overlay, soft-light, hard-light, color-dodge, color-burn), `zIndex`

178. **`BackgroundLayer` + `BackgroundStack` components shipped for web and RN** — Web: `packages/react/src/background/` using CSS for solid/gradient/image + inline SVG for pattern/grain. RN: `packages/react-native/src/background/` using `react-native-svg` `SvgXml` for all layers + View for solid + Image for image. Accepts `LayerBackground` config OR recipe string name

179. **`custom-svg` sanitized escape hatch** — When built-in patterns aren't enough, consumers pass SVG shape fragments via `{ kind: 'custom-svg', shapes: '<circle.../>', tileSize: 20 }`. `sanitizeSVGShapes` uses regex pre-strip + DOMPurify allowlist. Only circle/rect/path/line/polygon/polyline/ellipse/g/defs/gradients + geometric attrs survive. Cross-platform safe (isomorphic-dompurify)

---

## Animation System

`Element.animations` is a first-class spec field. Animations can be declared directly on elements and can also cascade through identity, component variants, templates, and custom elements. The same core animation contract feeds web CSS keyframes and React Native Reanimated output where the platform supports the property.

### Animation contract

180. **`ElementAnimations` type with 7 triggers** — `mount`, `unmount`, `hover`, `focus`, `active`, `ambient`, `stateChange`. Each trigger accepts `AnimationRef | AnimationRef[] | null`; `null` explicitly disables inherited animation for that trigger in the cascade. See `packages/core/src/design/animation/types.ts`

181. **`AnimationRef` union: recipe reference or inline animation** — `{ recipe: string, duration?, easing?, delay?, iterations?, stagger?, essential? }` references a curated recipe with optional overrides. Alternative: `InlineAnimation` with explicit `keyframes: KeyframeSnapshot[]`. Resolver throws if a ref contains both `recipe` AND `keyframes` (malformed)

182. **`KeyframeSnapshot` schema** — `{ at: string, opacity?, transform?: TransformValue, backgroundColor?, borderColor?, borderRadius?, borderWidth?, color?, filter?: FilterValue }`. `at` must be percent format `'0%'` to `'100%'` (out-of-range throws); keyframes must be monotonically non-decreasing. `TransformValue` supports translateX/Y, scale (number or `{x,y}`), rotate, skewX/Y

183. **`resolveAnimation(ref, recipes)` function** — Transforms `AnimationRef` into fully-normalized `AnimationSpec` with parsed durations (handles `'200ms'`, `'1.5s'`, numeric), defaults applied (`iterations: 1`, `direction: 'normal'`, `fillMode: 'both'`, `easing: 'ease-out'`, `delay: 0`, `essential: false`). Throws on unknown recipe, empty keyframes, non-monotonic `at`, out-of-range `at`

184. **15 curated animation recipes shipped in `ANIMATION_RECIPES`** — `fade`, `fade-up`, `fade-down`, `scale-in`, `slide-left`, `slide-right`, `lift`, `glow`, `pulse-primary`, `breathe-subtle`, `shimmer`, `float`, `pop`, `shake`, `spin`. Recipe names are mechanical for AI consistency. Platform limitations are explicit: web-only recipes surface validator warnings on React Native instead of silently pretending to render parity.

185. **`buildCSSKeyframes(spec)` function — web output** — Returns `{ name, keyframesText, animationCSS }`. `name` is `svka-${djb2(fingerprint)}` — deterministic hash of content for Constructable StyleSheets dedup. `animationCSS` is CSS shorthand (`name duration easing delay iter direction fillMode`). `keyframesText` derives `at` from normalized fraction (not raw input) for whitespace-clean output

186. **`buildReanimatedSpec(spec)` function — RN output** — Returns `{ animatedProps, inputRange, outputRanges, animatedColorProps, timing }`. Emits plain data (no React, no Reanimated imports) — the RN runner wires shared values and `useAnimatedStyle` separately. Nearest-neighbor fill for missing property values at keyframe stops. Numeric rotate/skew stored as `rotateDeg`/`skewXDeg`/`skewYDeg` for correct `interpolate()` input. Non-deg rotate strings (`0.25turn`, `3.14rad`) are skipped on RN (web-only). Percentage `borderRadius` throws on RN (cannot animate natively)

187. **`applyReducedMotion(spec, trigger)` — moderate a11y policy** — `mount`/`unmount`/`active` strip transforms (keep opacity; returns null if all animated props disappear — I1 degenerate guard). `hover`/`ambient` return null (skip). `focus` preserved (a11y-critical). `stateChange` reduces duration 3x with floor at 50ms. `essential: true` on the spec bypasses entire policy — intended for spinners/loaders where motion is affordance

188. **`validateAnimationCaps(animations)` — performance gates** — Per-trigger: soft-cap 3 animations (warn), hard-cap 6 (error). Per-element: soft-cap 5 triggers with animations (warn), hard-cap 7 (error — all triggers filled). Returns `{ warnings: string[], errors: string[] }`. `null` triggers excluded from count

189. **`StateChangeAnimation` schema** — `{ watch: string, on?, recipe?, keyframes?, duration, easing?, debounce? }`. `on` patterns: `'change' | 'increase' | 'decrease' | 'truthy' | 'falsy' | { equals: unknown }`. Must supply either `recipe` or `keyframes` (both missing throws at resolution). Single-fire semantics: for repeating state-driven behavior, use `ambient` with conditional enablement via `$cond`. State-change animations should return to baseline or the transient clear can cause a visible snap.

190. **Constructable StyleSheets singleton (web) + `<style>.insertRule` fallback** — `packages/react/src/animation/stylesheet-singleton.ts`. `registerKeyframes(name, text)` idempotent dedup by name. Feature-detected Constructable support with iterability probe (jsdom defines `adoptedStyleSheets` non-iterably — fallback path activates). SSR-safe (`canUseDOM()` guards). Zero `dangerouslySetInnerHTML` in either path — CSSOM only

191. **`useElementAnimations` hook (web)** — `packages/react/src/animation/useElementAnimations.ts`. Signature: `(ref, animations, options) => { triggerUnmount }`. Composes active triggers into CSS `animation` shorthand (comma-separated). State flags (`isHovered`/`isFocused`/`isActive`) passed via options — hook does NOT attach DOM listeners. `stateChange` subscribes via `StateStore.subscribePath` with debounce + auto-clear. I1 mid-transient cleanup: effect re-run resets transient state. `triggerUnmount` imperative returns Promise resolving after max duration

192. **`useElementAnimations` hook (RN)** — `packages/react-native/src/animation/useElementAnimations.ts`. Signature: `(animations, options) => { animatedStyle, triggerUnmount }`. `composeRNStyle` (pure function in `compose-rn-style.ts`) merges contributions with CSS-parity semantics: scalars last-wins, transforms merge-by-key (not concat — prevents multiplicative composition). Supports arrays per trigger via fixed-pool of 6 `useSharedValue` per trigger (matches validator hard-cap). SVs snap to 0 when trigger transitions to empty to prevent `withRepeat` UI-thread leak. All 7 triggers supported; stateChange via `withSequence(withTiming up/2, withTiming down/2)`

193. **`react-native-reanimated` mock for jsdom test env** — `packages/react-native/tests/__mocks__/react-native-reanimated.ts`. End-state-synchronous semantics: `withTiming/withSpring/withDelay/withSequence/withRepeat` return target value immediately; `useAnimatedStyle` evaluates factory synchronously at each render. Covers 30+ Reanimated APIs (shared values, Easing, interpolate, interpolateColor, layout-animation builders FadeIn/FadeOutUp/etc, Animated.View/Text/ScrollView/Image passthrough with style-array flattening + testID/accessibilityRole/Label translation + RN-native event prop filtering). Closed 3 pre-existing RN test failures on integration

194. **`Element.animations` field — first-class spec field** — `Element` accepts `animations?: ElementAnimations | null`. Per-trigger `null` disables inherited cascade for that trigger; whole-field `null` disables all element animations. Accepts the 7 triggers `mount`/`unmount`/`hover`/`focus`/`active`/`ambient`/`stateChange`, each taking `AnimationRef | AnimationRef[] | null` (stateChange uses the distinct `StateChangeAnimation` shape)

195. **`<Box>` primitive consumes `useElementAnimations` (web)** — Box tracks `isHovered`/`isFocused`/`isActive` via internal state + composed event handlers (state-setter runs BEFORE user handler for throw-safety). Handlers memoized by user-prop identities. When `animations.focus` is set and `tabIndex` is omitted, tabIndex auto-defaults to `0` (prevents silent trigger no-op on non-focusable div); explicit consumer `tabIndex` (including `-1`) always wins. Accepts `animations?: ElementAnimations | null` — null-coalesces to undefined at the hook boundary

196. **`<Box>` primitive consumes `useElementAnimations` (RN)** — Root is ALWAYS `Animated.View` (never conditionally swapped with plain View — switching component type between renders would force unmount/remount). Event handlers use RN-native names (`onHoverIn`/`onHoverOut`/`onPressIn`/`onPressOut`/`onFocus`/`onBlur`) composed with internal state setters. Style-merge contract: `animatedStyle` is LAST in the style array so animation properties override user-supplied `style` during animation. `useDesignTokens` is hoisted above the early return to avoid Rules-of-Hooks violation if `surface` toggles.

197. **`boxShadow` keyframe field** — `KeyframeSnapshot.boxShadow?: string` accepts a literal CSS shorthand (`'none'` | `'0 0 20px 4px rgba(...)'`). CSS builder emits `box-shadow: ${value}`; RN builder explicitly omits (same policy as `filter` — no 1:1 platform mapping yet). Used by the `glow` recipe: `'none'` → `'0 0 20px 4px rgba(99,102,241,0.45)'` for a colored shadow halo. This models glow as brightness/shadow, not background color wash.

198. **`WEB_ONLY_RECIPES` constant + validator warning** — `WEB_ONLY_RECIPES: ReadonlySet<string>` exported from `mythik` (currently `{ 'glow' }`). `validateAnimationCaps` walks each trigger's AnimationRefs and emits a warning when a web-only recipe is referenced, calling out the RN no-op until per-platform shadow parsing lands. Accessible via the `AnimationValidationResult.warnings` array

199. **Recipe tuning** — `breathe-subtle` uses scale `1.025` and duration `2800ms` so the motion reads as alive without becoming nervous. `glow` uses a boxShadow halo (see rule 197). Other recipes keep conservative defaults for broad UI safety.

200. **Legacy motion system removed** — The legacy `identity.motionEntrance` / `identity.motionHover` path is no longer supported. The animation engine is the canonical path: use `element.animations` and cascade-level animation declarations instead. Also see rule 149 and `ai-context.md` rule 54.

### Current platform limitations

- RN parity for `boxShadow` and `filter` keyframes is intentionally limited because native shadows, Android elevation, and SVG/CSS filters do not share a 1:1 model. Validators warn for web-only animation recipes instead of claiming parity.

## Layered Backgrounds, Blobs, and Animation Cascade

The current background and motion stack combines app-level `LayerBackground`, animated blob layers, animation cascade, and safe CSSOM keyframe registration. Legacy background shorthands and per-element blob rendering are removed; `BackgroundStack` + `BlobLayer` (web + RN) mount at the renderer root from `tokens.identity.background`.

### Cascade and blob contracts

201. **`mergeElementAnimations(ctx: AnimationContext)` — pure cascade merge fn** — Exported from `mythik` via `packages/core/src/design/animation/cascade.ts`. Walks 4 levels (`identity → variant → template → element`) in order; later levels override earlier per-trigger. Returns `ElementAnimations | null` — null when every output trigger is absent or explicitly disabled. Null-stripping: triggers set to `null` are removed from the output object so consumers never null-check per-trigger. Compile-time exhaustiveness sentinel guards against future `AnimationTrigger` additions dropping silently.

202. **`AnimationContext` type** — `{ identity?, variant?, template?, element? }` where each field is `ElementAnimations | null | undefined`. `undefined` = inherit upward (pass-through), `null` = explicit disable at this level, per-trigger values override earlier levels. Disjoint by contract from `ElementAnimations` (triggers mount/unmount/hover/focus/active/ambient/stateChange) — runtime discriminant by key presence.

203. **Null semantics (decision table frozen)** — For any trigger across the cascade: (a) whole-field `null` at a level contributes nothing (inheritance-neutral, NOT a disable marker); (b) per-trigger `null` disables for that level AND blocks prior non-null values; (c) later non-null re-enables (later always trumps); (d) `undefined` = inheritance; (e) output strips nulls — callers see only defined triggers. Distinction is load-bearing: whole-field null vs per-trigger null have DIFFERENT semantics and must not conflate (tests in `packages/core/tests/design/animation/cascade.test.ts` pin the decision table).

204. **`useElementAnimations` accepts `AnimationContext` OR `ElementAnimations`** — Both web and RN hooks accept `animations` as `ElementAnimations | AnimationContext | null | undefined`. Runtime discriminant via `isAnimationContext()` checks for `'identity' | 'variant' | 'template' | 'element'` keys. Dev mode throws on mixed-key inputs (shape with both context keys AND trigger keys) because these keysets are disjoint by contract; silent classification would drop half the input. Production preserves permissive behavior. Resolution is memoized by param identity.

205. **Blob v2 catalog — `BLOB_CATALOG`** — Exported from `mythik`. `Record<CuratedBlobName, BlobShapeDef>` with 6 hand-curated entries: 5 organic (`organic-1..5`) + `circle`. Each entry has `name`, `viewBox: '0 0 W H'`, and a valid SVG `path` closed with `Z`. Custom user shapes use `shape: 'custom-svg'` (sentinel member of `BlobShapeName`, NOT in the catalog map). Aesthetic intent: balanced rounded, elongated diagonal, asymmetric multi-lobe (all-cubic to avoid T-reflection cusps), horizontal flowing ribbon, sharply asymmetric.

206. **Blob v2 type surface** — `BlobShapeName`, `CuratedBlobName`, `BlobShapeDef`, `BlobPreset`, `BlobMotionPreset`, `BlobMotion`, `BlobInstance`, `BlobV2Config`, `BlobRenderStyle`, `BlobSpec` all exported from `mythik`. `BlobV2Config` accepts TWO mutually-exclusive forms (preset vs explicit `blobs[]`) — runtime-enforced at resolver level, type-level relaxed for JSON ergonomics. `(string & {})` branded intersection preserves literal autocomplete for `'primary'`/`'accent'` color keywords while accepting arbitrary hex strings. `BlobRenderStyle` makes `opacity` + `blur` REQUIRED (post-resolution, defaults applied); `BlobInstance` makes them optional (pre-resolution input).

207. **`resolveBlobLayer(config, palette)` — pure fn, both forms** — Exported from `mythik` via `packages/core/src/design/background/blobs/resolver.ts`. Explicit form: for each `BlobInstance`, resolves palette keywords to hex, looks up catalog shapes, applies `opacity`/`blur` defaults using `??` (preserves explicit `0`), converts `BlobMotion` (drift/rotate/scale) to `ElementAnimations.ambient` inline animations. Preset form: hydrates curated `organic-duo` / `organic-trio` / `circle-pair` compositions from `PRESET_SEEDS`; `BlobMotionPreset` values (`drift-gentle`/`drift-fluid`/`drift-snappy`/`static`) map to `BlobMotion` via `PRESET_MOTION`. Ambiguous `{ preset, blobs }` prefers preset + dev-warn. Empty `palette: []` falls back to `['primary']` + dev-warn.

208. **Custom-svg error policy (fail-loud dev, degrade prod)** — `shape: 'custom-svg'` requires both `path` and `viewBox` as non-empty strings. Dev (`NODE_ENV !== 'production'`): throws with field-specific message (`"custom-svg requires a non-empty path. Got path=undefined."`). Prod: skips the malformed blob + `console.warn`, preserving app stability. Rationale: specs in production should have passed validation; crashing the whole app over one bad blob is disproportionate. Ambiguity policy (`preset` + `blobs` both set) is weaker — only dev-warn, no throw — because there is a defensible winner (preset) and no rendering is broken.

209. **Blob motion → `ElementAnimations.ambient` conversion** — Each `BlobMotion` dimension becomes one `InlineAnimation` on the `ambient` trigger: drift → 3-keyframe translate (`0%`→origin, `50%`→(range.x, range.y), `100%`→origin); rotate → 2-keyframe rotate (`from`→`to`); scale → 2-keyframe scale (`from`→`to`). All three use `direction: 'alternate'` + `iterations: 'infinite'`. Emission order: drift → rotate → scale. Single-dimension motion returns a scalar `AnimationRef`; multi-dimension returns an array — both valid per the `AnimationRef | AnimationRef[]` union. Perceived cycle duration: drift = 1× `duration` (symmetric trajectory), rotate/scale = 2× `duration` (forward + reverse iteration). Motion presets (`drift-gentle`: 28s/small/ease-in-out, `drift-fluid`: 20s/wide/ease-in-out, `drift-snappy`: 14s/medium/linear, `static`: no motion).

210. **`validateBackgroundCaps(input)` — performance caps validator** — Exported from `mythik` alongside `validateAnimationCaps`. Input shape `{ blobs?, layers? }`; output shape `{ warnings: string[], errors: string[] }` (shared `AnimationValidationResult` type). Caps: blobs per background (soft 8 / hard 16), layers per background (soft 6 / hard 10), custom-svg path length (soft 500 / hard 2000 chars, only applied when `shape === 'custom-svg'` AND `path` is a string), motion dimensions per blob (soft 2 / hard 3). Threshold semantics are strictly-over (`>`).

211. **`useShapeAnimations(ref, animations, options)` — Layer 3 web runner** — Exported from `mythik-react` via `packages/react/src/animation/useShapeAnimations.ts`. React hook for SVG-child animations (`<path>`/`<circle>`/`<rect>`/`<g>`…). Consumes the same `ElementAnimations` contract as `useElementAnimations` but narrowed to the `ambient` trigger ONLY; shape children have no hover/focus/active contract and no distinct mount ceremony. Attaches CSS animations via `el.style.animation` (surgical, preserves other inline styles); keyframes register once through the CSSOM singleton (zero `dangerouslySetInnerHTML`) and dedupe by hash so multiple shape instances with the same recipe share one CSS rule. Dev mode warns when non-ambient triggers are passed. Production silently ignores them. `options.recipes` SHOULD be stable for useMemo performance.

212. **`useShapeAnimations(animations, options)` — Layer 3 RN runner** — Repository-preview implementation in `packages/react-native/src/animation/useShapeAnimations.ts`; it is not part of the supported npm publish surface yet. Reanimated parity of rule 211: returns `{ animatedProps }` that the consumer spreads onto `Animated.createAnimatedComponent(Path)` from `react-native-svg`. Uses the `HARD_PER_TRIGGER` (=6) fixed-pool `useSharedValue` pattern (`useSharedValueArray` helper, also exported) so React Hook count stays stable. Reuses `composeRNStyle(contributions, interpolate, interpolateColor)` shared with `useElementAnimations` — single composition pipeline for View-style and animated SVG props. Relies on `react-native-svg` v13+ auto-translating the transform array into SVG `transform="..."` strings. Same dev-mode non-ambient-trigger warning as the web hook.

213. **Cross-platform Layer 3 parity pins** — `buildCSSKeyframes` (web) and `buildReanimatedSpec` (RN) interpret the same resolved `AnimationSpec` identically on load-bearing invariants: duration agreement (ms count matches regardless of input form `'28s'`/`'28000'`), keyframe stop count (web `%` markers match RN `inputRange` length), direction semantic (`'alternate'` token ⇔ `timing.reverse=true`), iterations `'infinite'`/numeric count, animated-prop enumeration (`translateX/Y`/`rotateDeg`/`scale`).

214. **`Template.animations` field + `$prop`/`$state`/`$cond` interpolation** — `TemplateDefinition` supports `animations?: Record<string, unknown> | null`. Type is pre-interpolation (JSON shape with `$`-expression placeholders); runtime shape is `ElementAnimations` after `resolveDeepWithProps` traversal in the renderer template branch. Three-branch semantics: field absent = inheritance-neutral (no emission), whole-field `null` = forwarded verbatim (cascade-neutral with explicit intent), object = `$prop.X` / `$state.X` / `$cond`/`$then`/`$else` all resolve against merged template-defaults + consumer-element-props.

215. **`ResolvedVariant.animations` passthrough with `$path` resolution** — `ResolvedVariant` supports `animations?: Record<string, unknown> | null`. `resolveVariant` routes the field through `resolveTokenRefs` (same mechanism as `style`/`hover`/`active`/`focus`) so `$path` references at the top level of each trigger value resolve (e.g. `animations: '$animations.interactive'`). Three-branch semantics mirror rule 214. `resolveTokenRefs` is one-level-deep: nested structures (`mount: { recipe: '$recipes.X' }`) pass through unchanged — downstream animation runtime layers are responsible for any deeper `$` resolution. Expression-system scope: only `$path` (token-tree) lookups are recognized here; `$prop`/`$state`/`$cond` are template-layer concepts.

216. **End-to-end animation cascade at renderer time** — The render engine merges identity + variant + template + element animations via `mergeElementAnimations` and emits the merged result as `resolvedProps.animations` on the primitive render node. Box (web + RN) consumes the single final prop via `useElementAnimations`; no cascade plumbing lives on Box itself. Regular-element branches merge `identity + variant + element`; template branches merge `identity + template + element`; custom elements add the element-definition level described in rules 226-234. Element-level `animations` resolves through unified `resolveDeep` before merging so `$state`/`$cond`/`$token`/`$prop` expressions inside animation configs become concrete values. `scanDeps(element.animations)` tracks state changes deep inside animation expressions so they dirty the render cache. Whole-field `null` at identity level is cascade-neutral. Cached `resolvedProps` omit `animations` when no cascade level contributes, preventing stale-animation leakage across theme/spec changes.

217. **`BlobsLayerConfig` + `resolveLayer` dispatch** — `LayerConfig` includes a blobs variant: `BlobsLayerConfig = LayerCommonProps & { type: 'blobs' } & Omit<BlobV2Config, 'opacity'> & { blobOpacity?: number }`. The `Omit<..., 'opacity'> + blobOpacity` rename resolves a semantic collision: `LayerCommonProps.opacity` is the layer-container wrapper alpha; `BlobV2Config.opacity` is the per-blob fill default. Keeping both as `opacity` at the same nesting level would compose multiplicatively. `LayerSpec` has a matching `{ kind: 'blobs'; config: BlobsLayerConfig; common: LayerCommon }` variant; unlike other `LayerSpec` kinds, the blobs variant carries unresolved config forward because palette/catalog/motion resolution needs tokens outside `resolveLayer` scope.

218. **`BackgroundStack` palette threading + dispatch** — `BackgroundStack` (web + RN) accepts an optional `palette?: { primary: string; accent: string }` prop. The internal `renderLayer` helper routes blob layers with palette to `BlobLayer`; without a palette, a dev-mode warning fires instead of silently rendering an empty blob layer. A `toBlobV2Config` helper strips layer-level fields (`type`/`opacity`/`blendMode`/`zIndex`) and promotes `blobOpacity` → `BlobV2Config.opacity` at the render boundary, keeping the two opacity axes cleanly separated.

219. **`BlobLayer` web — SVG blobs + `useShapeAnimations`** — `packages/react/src/background/BlobLayer.tsx`. Consumes `{ config: BlobV2Config, palette }` and emits one `<svg><path/></svg>` per resolved `BlobSpec`. The ref binds `useShapeAnimations` to the inner `<path>` (not the outer `<svg>`) so keyframe transforms apply to shape geometry; animating the wrapper would compose with the CSS position/size and produce visible positional drift under translate motion. JSX-native rendering throughout (no `dangerouslySetInnerHTML`). `resolveBlobLayer(config, palette)` is wrapped in `useMemo([config, palette])` so animation freshness does not force unnecessary resolve + keyframe-register work across all blobs.

220. **`BlobLayer` RN — react-native-svg + Reanimated `useAnimatedProps`** — `packages/react-native/src/background/BlobLayer.tsx`. Mirrors web prop surface; platform deviations: (a) animation flows through `animatedProps` spread onto `Animated.createAnimatedComponent(Path)` instead of imperative `el.style.animation`; (b) opacity is a style prop, not an SVG attribute; (c) static rotation uses RN's transform-array shape `[{ rotate: deg }]`. `blob.blur` fires a dev warning and no filter is applied because RN filter parity is limited. `BackgroundStack` (RN) warns on non-`normal` blendMode because RN has no `mixBlendMode` equivalent. `resolveBlobLayer` is memoized for parity with web.

221. **MythikRenderer root mount for `LayerBackground` v2** — When `tokens.identity.background` is a LayerBackground (`isLayerBackground` returns true — object carrying `color` or `layers`, no `style` field, rejects empty `{}` + arrays), the renderer wraps the rendered tree in a positioned container with `<BackgroundStack>` as a sibling inside a stacking context (`isolation: isolate`). The isolation context prevents per-layer `zIndex` values from leaking out to occlude the content wrapper. Palette threads from `tokens.colors.{primary, accent}`; missing/malformed colors fire a diagnostic dev warning at the renderer seam. Root wrappers carry `data-sv-renderer-root="v2"` (web) and `testID="sv-renderer-root-v2"` (RN) markers for test selection. `Spec.tokens?: Record<string, unknown>` is part of the public type graph so the renderer reads spec tokens without casts and the spec-validator accepts the field.

222. **Legacy background + per-element blobs removed** — `resolveBackgroundCSS`, `resolveBlobStyles`, `BackgroundConfig`, `BlobStyle`, `background.ts`, and `tokens.backgroundCSS` injection are removed from `packages/core`. `Box` no longer has a `backgroundBlobs` prop and is now a pure surface-styled wrapper. App-level background lives exclusively at `tokens.identity.background`. `IdentityConfig.background` is `LayerBackground`; `DEFAULTS.identity.background` is `{}` (empty LayerBackground, no root mount by default). `useDesignTokens` (web + RN) reads `identity.background.color` + `identity.background.layers`, omitting undefined keys so `isLayerBackground` does not fire on dead data. The `isLayerBackground` rejection for objects with `style` remains as malformed-spec defense against legacy-shape holdovers.

223. **`IdentityConfig.animations` on the type graph** — `IdentityConfig` includes `animations?: ElementAnimations | null`. TypeScript preset authors can declare `identity: { animations: {...} }` under `PresetDefinition.tokens.identity` without casts. Semantics: whole-field `null` is cascade-neutral, per-trigger `null` disables and blocks inheritance, absent = inheritance-neutral.

224. **`/tokens/resolved` store path — reactive fully-resolved tokens** — Factory persists `resolvedTokens` to the store at `/tokens/resolved` at `createMythik` initialization and after every `updateTokens` call. Companion path `/tokens/raw` holds only the raw input accumulated through `updateTokens` (useful for export/inspection). `/tokens/resolved` holds the fully-resolved token tree: DNA-derived colors, DEFAULT-merged identity, and downstream consumer values. `MythikRenderer`'s v2 `LayerBackground` root mount reads from `/tokens/resolved` so preset swaps and playground control changes trigger fresh reads and remount the `BackgroundStack` with the new layers.

225. **`Select` primitive listbox portals to `document.body`** — The Select dropdown's listbox panel (`packages/react/src/primitives/select.tsx`) renders via `React.createPortal(..., document.body)` instead of as a descendant of the select wrapper. Positioning uses `position: fixed` with coordinates tracked from the trigger button's `getBoundingClientRect()` and updated on open, scroll, and resize via `useLayoutEffect`. Outside-click detection checks both the wrapper ref and the listbox ref. Portaling to body escapes nested stacking contexts across the renderer tree, so the listbox competes with other top-level portals such as modals and toasts. `zIndex: 9999` is retained for safety above ambient overlay layers.

### Known limitations

- The `getActiveTokens()` helper resolves theme tokens on every call — within one element render it may be called 2-3 times. Memoize per render-cycle if profiling shows it matters.
- `instancePropsCache` diff uses shallow reference equality — object/array props sourced from `$state` (which produce new references each render) over-invalidate every render even when contents are equal. Deep-equality diff deferred pending profiling (see rule 233 + engine.ts docstring).
- Template branch inside custom element expansion doesn't currently run the `variant` or `elementDef` cascade slots — only `identity + template + element`. Extending to full 5-level is a follow-up if a real need emerges.

---

## Layer 3 Custom Elements

226. **Custom elements are first-class primitives** — Custom elements registered via `plugins.registerElement` participate in the full render contract. Consumers apply `animations`, `hover`, `active`, `focus`, `transition`, `motion`, `visible`, `key`, and `style` on the instance — identical syntax to built-in primitives. These apply to the OUTER primitive of the expansion (black-box boundary).

227. **ElementRenderNode supports all Element declarative fields** — Authors declare `animations`, `hover`, `active`, `focus`, `transition`, `motion`, `visible`, `key` inside their render tree. Each field behaves identically to `Element` semantics for the primitive rendered at that position. `ElementRenderNode.children` type is `Array<ElementRenderNode | '$children'>` — string literal `'$children'` marks the slot position for consumer children.

228. **ElementDefinition.variants + theme fallback** — Authors declare variants on the definition via `ElementDefinition.variants: Record<string, ElementVariantSpec>` where `ElementVariantSpec` has the same shape as primitive variant specs (`props`/`style`/`hover`/`active`/`focus`/`transition`/`animations`). Consumer's `{ variant: 'name' }` resolves: (1) `ElementDefinition.variants[name]` first, (2) `tokens.components[elementType].variants[name]` as theme-level fallback. Variant props merge into consumer props pre-expansion (consumer wins last, variant beats definition default).

229. **5-level animation cascade: identity → variant → elementDef → template → element** — Animation cascade includes an `elementDef` level between variant and template. `elementDef` is the author's declaration on a primitive inside a custom element expansion (sourced from the expanded element's own `animations` field when propContext is active). Defaults to `undefined` (inheritance-neutral) outside custom elements. `mergeElementAnimations` accepts all 5 levels via the `AnimationContext` interface.

230. **Custom element instance black-box — consumer affects outer only** — Consumer's instance-level declarations apply to the OUTER primitive of the expanded tree. Inner primitives are the author's domain. Inner primitives receive identity cascade, their own variant/elementDef declarations, and full expression resolution. Inner primitives do NOT receive consumer's instance-level `animations`/`hover`/`motion`/`style`/`visible`/`key`. A future `::part()`-style API can layer on top of this contract without breaking it.

231. **`$prop` is nearest-enclosing-custom-element-scoped** — Inside a custom element's expanded tree, `$prop` references resolve against THAT custom element's `mergedProps`. Nesting a custom element pushes a new `propContext`; the outer context is shadowed, not merged. Thread values via explicit prop passthrough when nested access is needed. Matches CSS custom-property scoping semantics.

232. **`$children` marker in custom element render trees** — Authors write `children: [..., '$children', ...]` in their render tree; consumer's children slot at each marker position during expansion via the `consumerChildrenIds` parameter of `expandElementToSpec`. Multiple markers each splice the full consumer children. Same slotting semantics as spec templates: consumer children retain their enclosing element IDs and render through unified dispatch.

233. **Custom element cache invalidates on consumer prop changes via `/__prop/<name>` sentinels** — Cache dep scanner (`scanDeps` in `deps.ts`) tracks `$prop` references as `/__prop/<name>` sentinel paths. At custom-element dispatch time, an `instancePropsCache` diffs current vs previous `mergedProps`; changed keys are injected into the active changed-paths set (scoped to the expansion render via `try/finally`) so inner primitives that declared those prop refs correctly invalidate. Shallow reference equality can over-invalidate object/array props sourced from `$state`; see `engine.ts` docstring.

234. **Custom element error boundary at instance level** — Errors anywhere inside a custom element's expansion (missing primitive, resolver throw, etc.) surface as an `_error` RenderNode caught by the `renderElement` `try/catch` wrapper. Consumer error handling does not need to know the author's internal structure; errors are isolated per instance so a broken custom element does not crash sibling renders.

235. **Custom elements under `repeat`** — Custom elements dispatched under `element.repeat` (`count`, `statePath`, or `source`) render N instances as expected, same as primitives. Repeat handling applies before custom-element dispatch so the repeat gate fires for all element types uniformly. `$index` / `$item` context threads through consumer props into the expansion's `propContext` so inner primitives see the correct iteration values.

236. **Custom element render trees can reference spec-level templates** — A custom element's render tree may use a type that resolves to a spec-level template (e.g. `render: { type: 'section-template' }`). The expansion (`expandElementToSpec`) propagates `spec.templates` and non-colliding `spec.elements` entries onto the expanded sub-spec so recursive template dispatch finds the definition. Template children references (e.g. `template.children: ['my-id']`) to outer-spec elements also resolve during recursion. Template's own `$prop` context is its own `mergedProps`, not the custom element's — standard template semantics are preserved.

237. **`plugins.registerElement` exposed on `PluginLoader`** — `PluginLoader` exposes `registerElement(def: ElementDefinition)` and `getElements(): ElementDefinition[]`. Definitions are staged internally; `factory.applyPlugins()` iterates `plugins.getElements()` and calls `elements.register(def)` for each, skipping entries already present (idempotent with `config.elements`). `count()` includes the element definitions.

238. **`validateSpec` accepts `elementRegistry` in `ValidationContext`** — An `el.type` not present in `primitiveRegistry` is no longer flagged as "unknown primitive type" when `elementRegistry` knows it. Suggestion candidates (for auto-fix Levenshtein matches) merge keys from both registries. `factory.ts` threads `elementRegistry: elements` through validation call sites so registered custom elements validate like built-ins.

239. **Event bindings may be `$prop` expressions** — Inside a custom-element render tree, `element.on.<event>` can be `{ "$prop": "<propName>" }`. The renderer detects the `$prop` shape at binding level and calls `resolveDeep` to substitute the consumer's supplied value (typically an action array). Any other binding shape (plain object, array of actions, `TransactionBinding`) is passed through verbatim; inner `$state` / `$template` inside binding params stay lazy so the action dispatcher resolves them at press time. Eager param resolution only activates inside a `repeat` where `$item` binding is required for correctness.

240. **Consumer `variant` lives under `props`** — The renderer reads the variant name from `resolvedProps.variant`. A top-level `variant` field on the element object is silently ignored. Applies uniformly to built-in primitives (button/box/etc. with `tokens.components` variants) and Layer 3 custom elements (with `ElementDefinition.variants`). Consumer specs: `{ "type": "stat-card", "props": { "variant": "primary", ... } }` — NOT `{ "type": "stat-card", "variant": "primary", "props": {...} }`.
241. **`/ui/selectedRow` is framework-reserved** — framework writes the clicked row to this path before dispatching row interactions (column actions in `columns[].actions[].onPress` AND direct `onRowClick`). Single-selection scope per screen. Both row interaction types use the same lazy-resolution contract — `$state` / `$template` in action `params` resolves at click time against the freshly-written row. See `ai-context-runtime-semantics.md § 2.1` for the row context model, write-owner (the `createRowDispatcher` helper at `packages/react/src/runtime/row-dispatcher.ts`), lifetime, read patterns, and multi-table caveat.
242. **Column action expressions resolve at press time via primitive `lazyActionPaths` declaration** — `$state`/`$template` inside `columns[].actions[].onPress` params resolve at click time, not render time. Any `$state` path returns its current value at press; framework writes the clicked row to `/ui/selectedRow` before dispatch (see rule 222 + runtime-semantics §5.1), so `$state: "/ui/selectedRow/*"` is a canonical pattern. Underlying mechanism: primitive declares `lazyActionPaths` in `PRIMITIVE_PROP_SCHEMAS` (table declares `['columns[].actions[].onPress']`); engine keeps subtree raw at render; dispatcher resolves at press. See `ai-context-runtime-semantics.md § 1.3`.
243. **CRUD endpoint generates 3 routes from 1 declaration** — an endpoint with `crud: { table, primaryKey, insertable, updatable }` generates `POST <path>`, `PUT <path>/:id`, `DELETE <path>/:id`. Do not declare 3 endpoints. See `ai-context-runtime-semantics.md § 3.1`.
244. **`/api/auth/login` expects `{ username, password }`** — not `email`. Use `loginBody` template to map consumer email convention → framework username. See `ai-context-runtime-semantics.md § 3.2`.
245. **Query endpoints envelope responses in `{ data: [...] }`** — shape is `{ data, total?, page?, pageSize?, totals? }`. Consumer specs read `response.data` via state; envelope is NOT auto-unwrapped. See `ai-context-runtime-semantics.md § 3.3`.
246. **Browser vs Server entries — `mythik` vs `mythik/server`** (v0.1.0). The default `mythik` entry is browser-safe by construction: zero transitive Node-only imports. `FileSpecStore`, generic SQL stores (`SqlSpecStore`, `SqlVersionedSpecStore`, `SqlEnvironmentStore`), SQL drivers (`createSqlDriver`, `getSqlStoreDdl`), and SQL Server compatibility stores live in `mythik/server`.

247. **`derive` and `dataSources` are processed at runtime per spec mount** (v0.1.0). When `spec.derive` is present, the framework instantiates a `DeriveEngine`, evaluates all derive paths in topological order at mount, and re-evaluates dirty paths reactively on state changes. Derive paths are protected: setState targeting a derive path errors at validate time and runtime. When `spec.dataSources` is present, the framework instantiates a `DataSourcesEngine`, performs initial fetches (deferred to reactive resolution when URL template deps are undefined), and re-fetches reactively when dependencies change. The action `refreshDataSource` (params: `{ id: string }`) is automatically registered for any spec with dataSources. URL templating requires the explicit `{ $template: '...' }` form — plain strings with `${...}` are NOT substituted (validator catches at load). See `ai-context-runtime-semantics.md` for lifecycle, ordering, error degradation, and state protection details.

248. **CLI is the only approved path for spec writes** (v0.1.0). Three approved forms: (a) **Shell** - `mythik push <id> --from-file spec.json` / `mythik patch <id> --from-file patch.json` (or intentional stdin via `--from-file -` / pipe without `--from-file`); (b) **Bulk** - `mythik push --from-dir ./specs/` (sequential, continue-on-error, no rollback; partial state on failure recovers by fixing failures and re-running the same command); (c) **Programmatic** - `import { runPush, runPatch } from 'mythik-cli/api'` for IDE tooling, test harnesses, CI scripts. NEVER call `SpecStore.save()` directly from application code. It is an internal persistence primitive marked `@internal`; validation happens at the CLI / engine tier. Bypassing this path skips validation and can produce runtime errors visible only at render time. `mythik patch --from-file <path>` is preferred over inline JSON for any patch containing `$state`, `$template`, `$auth`, or `$row` references (PowerShell expands `$<word>` in double-quoted strings).

249. **`mythik lint` detects known anti-patterns in specs and consumer code** (v0.1.0).

A new CLI command + programmatic API:
- `mythik lint [--from-file <path> | --from-dir <folder>]` — bulk or targeted lint
- `--specs-only` / `--code-only` — filter by surface
- `--code-dir <path>` — override default code scan root (default: `./src`)
- `--json` — machine-readable output
- `import { runLint } from 'mythik-cli/api'` — programmatic equivalent

**4 rules in v0.1**:
- `spec-row-literal` (warning) — `$row` is not an expression handler; use `$state: '/ui/selectedRow/<key>'`. Validator-resident in `spec-validator.ts` (also surfaces during `mythik push` and `mythik validate`).
- `spec-crud-id-collision` (error) — `endpoint.path` ending `/:id` combined with `crud: {}` produces `/path/:id/:id`. Strip trailing `/:id`. Walks the object-shaped `endpoints: Record<string, EndpointConfig>`; emits JSON Pointer paths `/endpoints/<name>/path`.
- `spec-auth-domains-port` (warning) — `auth.authDomains[i]` containing `:port` strips the port silently (matcher uses hostname-only via `URL.hostname`). Walks the `string[]` shape; emits JSON Pointer paths `/auth/authDomains/<index>`.
- `code-store-save-bypass` (error) — calling `*store*.save()` outside `packages/core/` and `packages/cli/` bypasses validation. Use `runPush` from `mythik-cli/api` or `mythik push --from-file`. **Known scope**: matches `<Identifier>.save()` callees only (e.g. `myStore.save(...)`). Does NOT detect `this.store.save()`, `<obj>.<store>.save()`, or `(await getStore()).save()` patterns — these slip through the AST scanner. Generation-level guidance in `ai-context.md` (anti-patterns section) covers all variants; the lint rule is one layer of defense-in-depth, not a complete catch. Widening the scanner to handle `PropertyAccessExpression` callees is tracked as a v0.2+ candidate if real consumer code shows these patterns slipping through generation guidance.

**Code rules require TypeScript ^5.0.0 as peerDependency** (optional). If not installed, code rules emit one warning finding `lint-meta-no-typescript` (severity matches `LintSeverity = 'error' | 'warning'`) and skip cleanly. Spec rules run independently.

Spec rules are added to `spec-validator.ts` (rule 1) and `api-spec-validator.ts` (rules 2+3) and run on EVERY validation (push, validate, lint) — defense-in-depth. Code rules run only via `mythik lint` (no push integration; push doesn't see consumer code). `ApiSpecValidationResult` gains optional `lintWarnings?: ValidationError[]` field for rules 2+3 (additive non-breaking; preserves existing `errors: string[]` shape). `SpecValidationResult` also gains optional `lintWarnings?: ValidationError[]` to propagate findings across the `DocumentHandler.validate` boundary (`api-handler.validate` forwards `validateApiSpec().lintWarnings` so `mythik validate` and `mythik push` actually surface rules 2+3).

Exit codes: 0 = no errors, 1 = errors found, 2 = runtime error (e.g., unreadable file).

See `ai-context.md` for spec-gen anti-patterns the AI must NOT generate.

250. **Storage tables are initialized explicitly, never silently at runtime** (v0.1.0). SQL-backed stores operate against three tables the consumer database must already have: `screens` (base, required), `screen_versions` (version history), and `screen_environments` (environment promotions). Use `mythik init-store --dialect <sqlserver|postgres|mysql|sqlite> --dry-run` to inspect canonical idempotent DDL, initialize a local SQLite file with `mythik init-store --dialect sqlite --target ./mythik.db`, or initialize a reachable SQL Server store with explicit `--server`, `--database`, `--user`, `--password`, `--encrypt`, and `--trust-server-certificate` flags. The same schema is described in `ai-context.md § Storage Setup`. Runtime reads/writes do not create missing tables. Production deployment scripts should verify required columns after apply.
251. **`security.exposeErrors` controls render error detail** (v0.1.0). Default is `true`; set `createMythik({ security: { exposeErrors: false } })` for production-like hosts that must avoid leaking error messages/stacks. `_error` render nodes write diagnostics to `/ui/renderErrors` only when exposure is enabled. Primitive/component exceptions are caught by `MythikRenderer`'s error boundary: development + exposed mode shows an overlay with message and component stack; production or `exposeErrors: false` shows a neutral placeholder. The overlay resets when the spec changes so a corrected spec can recover without remounting the host.
252. **Icon packs register through `plugins.setIconRenderer`** (v0.1.0). Mythik does not bundle Phosphor/Lucide/etc. Register one host-level renderer from `MythikApp.onPlugins`; the built-in `icon` primitive keeps identity behavior and calls the renderer with `{ name, size, weight, color, style }`. If the placeholder circle renders, verify `onPlugins` registered the renderer and the consumer is not validating against stale tarballs or source aliases.
253. **`overridePrimitive('icon')` returns a RenderNode, not JSX** (v0.1.0). Use it only for full primitive replacement. The renderer function must return `{ type, props, children }` with `_component` in props when targeting React. Returning `<Icon />` directly is not the primitive renderer contract and bypasses the built-in icon identity wrapper.
254. **CLI explicit input wins over ambient stdin** (v0.1.0). For `mythik push`/`mythik patch`, `--from-file <path>` reads the file even if the host process exposes non-TTY stdin. Intentional stdin remains supported through `--from-file -` or by piping without an explicit file. `--from-file` plus a positional patch argument is still a conflict.
255. **`runPatch` versions in every output mode when `author` is provided** (v0.1.0). `SpecEngine.patch` applies and validates patches. CLI/API `runPatch` persists through the normal `store.save` path without `author`; with a versioned store + `author`, it captures the patched document and writes once through `saveVersion`, preserving lazy-bootstrap pre-patch history. JSON/TOON success output includes additive `versioned` and `version` metadata.
256. **DB-first specs require an explicit local sync step** (v0.1.0). In DB-first workflows, the database is source of truth and `specs/*.json` files are bootstrap/snapshot artifacts until refreshed. After `mythik patch`, run `mythik pull <id>` and write the stdout back to the local spec before committing or pushing from files; otherwise a later full `push` can overwrite DB-only patches.
257. **`/ui/selectedSpatialItem` is framework-reserved** - `spatial-map` writes activated item context for JSON `onItemPress` actions before dispatch. The payload is domain-neutral (`itemId`, `zoneId`, `status`, `position`, `rotation`, `shape`, `metadata`, full `item`, optional `zone`). `selectedItemPath` can override the path for isolated maps. Action params under `onItemPress` resolve lazily at press time via the primitive `lazyActionPaths` declaration, so `$state: "/ui/selectedSpatialItem/itemId"` reads the item just pressed. Programmatic function callbacks pass through without framework state writes, matching table callback semantics. Menus, drawers, modals, and inspectors are composed outside the primitive.
258. **`spatial-map` interaction hardening rules** - Canvas-level presses are handled at the SVG surface so empty zone areas can clear selection or dispatch `onCanvasPress`; item handlers stop propagation so item activation is not treated as a canvas press. Context dispatchers write context once, then pass ActionBinding arrays through unchanged so `MythikRenderer.dispatchAction` preserves serial async action-chain semantics. `interactionPolicy.selectItems` and `interactionPolicy.activateItems` are independent: selection can update `selectedItemPath` without dispatching `onItemPress`, including readonly maps explicitly opted into selection; activation controls action dispatch. In programmatic React mode, function callbacks pass through and consumers own selected visual state via `selectedItemId` or direct writes to `selectedItemPath`.

259. **`/ui/spatialItemChange` is framework-reserved** - `spatial-map` writes item edit-change context before dispatching JSON `onItemChange`. The payload is domain-neutral and includes `changeType`, `itemId`, `previousItem`, `nextItem`, `previousPosition`, `position`, and `delta`. `itemChangePath` overrides the path for isolated maps. Programmatic callbacks pass through and own their own state.

260. **`spatial-map` edit movement is controlled and data-first** - In `mode: "edit"`, drag preview is local and persistence occurs on drop through `onItemChange`/`onZoneChange`; keyboard arrows emit one change per valid move. Edit mode does not dispatch `onItemPress` by default; set `interactionPolicy.activateItems: true` only when edit-time activation is intentional. `editPolicy` controls movement, resize, bounds, keyboard steps, and coordinate precision. Current viewBox bounds clamp `item.position` to the `viewBox`; full collision and polygon/path point editing remain separate future primitive capabilities; item resize/rotate use `transform` plus `rotation`, and zone resize uses `transform.scaleX/scaleY` while preserving `shape`; snap/guides are configured through `editPolicy.snap` and `editPolicy.guides`. Create/duplicate/delete are composed generically today with `onCanvasPress`, `$uniqueId`, `$array`, and modal confirmation outside the primitive.

261. **`/ui/spatialCanvasPress` is framework-reserved** - `spatial-map` writes SVG canvas press context before dispatching JSON `onCanvasPress`. The payload is domain-neutral with `kind: "canvas"`, `mode`, effective `point`, `rawPoint`, optional `snap`, `viewBox`, optional `zoneId`, optional `zone`. `canvasPressPath` overrides the path for isolated editors. Item handlers stop propagation, so item activation is not treated as a canvas press. Use this path to compose click-to-place workflows externally; the primitive does not create domain objects itself.

262. **`$uniqueId` generates deterministic source-scoped ids** - Syntax: `{ "$uniqueId": true, "source": { "$state": "/items" }, "field": "id", "prefix": "item-", "padding": 2 }`. The handler scans the source array, stringifies existing field values, and returns the first unused prefixed number from `start` (default `1`). It is intended for JSON-composed local/editor objects and optimistic drafts; backend-owned database ids still come from the backend.

263. **Conditional branches deep-resolve selected structured values** - `$cond` and `$switch` resolve nested expressions inside the selected object/array branch, while non-selected branches remain lazy. This allows action params such as `{ "$cond": ..., "$then": { "id": { "$uniqueId": true, ... }, "position": { "x": { "$state": "/ui/spatialCanvasPress/point/x" } } } }` to materialize as plain data before `setState`. Keep `$state` values as string paths; `{ "$state": { "$state": "/path" } }` is invalid.

264. **`spatial-map` status is visual; `disabled` controls interactivity** - Item `status` values such as `available`, `blocked`, or `inactive` select semantic styling through `statusStyles` and remain selectable, activatable, draggable, keyboard-movable, duplicable, and deletable when the relevant policies allow those operations. Use `disabled: true` only for items that must be intentionally non-interactive. `canvasGuide` is the generic placement/inspection visual aid: drive `canvasGuide.visible` from consumer-owned state (for example `/ui/floorEditor/placeMode`) to render a dotted SVG crosshair at the current map pointer without mutating state on pointer move. Add/place still persists through `onCanvasPress` and `canvasPressPath`. When `editPolicy.snap` is enabled, the visual guide uses the same effective point that `onCanvasPress` writes to `/ui/spatialCanvasPress/point`.

265. **`spatial-map` snap/guides are generic editor aids** - `editPolicy.snap` computes effective coordinates for item drag, zone drag, keyboard movement, item/zone resize handles, and canvas placement. Supported snap sources are grid snap and item-center snap. Grid threshold is per-axis, so X and Y can snap independently; item-center wins equal-distance ties over grid on the same axis. Keyboard movement with grid snap advances by grid stops on the moved axis. Zone movement snaps by the center of transformed derived zone bounds, or by `position` when no bounds exist. `editPolicy.guides` renders contextual authoring overlays such as snap lines and coordinates. The framework preserves JSON-first persistence: `onItemChange` emits snapped `nextItem.position`, `onZoneChange` emits snapped `nextZone.position` or resized `nextZone.transform`, and `onCanvasPress` writes `point` as the effective coordinate plus `rawPoint` as the original pointer coordinate. Snap/guide visuals do not create, move, or persist domain objects by themselves.

266. **`spatial-map` resize uses item transform, not shape mutation** - Runtime resize writes `nextItem.transform.scaleX/scaleY` and keeps the base `shape` stable. Simple item shapes derive local edit bounds from geometry; arbitrary `path` items require `localBounds` for resize handles. This keeps one generic editing model across rect, circle, ellipse, polygon, and path shapes and avoids repeated lossy rewrites of polygon points or SVG path data.

267. **`spatial-map` rotate/resize emit lazy item-change contexts** - Pointer resize/rotate preview locally and commit once on pointer release through `onItemChange`; keyboard resize/rotate emit one change per command. Resize contexts include `previousTransform`, `transform`, `previousLocalBounds`, and `localBounds`; rotate contexts include `previousRotation` and `rotation`; all runtime edits include complete `previousItem` and `nextItem`. Context transforms are normalized with the active edit policy. JSON specs persist edits with `$array: "replace"` from `/ui/spatialItemChange/nextItem` or the configured `itemChangePath`; wrap that same value in `editorCommit` when the screen needs undo/redo/dirty tracking.

268. **`/ui/selectedSpatialZone` is framework-reserved** - `spatial-map` writes selected/activated zone context for JSON `onZonePress` actions before dispatch. The payload is domain-neutral (`kind: "zone"`, `mode`, `zoneId`, optional `label`, `position`, `rotation`, optional `transform`, optional `localBounds`, `shape`, `metadata`, full `zone`). `selectedZonePath` can override the path for isolated maps. Programmatic callbacks pass through and consumers own selected visual state with `selectedZoneId` or direct writes to `selectedZonePath`.

269. **`/ui/spatialZoneChange` is framework-reserved** - `spatial-map` writes zone edit-change context before dispatching JSON `onZoneChange`. Runtime zone movement emits `changeType: "move"` and writes `nextZone.position`; runtime zone resize emits `changeType: "resize"` and writes `nextZone.transform.scaleX/scaleY`. Both include complete `previousZone`/`nextZone` records and preserve `nextZone.shape`, which keeps polygon/path geometry stable and leaves vertex/path point editing as a separate capability. Drag, keyboard movement, and zone resize handles use the same snap/guides resolver pattern as items; the movement snap anchor is the center of transformed derived zone bounds, or `position` when no bounds exist. Persist with `$array: "replace"` from `/ui/spatialZoneChange/nextZone` or the configured `zoneChangePath`; wrap that same value in `editorCommit` when the screen needs undo/redo/dirty tracking.

270. **Gradient cards** — `identity.gradients.cards = true | 'vibrant' | 'soft' | 'muted'` applies a primary→surface diagonal gradient on box surfaces with `surface: "card"`. Implemented via `applyGradientCardsCSS` at the surface CSS layer (mirrors `applyBorderElevationCSS` architecture) so primitives consume `surface.card` uniformly without per-component branching. Uses `backgroundImage` longhand to compose with the surface treatment's `backgroundColor` cleanly. Spec `style.background`/`backgroundImage`/`backgroundColor` overrides

271. **Modal portals to document.body** — Modal primitive wraps its render in `createPortal(tree, document.body)` so `position: fixed` escapes containing block traps. Required because CSS mount animations with `fill-mode: both` leave a final transform on ancestor elements, and any non-`none` transform on an ancestor scopes `position: fixed` to that ancestor instead of the viewport. SSR-safe via `typeof document === 'undefined'` fallback that returns the inline tree

272. **Gradient styles use `backgroundImage` longhand** — Spec elements that compose with framework surface treatments must use `backgroundImage` (not `background` shorthand) for gradient values. React warns about mixing shorthand `background` with longhand `backgroundColor` from framework `surface.*` styles. `applyGradientCardsCSS`, `text.tsx` gradient text, and `button.tsx` primary gradient all use `backgroundImage` to compose cleanly. For solid colors, use `backgroundColor` directly

273. **`editorSessions` declares generic undoable document paths** - `Spec.editorSessions` mounts framework-managed editor history for explicitly tracked document paths. Example: `"editorSessions": { "floor-layout": { "paths": ["/layout/items", "/layout/zones"], "maxHistory": 50 } }`. Paths must be non-empty absolute state paths and must not live under `/ui`; keep transient drafts, selected objects, modals, and placement modes consumer-owned outside the tracked document set.

274. **`/ui/editorSessions/<id>` is framework-reserved metadata** - Mounted editor sessions write readable metadata under `/ui/editorSessions/<id>`: `dirty`, `canUndo`, `canRedo`, `undoDepth`, `redoDepth`, `revision`, `savedRevision`, `lastCommitLabel`, `lastSavedAt`, `status`, `saveStatus`, `saveError`, `lastSaveAttemptAt`, and `validation`. Consumers may read this metadata for toolbar state and save banners; consumers should not write it directly. `lastCommitLabel` reflects the current top undo entry and is cleared when no undo entry remains.

275. **Use `editorCommit` for undoable document edits** - `editorCommit` applies one atomic user edit to a configured session and records previous/next values for undo/redo. Use it instead of plain `setState` when an edit should be undoable. Spatial editors persist item/zone changes by wrapping the usual `$array: "replace"` value in an `editorCommit` change targeting `/layout/items` or `/layout/zones`. `editorCommit` with `validate: true` validates after applying the edit and does not roll back automatically.

276. **Save transport remains backend-owned; `editorSave` is the normal framework path** - The framework does not provide a database adapter, but editor sessions can declare generic persistence through `editorSessions.<id>.persistence` and save with `editorSave`. Use `editorMarkSaved` only as a low-level escape hatch after an advanced/custom persistence step has already succeeded. `editorDiscard` restores the last saved snapshot and clears undo/redo. Dirty state is computed from tracked path equality against the saved snapshot, not from undo-stack length. Commit, undo, redo, and discard clear stale validation metadata and stale save errors unless validation is explicitly requested again.

277. **`editorSessions.<id>.persistence` declares generic editor save transport** - Configure `url`, optional `method`, optional `headers`, optional `body`, optional `target`, and optional `timeout` on an editor session. Default method is `PUT`; default body is `trackedPaths`, which sends the tracked document paths as a nested object preserving state tree shape. Session headers and per-call headers are merged, with per-call keys winning. Use `body: "snapshot"` when the backend wants absolute-path keys under `paths`, or a custom object body when the app needs a specific envelope.

278. **`editorSave` is the recommended editor session save action** - Use `{ "action": "editorSave", "params": { "session": "<id>" } }` instead of hand-composing `transaction` + `editorMarkSaved`. The framework captures the in-flight snapshot, persists it through the host fetcher with URL-guard checks, marks only that snapshot as saved after success, and leaves later edits dirty if the user changed the document while save was in flight. Failed saves never mark clean; they expose `saveStatus`, `saveError`, and `lastSaveAttemptAt` under `/ui/editorSessions/<id>`.
279. **`navigation.editorSessionGuard` protects dirty editor sessions during app navigation** - App specs can configure `navigation.editorSessionGuard` with `enabled`, optional `sessions`, optional `blockNavigation`, optional `blockGoBack`, optional `blockBrowserUnload`, and optional `pendingPath`. The guard reads framework metadata under `/ui/editorSessions/<id>` and writes pending state to `/ui/navigationGuard/pending` by default. If `sessions` is omitted, all mounted editor sessions are considered.

280. **Dirty-guard proceed is non-destructive; save/discard choices are explicit** - `navigationGuardCancel` clears the pending guard state and stays on the current screen. `navigationGuardSaveAndProceed` is the normal save-first guard action: it calls the mounted `EditorSessionEngine.save({ session })` for each pending dirty editor session, then resumes only if those sessions become clean. `navigationGuardProceed` is a low-level retry that resumes a pending navigation only after the pending editor sessions are already clean; it does not save or discard tracked-path changes. `navigationGuardDiscardAndProceed` delegates to `EditorSessionEngine.discard(sessionId)` for each pending dirty session, then resumes. Consumer JSON should render confirmation UI from `/ui/navigationGuard/pending` and keep custom `pendingPath` values under non-reserved `/ui/<segment>` paths.

281. **`MythikApp.fetcher` supplies editor persistence when auth fetch is absent** - React hosts can pass `fetcher={(url, options) => ...}` to `MythikApp` so `editorSave` and `navigationGuardSaveAndProceed` have a transport in non-auth apps. When auth is configured, the framework fetch with auth interceptors remains the active fetcher. Save actions do not read global `/ui/lastError`; editor save status, errors, and attempts are reported under `/ui/editorSessions/<id>`.

282. **Existing spec edits must use the CLI inspection-then-patch loop** - For an existing screen/app/api spec, AI agents should run `mythik manifest <id>` first, inspect only the target nodes with `mythik elements <id> <ids>`, apply a small RFC 6902 patch with `mythik patch <id> --from-file patch.json`, and verify with `manifest` or `elements`. This keeps edits surgical, validated, versionable, and reviewable. `pull` is for backup, migration, review, or full-document work; `push` is for new specs or intentional full replacement. Direct database edits and direct `SpecStore.save()` calls bypass validation and are not approved spec-write paths.
283. **Bundled AI docs are part of the install surface** - The `mythik` package includes `docs/llms.txt`, `docs/consumer/*`, and `docs/wiki/compiled/*`. Agents should run `mythik docs path` before spec generation and read the bundled docs rather than guessing from package source. Use `mythik docs copy ./mythik-docs` to create a project-local copy when the host workflow needs explicit files.
284. **DNA numeric seeds are canonical `0–1`, with legacy `0–100` normalization** - Generate `tokens.dna.roundness`, `density`, `depth`, and `formality` as `0–1` numbers (`0.7`, not `70`). The runtime normalizes numeric seed values greater than `1` by dividing by `100` inside DNA derivation, so initial AppSpec load and runtime `updateTokens` share the same backward-compatible behavior.
285. **Scoped pagination counts filter before aggregation** - Query endpoints may combine `pagination: "offset"` with `scopeFilter`. For generated counts, the server applies the scope filter to the query source first and then counts the scoped source, so the response `total` matches the same tenant/role slice as `data`. Prefer generated counts. If custom `endpoint.count` is truly needed with `scopeFilter`, it must include `{{scopeWhere[:alias]}}` or `{{scopeAnd[:alias]}}`; Mythik expands the macro to the correct scope predicate and removes it for bypass roles. Other custom count SQL is left verbatim. Specs should use `:alias` for JOIN/subquery counts and should not reference internal scope parameter names directly.
286. **Transaction fetch failures preserve backend error details** - When a transaction `confirm` uses `fetch` and the backend returns an HTTP error payload such as `{ error: { code, message } }`, `/tx/error` is written after rollback with the best backend message plus `code`, HTTP `status`, and raw `data`. `onError` should read `/tx/error/message`; transaction specs should not read global `/ui/lastError`.
287. **SQL-backed stores and servers use one dialect-aware `mythik/server` boundary** - Import `createSqlDriver`, `SqlSpecStore`, `SqlVersionedSpecStore`, `SqlEnvironmentStore`, and `getSqlStoreDdl` from `mythik/server` for Node-side SQL work. Supported dialects are `sqlserver`, `postgres`, `mysql`, and `sqlite`. Initialize store tables with `mythik init-store --dialect <dialect>` for reachable SQL stores, `--target` for SQLite, or `--dry-run` for review/apply through a deployment process. SQL Server `init-store` accepts explicit `--server`, `--database`, `--user`, `--password`, `--encrypt`, and `--trust-server-certificate` flags. CLI commands share the same store flags/env vars and must keep existing-spec edits on the `manifest -> elements -> patch --from-file -> validate` loop. ApiSpec `dialect` controls generated CRUD/catalog/pagination/scope SQL; custom SQL remains dialect-native with Mythik named params (`@name`) and is not translated between dialects.
288. **Event arrays may mix actions and transactions** - Event bindings can be a single action, a single transaction, or an array containing both normal action bindings and transaction bindings. Mythik executes the array sequentially and awaits each transaction before continuing. Transaction phases cannot contain nested transactions.
289. **`$let` dotted references read nested binding values** - A `$ref` may target an object binding path such as `{ "$ref": "user.name" }`, and `$template` placeholders may read the same path as `${user.name}`. Use this for object values produced by `$let`; missing dotted `$ref` segments are invalid references and should be fixed instead of treated as optional data.
290. **`params.skipIf` is a dispatch-time action guard** - Any action binding may include `params.skipIf`. Mythik resolves it before resolving the rest of the params; when truthy, the action is skipped and the action chain continues. The action handler never receives `skipIf`.
