# Mythik — AI Spec Reference

> Read this document completely before generating any JSON spec.
> Core reference for spec structure, expressions, actions, and rules.

**Companion modules (read as needed):**
- [ai-context-primitives.md](ai-context-primitives.md) — props tables for all 38 primitives (read when generating UI)
- [ai-context-patterns.md](ai-context-patterns.md) — expression matrix, composition anti-patterns (read when combining 2+ features)
- [ai-context-api.md](ai-context-api.md) — catalogs, endpoints, auth, audit (read when generating API specs)
- [ai-context-custom-elements.md](ai-context-custom-elements.md) — custom element authoring (Layer 3): ElementDefinition, variants, black-box contract (read when authoring or consuming custom elements)
- [ai-context-runtime-semantics.md](ai-context-runtime-semantics.md) — runtime behavior reference: expression timing, reserved state paths, server contracts, matcher semantics, store coordination (read when debugging runtime behavior or building CRUD/auth/tables)
## Public Package Names

Public npm package names are unscoped:

- Runtime/core: `mythik`
- Browser-safe server helpers from core: `mythik/server`
- React host/runtime: `mythik-react`
- CLI binary package: `mythik-cli` (binary command: `mythik`)
- Programmatic CLI API: `mythik-cli/api`
- Node/Express server package: `mythik-server`

Use `npm install mythik mythik-react` for a React app, `npm install -D mythik-cli` for CLI workflows, and add `mythik-server` only when building a Mythik-backed Node server. The `mythik` npm package bundles the AI documentation corpus under `node_modules/mythik/docs`; use `mythik docs path` to locate it after install or `mythik docs copy ./mythik-docs` to copy it into the current project.

## Spec Structure

Every screen is a flat tree: `root` ID + `elements` map + optional `initialActions`:

```json
{
  "root": "main-layout",
  "initialActions": [
    { "action": "fetch", "params": { "url": "/api/data", "target": "/items" } }
  ],
  "elements": {
    "main-layout": {
      "type": "stack",
      "props": { "direction": "vertical" },
      "children": ["header", "content"]
    },
    "header": {
      "type": "text",
      "props": { "content": "Hello", "variant": "heading" }
    },
    "content": {
      "type": "box",
      "props": {},
      "children": ["field1"]
    }
  }
}
```

### Top-Level Properties

| Property | Type | Purpose |
|----------|------|---------|
| `root` | string | ID of the root element |
| `elements` | object | Flat map of element ID → definition |
| `initialActions` | ActionBinding[] | Actions on spec mount (e.g., fetch data) |
| `derive` | object | Auto-computed reactive state (see Derive section) |
| `forms` | object | Declarative form validation (see Forms section) |
| `dataSources` | object | Reactive data fetching (see DataSources section) |
| `templates` | object | Reusable element definitions (see Templates section) |

### Element Properties

| Property | Type | Purpose |
|----------|------|---------|
| `type` | string | Primitive name or template name |
| `props` | object | Component props (can contain expressions) |
| `children` | string[] | Child element IDs |
| `style` | object | CSS styles (can contain expressions) |
| `visible` | expression | Show/hide condition |
| `permission` | object | `{ visible, editable, readonly }` per role |
| `repeat` | object | Iterate over array: `{ statePath, key }` or `{ source, key }` |
| `on` | object | Event handlers: `{ press, change, submit }` |
| `hover` | object | Style overrides on pointer enter |
| `active` | object | Style overrides on press |
| `focus` | object | Style overrides on keyboard focus |
| `transition` | object | `{ duration, ease }` for hover/active/focus |
| `motion` | object | Framer-Motion-style mount/exit animations: `{ initial, animate, exit, transition }` |
| `animations` | object | Animation engine config: `{ mount, unmount, hover, focus, active, ambient, stateChange }` — see Animation Engine section |
| `skeleton` | boolean | `false` to opt-out of auto-skeleton |

## CLI Workflow

```bash
mythik docs path                       # Locate bundled AI documentation
mythik docs copy ./mythik-docs         # Copy docs for an AI agent / local review
mythik manifest <screen>               # See structural tree
mythik elements <screen> <id1,id2>     # Get element details
mythik patch <screen> --from-file patch.json  # Apply RFC 6902 patches
mythik pull <screen>                    # Export full spec for backup/review
mythik push <screen>                    # Create or intentionally replace a full spec
mythik validate <screen>               # Validate spec
```

### Required edit loop for existing specs

When an AI agent modifies an existing Mythik spec, use this loop by default:

1. `mythik manifest <screen>` - inspect the current structure and identify candidate element IDs.
2. `mythik elements <screen> <id1,id2,...>` - inspect only the exact elements and nearby containers that will change.
3. Write a small RFC 6902 patch file.
4. `mythik patch <screen> --from-file patch.json` - apply the surgical change through the validated CLI path.
5. Re-run `mythik manifest <screen>` or `mythik elements <screen> <ids>` to verify the changed surface.

Do not edit database rows directly, do not call `SpecStore.save()` from app code, and do not replace a whole screen with `push` when a targeted `patch` can express the change. `pull` is for backup, migration, review, or full-spec creation workflows; it is not the normal first step for a small edit.

**Patch rules:** `"op": "add"` with numeric index **inserts before** (not replace). Use `/-` to append. Use `"op": "replace"` to overwrite. Prefer `mythik patch <id> --from-file patch.json` for any patch containing `$state`, `$template`, `$auth`, or other shell-sensitive strings.

**Patch input precedence:** explicit sources win. `--from-file <path>` reads that file even if the host process has non-TTY stdin (common in PowerShell/agent runners). Stdin still works via `--from-file -` or by piping without `--from-file`: `cat patch.json | mythik patch <id>`.

All commands accept `--json`, `--table <name>`, `--store`, `--url`, `--key`. Never pass API keys inline — use `.mythikrc` + env vars.

### CLI is the only approved path for spec writes

Per reference-doc rule 248: three approved forms.

- **Shell**: `mythik push <id> --from-file spec.json` and `mythik patch <id> --from-file patch.json` (cross-shell ergonomic for any spec/patch containing `$state`, `$template`, `$auth`, or `$row`)
- **Bulk**: `mythik push --from-dir <folder>` — sequential per-file push of every `*.json`. Continue-on-error: failures don't stop subsequent specs. No rollback. Partial state recovers by fixing failures and re-running.
- **Programmatic**: `import { runPush, runPatch, parsePatchInput, type PushResult } from 'mythik-cli/api'` — same code path as the binary, no shell. Pass `json: true` in options to receive structured command output via `JSON.parse(result.output)`. `runPatch` success output includes `versioned: boolean` and `version?: number` when a versioned store + `author` creates history.

`SpecStore.save()` is `@internal` — calling it from application code skips validation and produces runtime errors only at render time. The three forms above are the only validated paths.

### Pre-push linting

Run `mythik lint` to detect anti-patterns before pushing. Three approved invocations:
- `mythik lint --from-file spec.json` — single spec file
- `mythik lint --from-dir specs/` — bulk over a directory
- `mythik lint` (no args) — auto-discovers via `.mythikrc` file store + scans `./src` for code rules

The 4 rules ship in v0.1; spec rules also surface during `mythik push` (defense-in-depth). Programmatic via `import { runLint } from 'mythik-cli/api'`.

## Expressions

Expressions are JSON objects that resolve to dynamic values at runtime.

### State & Binding

| Expression | Syntax | Purpose |
|------------|--------|---------|
| `$state` | `{ "$state": "/user/name" }` | Read from state |
| `$bindState` | `{ "$bindState": "/form/email" }` | Two-way binding (read + write) |
| `$auth` | `{ "$auth": "email" }` | Auth user data (whitelisted fields only) |
| `$item` | `{ "$item": "title" }` | Current repeat item field |
| `$index` | `{ "$index": true }` | Current repeat item position |
| `$bindItem` | `{ "$bindItem": "completed" }` | Two-way binding to repeat item field |
| `$prop` | `{ "$prop": "label" }` | Template prop reference |
| `$ref` | `{ "$ref": "myVar" }` | Reference a `$let` binding |

### Values & Formatting

| Expression | Syntax | Purpose |
|------------|--------|---------|
| `$token` | `{ "$token": "colors.primary" }` | Design system token. `multiply` for numeric scaling |
| `$i18n` | `{ "$i18n": "key", "args": {...} }` | Translation key |
| `$template` | `{ "$template": "Hello, ${/user/name}!" }` | String interpolation. `${/path}` for state, `${name}` for $let bindings. **Does NOT resolve `$item` directly** — capture in `$let` first |
| `$computed` | `{ "$computed": "fn", "args": {...} }` | Registered function. **Prefer $math/$array/$date/$format** |
| `$uniqueId` | `{ "$uniqueId": true, "source": { "$state": "/items" }, "field": "id", "prefix": "item-", "padding": 2 }` | First unused deterministic id in a source array |

### Conditionals & Logic

`$cond` — conditional value:
```json
{ "$cond": { "$state": "/form/isValid" }, "$then": "green", "$else": "gray" }
{ "$cond": { "$item": "priority", "eq": "urgent" }, "$then": "#EF4444", "$else": "#22C55E" }
```
Operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `not`.

**Trap:** `$state` with `eq` only works as boolean in `visible`. For `disabled`/other props, wrap in `$cond`: `{ "$cond": { "$state": "/x", "eq": 0 }, "$then": true, "$else": false }`

`$switch` — multi-branch (use for 3+ branches instead of nested $cond):
```json
{ "$switch": { "$state": "/type" }, "cases": { "1": "Expense", "2": "Income" }, "default": "Other" }
```
`default` is required.

`$and` / `$or` / `$not` — boolean logic:
```json
{ "$and": [{ "$state": "/form/name" }, { "$state": "/form/price" }] }
{ "$not": { "$state": "/form/isValid" } }
```

### Responsive & Cross-Platform

`$breakpoint` — viewport-based values:
```json
{ "$breakpoint": { "sm": 1, "md": 2, "lg": 3 } }
```
Default breakpoints: sm: 0, md: 768, lg: 1024, xl: 1280.

**Always use `$breakpoint` for layout properties.** Every spec should be responsive by default — never hardcode desktop-only values for these properties:

| Property | Mobile (sm) | Tablet (md) | Desktop (lg+) |
|----------|------------|-------------|----------------|
| `direction` | `"vertical"` | `"horizontal"` | `"horizontal"` |
| `columns` | `1` | `2` | `3-4` |
| `gap` | `12` | `16` | `24` |
| `padding` | `"16px"` | `"24px"` | `"32px"` |

Example — responsive grid layout:
```json
{
  "type": "grid",
  "props": { "columns": { "$breakpoint": { "sm": 1, "md": 2, "lg": 3 } } },
  "style": {
    "gap": { "$breakpoint": { "sm": "12px", "md": "16px", "lg": "24px" } },
    "padding": { "$breakpoint": { "sm": "16px", "md": "24px", "lg": "32px" } }
  }
}
```

`$platform` — cross-platform values:
```json
{ "$platform": { "web": "blur(24px)", "native": null } }
{ "$platform": { "web": "layout-web", "native": "layout-native" } }
```
Resolves by current platform. `"native"` alias matches ios and android. Specific keys (`ios`, `android`) override `"native"`. If no key matches, resolves to `undefined` — always provide keys for all target platforms.

**When to use `$platform` vs `$breakpoint`:**
- `$breakpoint`: Layout adaptation (columns, gaps, padding, direction) — same component, different sizing
- `$platform`: Platform-specific techniques (CSS blur vs native BlurView, hover vs press, web sidebar vs native tabs) — different implementation, same feature

**Root-level `$platform`** — for fundamentally different platform layouts:
```json
{
  "root": { "$platform": { "web": "layout-web", "native": "layout-native" } },
  "elements": {
    "layout-web": { "type": "stack", "style": { "backdropFilter": "blur(24px)" } },
    "layout-native": { "type": "screen", "props": { "title": "Dashboard" } },
    "shared-form": { "type": "stack", "children": ["..."] }
  }
}
```
State, initialActions, and forms are shared — only presentation branches per platform.

### Math & Data

`$math`:
```json
{ "$math": "multiply", "args": [{ "$state": "/price" }, { "$state": "/qty" }] }
{ "$math": "round", "value": 3.14, "decimals": 2 }
```
Operations: `add`, `subtract`, `multiply`, `divide`, `round`, `floor`, `ceil`, `abs`, `min`, `max`, `mod`. Undefined args → 0.

`$array`:
```json
{ "$array": "count", "source": { "$state": "/items" } }
{ "$array": "filter", "source": { "$state": "/items" }, "where": { "field": "status", "eq": "active" } }
{ "$array": "sum", "source": { "$state": "/items" }, "field": "price" }
{ "$array": "sumProduct", "source": { "$state": "/items" }, "field1": "price", "field2": "qty" }
{ "$array": "search", "source": { "$state": "/items" }, "query": { "$state": "/search" }, "fields": ["name"] }
{ "$array": "sort", "source": { "$state": "/items" }, "field": "name", "direction": "asc" }
{ "$array": "slice", "source": { "$state": "/items" }, "from": 0, "to": 10 }
{ "$array": "append", "source": { "$state": "/items" }, "value": { "name": "New" } }
{ "$array": "replace", "source": { "$state": "/items" }, "where": { "field": "id", "eq": 1 }, "value": { "name": "Updated" } }
{ "$array": "remove", "source": { "$state": "/items" }, "where": { "field": "id", "eq": 3 } }
{ "$array": "toggle", "source": { "$state": "/ids" }, "value": 5 }
{ "$array": "find", "source": { "$state": "/items" }, "where": { "field": "id", "eq": 1 } }
{ "$array": "includes", "source": { "$state": "/tags" }, "value": "urgent" }
{ "$array": "map", "source": { "$state": "/items" }, "field": "name" }
{ "$array": "first", "source": { "$state": "/items" } }
{ "$array": "last", "source": { "$state": "/items" } }
```
Where operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`. **Use `value` not `item` for append/replace.**

**`where` accepts ONE field + ONE operator only** — no `$and`/`$or`. For multiple conditions, chain filters:
```json
{ "$array": "filter", "source": { "$array": "filter", "source": { "$state": "/items" }, "where": { "field": "price", "gte": 10 } }, "where": { "field": "price", "lte": 100 } }
```

`$date`:
```json
{ "$date": "now" }
{ "$date": "today" }
{ "$date": "age", "from": { "$state": "/birthDate" } }
{ "$date": "diff", "from": { "$state": "/start" }, "to": { "$state": "/end" }, "unit": "days" }
{ "$date": "format", "value": { "$state": "/date" }, "pattern": "short" }
{ "$date": "add", "value": { "$state": "/date" }, "amount": 7, "unit": "days" }
```
Units: `days`, `months`, `years`, `hours`, `minutes`. Patterns: `short`, `long`, `numeric`, `time`, `datetime`.

`$format`:
```json
{ "$format": "currency", "value": { "$state": "/price" }, "currency": "USD" }
{ "$format": "number", "value": 1234.5, "decimals": 2 }
{ "$format": "percent", "value": 0.75 }
{ "$format": "phone", "value": { "$state": "/phone" } }
{ "$format": "uppercase", "value": { "$state": "/name" } }
{ "$format": "lowercase", "value": "HELLO" }
{ "$format": "capitalize", "value": "hello world" }
{ "$format": "truncate", "value": "long text...", "length": 20 }
```
Extended: `locale`, `notation` (compact/scientific), `signDisplay` (always/exceptZero), `useGrouping`.

### Named Bindings

`$let` / `$ref` — define once, use many times:
```json
{ "$let": { "total": { "$array": "count", "source": { "$state": "/items" } } }, "$in": { "$ref": "total" } }
```
**JSONB array format** (when stored in DB, order matters):
```json
{ "$let": [["filtered", { "$array": "filter", "source": { "$state": "/items" }, "where": { "field": "status", "eq": "active" } }], ["count", { "$array": "count", "source": { "$ref": "filtered" } }]], "$in": { "$ref": "count" } }
```

### Group & Selection (inside repeat)

`$group` (inside repeat.groupBy):
```json
{ "$group": "key" }
{ "$group": "count" }
{ "$group": "sum", "field": "amount" }
```
Operations: `key`, `count`, `index`, `items`, `sum`, `avg`, `min`, `max`. Dot-notation for pre-grouped: `{ "$group": "subtotal.total" }`. **Only valid inside groupBy context.**

`$selection` (inside repeat.selection):
```json
{ "$selection": "selected" }
{ "$selection": "count" }
```
**Only valid inside repeat with selection config.**

## Primitives

38 built-in visual building blocks. **See [ai-context-primitives.md](ai-context-primitives.md) for complete props reference.**

**Layout:** `box`, `text`, `image`, `icon`, `stack`, `grid`, `scroll`, `divider`, `spacer`
**Form:** `input`, `textarea`, `select`, `checkbox`, `toggle`, `slider`
**Interaction:** `button`, `touchable`, `list`
**Overlays:** `modal`, `drawer`, `tabs`, `accordion`, `wizard`, `screen`
**Charts:** `bar-chart`, `line-chart`, `pie-chart`, `area-chart`, `table`, `kanban-board`
**Spatial:** `spatial-map`
**Special:** `file-upload`, `camera`, `signature`, `audio-player`, `skeleton`, `toast-container`

All primitives accept `style`, `visible`, and `permission`. Tokens are project-defined — no framework defaults. Device context auto-tracked at `/ui/device/*` (viewportWidth, viewportHeight, platform, orientation, colorScheme).

## Actions

Wire to events with `on`: `{ "on": { "press": { "action": "...", "params": {...} } } }`

Arrays execute sequentially: `"press": [action1, action2, action3]`

**Trap:** Action chains don't stop on failure — `validateForm` marks errors but does NOT halt the chain. Use `submitForm` with `formId` instead (validates + blocks if invalid). See [ai-context-patterns.md](ai-context-patterns.md).

Add `"fireAndForget": true` to dispatch without waiting (background re-fetch after closing modal).

### Action Reference

| Action | Params | Purpose |
|--------|--------|---------|
| `setState` | `{ statePath, value }` | Set state value (value can contain expressions) |
| `navigateScreen` | `{ screen, ...params }` | Navigate to screen (use this, not `navigate`) |
| `goBackScreen` | — | Go to previous screen via history (use this, not `goBack`) |
| `openModal` | `{ id }` | Show modal |
| `closeModal` | `{ id }` | Hide modal |
| `openDrawer` | `{ id }` | Open drawer |
| `closeDrawer` | `{ id }` | Close drawer |
| `showNotification` | `{ message, type, title?, duration? }` | Toast notification |
| `dismissNotification` | `{ id }` | Remove toast by id |
| `toggleTheme` | — | Switch dark/light |
| `setLocale` | `{ locale }` | Change language |
| `copyToClipboard` | `{ value }` | Copy to clipboard |
| `openUrl` | `{ url }` | Open external URL |
| `fetch` | `{ url, method, body, target, headers }` | HTTP request → target state path |
| `submitForm` | `{ formId?, url, method, body, target }` | Validate + fetch + notification |
| `login` | `{ email, password }` | Auth via provider → `/auth/*` state |
| `logout` | — | Clear session, navigate to loginScreen |
| `refreshSession` | — | Manual token refresh |
| `validateForm` | `{ formId }` | Touch all fields + validate |
| `touchField` | `{ formId, field }` | Touch + validate one field |
| `resetForm` | `{ formId }` | Reset form to initial values |
| `uploadFile` | `{ bucket, target, path? }` | Upload via StorageAdapter |
| `deleteFile` | `{ path, bucket }` | Delete from storage |
| `export` | `{ source, columns, filename, format? }` | Export data (csv built-in) |
| `toggleSelection` | `{ statePath, value, mode? }` | Add/remove from selection array |
| `selectAll` | `{ statePath, values }` | Set selection array |
| `selectNone` | `{ statePath }` | Clear selection |
| `refreshDataSource` | `{ id }` | Force re-fetch a dataSource |

### fetch Details

- Body expressions are deeply resolved before sending
- Empty strings in body → `null` (prevents DB errors)
- Sets `/ui/loading` while in flight
- On error: sets `/ui/lastError` with status and message
- Auth headers auto-injected for `authDomains` URLs

### Transactions (Optimistic Updates)

Use `transaction` for CRUD operations. Instant UI → server confirm → auto-rollback on failure.

```json
{
  "on": {
    "press": {
      "transaction": {
        "before": [
          { "action": "closeModal", "params": { "id": "{{MODAL_ID}}" } }
        ],
        "optimistic": [
          { "action": "setState", "params": {
            "statePath": "{{ARRAY_PATH}}",
            "value": { "$array": "append", "source": { "$state": "{{ARRAY_PATH}}" }, "value": {
              "id": { "$template": "temp-${/form/title}" },
              "{{FIELD}}": { "$state": "/form/{{FIELD}}" }
            }}
          }}
        ],
        "confirm": [
          { "action": "fetch", "params": {
            "method": "POST", "url": "{{API_URL}}",
            "headers": { "Prefer": "return=representation" },
            "body": { "{{FIELD}}": { "$state": "/form/{{FIELD}}" } },
            "target": "/tx/result"
          }}
        ],
        "onSuccess": [
          { "action": "fetch", "params": { "method": "GET", "url": "{{API_URL}}?select=*", "target": "{{ARRAY_PATH}}" } }
        ],
        "onError": [
          { "action": "showNotification", "params": { "type": "error", "message": "Could not save." } }
        ]
      }
    }
  }
}
```

**Phase rules:**
- `before` — UI transitions, NOT rolled back (closeModal, navigate)
- `optimistic` — data changes, ROLLED BACK on error (setState for data + form reset)
- `confirm` — network request, determines success. Write to `/tx/result` via target
- `onSuccess` — post-success sync (re-fetch). `$state: "/tx/result"` reads confirm result
- `onError` — runs after rollback. `$state: "/tx/error"` has `{ message }`; fetch-based confirm failures preserve backend details when available (`status`, `data`, nested `error.code`, nested `error.message`)

**CRUD variations:**

| Operation | optimistic | confirm | onSuccess | Notes |
|-----------|-----------|---------|-----------|-------|
| CREATE | `$array: "append"` with temp id | POST | GET re-fetch | Re-fetch replaces temp with real id |
| UPDATE | `$array: "replace"` by id | PATCH `?id=eq.${id}` | **None** | Optimistic data is correct — re-fetch causes flash |
| DELETE | `$array: "remove"` by id | DELETE `?id=eq.${id}` | **None** | — |
| TOGGLE | `$not` on boolean path | PATCH | **None** | No `before` — no modal |

**Timeout:** Default 10s. Override: `{ "transaction": { "timeout": 30000, ... } }`

**Legacy (no optimistic):** Sequential action array: `[closeModal, fetch POST, fetch GET]`. Prefer transactions.

## Validation

```json
{ "type": "input", "props": { "value": { "$bindState": "/form/email" }, "checks": [
  { "type": "required", "message": "Required" },
  { "type": "email", "message": "Invalid email" }
], "validateOn": "blur" } }
```

| Validator | Args | Purpose |
|-----------|------|---------|
| `required` | — | Non-empty |
| `email` | — | Email format |
| `minLength` / `maxLength` | `{ min }` / `{ max }` | String length |
| `pattern` | `{ pattern }` | Regex |
| `min` / `max` | `{ min }` / `{ max }` | Number range |
| `numeric` | — | Must be number |
| `url` | — | Valid URL |
| `matches` / `equalTo` | `{ other }` | Must equal another field |
| `greaterThan` / `lessThan` | `{ other }` | Compare to another field |
| `requiredIf` | `{ field }` | Required when `field` value is truthy. **Truthy check only** — does not support `eq` for specific values. To require based on a specific value, use a `$cond` to compute a boolean and reference that in `field` |

## Repeat

```json
"task-list": {
  "type": "stack",
  "repeat": { "statePath": "/tasks", "key": "id" },
  "children": ["task-row"]
}
```

Filtered/paginated: use `source` instead of `statePath`:
```json
"repeat": {
  "source": { "$array": "filter", "source": { "$state": "/tasks" }, "where": { "field": "status", "eq": "active" } },
  "key": "id"
}
```
Chain: `$array: "filter"` → `$array: "search"` → `$array: "slice"` for filter + search + pagination.

Inside repeated elements: `$item`, `$index`, `$bindItem` access current item.

### Grouped Repeat

**Client-side** (engine groups flat array): `groupBy: "category"`
**Pre-grouped** (server already grouped): `groupKey: "name"` + `groupItems: "rows"`

```json
"repeat": {
  "source": { "$state": "/tasks" }, "key": "id",
  "groupBy": "category",
  "groupHeader": ["header-el"], "groupFooter": ["footer-el"],
  "footer": ["grand-total"]
}
```
Pre-grouped data format: `[{ "name": "Group A", "rows": [...], "subtotal": { "total": 50000 } }, ...]`

In groupHeader/groupFooter: use `$group` expressions. In children: use `$item`/`$index`.

### Repeat Selection

```json
"repeat": {
  "source": { "$state": "/tasks" }, "key": "id",
  "selection": { "state": "/selectedIds", "mode": "multiple" }
}
```
Inside: `{ "$selection": "selected" }` (boolean), `{ "$selection": "count" }`. Toggle: `toggleSelection` action.

## Visibility

```json
"visible": { "$state": "/user/role", "eq": "admin" }
"visible": { "$auth": "role", "eq": "admin" }
"visible": { "$and": [{ "$state": "/form/isValid" }, { "$state": "/form/hasChanges" }] }
```

### When to Use fetch vs dataSources

| | `initialActions` + `fetch` | `dataSources` |
|---|---|---|
| **Purpose** | One-shot load on mount, CRUD in transactions | Reactive data that re-fetches when params change |
| **Loading state** | `/ui/loading` (boolean) | `/{target}Loading` (boolean) — auto-generated |
| **Error state** | `/ui/lastError` (object) | `/{target}Error` (object) — auto-generated |
| **Re-fetch** | Manual (call fetch again) | Automatic on param change, or `refreshDataSource` |
| **Use for** | Static initial data, POST/PUT/DELETE | Lists with filters, search, pagination |

**Rule:** Don't mix both for the same data target. Pick one pattern per data source.

### Loading/Content/Empty Pattern

**With `initialActions` fetch** (uses `/ui/loading` and `/ui/lastError`):
```json
"loading": { "visible": { "$and": [{ "$state": "/ui/loading" }, { "$not": { "$array": "count", "source": { "$state": "/items" } } }] } },
"content": { "visible": { "$array": "count", "source": { "$state": "/items" } } },
"empty":   { "visible": { "$and": [{ "$not": { "$state": "/ui/loading" } }, { "$not": { "$array": "count", "source": { "$state": "/items" } } }] } },
"error":   { "visible": { "$state": "/ui/lastError" } }
```

**With `dataSources`** (uses auto-generated `/{target}Loading` and `/{target}Error`):
```json
"loading": { "visible": { "$and": [{ "$state": "/itemsLoading" }, { "$not": { "$array": "count", "source": { "$state": "/items" } } }] } },
"content": { "visible": { "$array": "count", "source": { "$state": "/items" } } },
"empty":   { "visible": { "$and": [{ "$not": { "$state": "/itemsLoading" } }, { "$not": { "$array": "count", "source": { "$state": "/items" } } }] } },
"error":   { "visible": { "$state": "/itemsError" } }
```

## Derived State

Auto-computed reactive values. Declared at spec level. Read-only — StateGuard blocks writes.

```json
{
  "derive": {
    "/stats/total": { "$array": "count", "source": { "$state": "/items" } },
    "/stats/avg": { "$math": "divide", "args": [
      { "$array": "sum", "source": { "$state": "/items" }, "field": "price" },
      { "$array": "count", "source": { "$state": "/items" } }
    ]}
  }
}
```
Derive A can reference Derive B (no cycles). Dependency-tracked — only re-evaluates on change.

**Warning:** `derive` operates on data in state only. With server-side pagination, state holds the current page — derive sums/counts will reflect the page, not the full dataset. For full-dataset totals with server pagination, fetch totals from the API.

## Forms

Declarative form-level validation. Coordinates fields as a unit.

```json
{
  "forms": {
    "task-form": {
      "fields": {
        "title": { "statePath": "/form/title", "rules": [{ "type": "required", "message": "Required" }] },
        "email": { "statePath": "/form/email", "rules": [{ "type": "required" }, { "type": "email" }] },
        "maxPrice": { "statePath": "/form/maxPrice", "rules": [
          { "type": "greaterThan", "args": { "other": { "$state": "/form/minPrice" } }, "message": "Max must exceed min" }
        ]}
      },
      "validateOn": "blur"
    }
  }
}
```

**Auto-generated state:**

| Path | Type | Description |
|------|------|-------------|
| `/ui/forms/{id}/isValid` | boolean | All fields valid (even untouched — for submit button) |
| `/ui/forms/{id}/errorCount` | number | Total displayed errors |
| `/ui/forms/{id}/isDirty` | boolean | Any value changed |
| `/ui/forms/{id}/fields/{field}/errors` | string[] | Error messages (shown only when touched) |
| `/ui/forms/{id}/fields/{field}/touched` | boolean | User has interacted |
| `/ui/forms/{id}/fields/{field}/dirty` | boolean | Value differs from initial |

Disable submit: `"disabled": { "$not": { "$state": "/ui/forms/task-form/isValid" } }`
Submit with gate: `{ "action": "submitForm", "params": { "formId": "task-form", "url": "...", ... } }`
Show error: `"visible": { "$array": "count", "source": { "$state": "/ui/forms/task-form/fields/title/errors" } }` with content `{ "$array": "first", "source": { "$state": "/ui/forms/task-form/fields/title/errors" } }`
Actions: `validateForm`, `touchField`, `resetForm`. `resetForm` restores state values to initial AND clears all metadata (touched, errors, dirty). Opt-in — existing inline `checks` still work.

## DataSources

Reactive GET fetching. Makes specs self-contained.

```json
{
  "dataSources": {
    "tasks": {
      "url": { "$template": "${/config/apiUrl}/rest/v1/tasks?select=*" },
      "headers": { "$state": "/config/headers" },
      "params": {
        "status": { "$state": "/filter/status" },
        "search": { "$state": "/filter/search" },
        "page": { "$state": "/pagination/page" }
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

| Property | Default | Description |
|----------|---------|-------------|
| `trigger` | `"auto"` | `auto`: re-fetch on param change. `manual`: only via `refreshDataSource` |
| `debounce` | `0` | Debounce ms for auto-trigger |
| `initialFetch` | `true` | Fetch on mount |
| `emptyWhileLoading` | `false` | Clear target while loading |

Auto-generated: `/tasks` (data), `/tasksLoading` (boolean), `/tasksError` (error or null).
Param filtering: `null`, `""`, `"all"` → omitted from query. Headers from state, NOT from spec (no keys in DB).

**`derive` and `dataSources` runtime lifecycle (v0.1.0 — Item E)**: both features execute at runtime per spec mount via internal `mountSpecRuntime` helper called from MythikRenderer (web + RN). Lifecycle: derive engine mounts first (sync), populates derive paths from current state, subscribes for reactive recompute. dataSources engine mounts second; initial fetch is skipped when URL template dependencies are undefined/null/empty — `/{target}Deferred: true` is set so consumers can render "waiting for prerequisite" UI distinct from `/{target}Loading`. The reactive subscription catches up when deps resolve. Engines self-coordinate via reactive subscriptions — no ordering dependency on `initialActions`. Renderers declare the state subscription useEffect BEFORE mountSpecRuntime so synchronous derive writes on mount trigger initial-paint correctly. URL templating requires the explicit `{ $template: '/api/${/path}' }` form; plain strings containing `${...}` are flagged as load-time validation errors (resolver does NOT substitute plain strings).

## Templates

Reusable element definitions within specs. Reduces repetition.

```json
{
  "templates": {
    "monetary-col": {
      "type": "text",
      "defaults": { "color": "#0F172A", "currency": "HNL" },
      "props": { "content": { "$format": "currency", "value": { "$prop": "value" }, "currency": { "$prop": "currency" }, "locale": "es-HN" } },
      "style": { "textAlign": "right", "fontFamily": "monospace", "color": { "$prop": "color" } }
    }
  },
  "elements": {
    "col-amount": { "type": "monetary-col", "props": { "value": { "$item": "amount" } } },
    "col-total": { "type": "monetary-col", "props": { "value": { "$item": "total" }, "color": "#D97706" } }
  }
}
```

Element props override template `defaults`. `$prop` references merged props. Use `"$children"` marker to insert consuming element's children. Templates in AppSpec are available to all screens. Screen templates override app-level with same name.

**Composite templates** use `$let` to bridge `$prop` into `$template`:
```json
"stat-card": {
  "type": "text",
  "defaults": { "label": "Count", "value": 0 },
  "props": {
    "content": { "$let": { "l": { "$prop": "label" }, "v": { "$prop": "value" } }, "$in": { "$template": "${l}: ${v}" } }
  },
  "style": { "padding": 16, "backgroundColor": { "$token": "colors.surface" } }
}
```
Templates are **single elements** — one `type` with props/style/defaults. For multi-element compositions, the consuming element defines children alongside the template type.

## AppSpec & Navigation

Multi-screen app with sidebar, auth, shared state. 100% opt-in.

```json
{
  "type": "app",
  "name": "my-app",
  "navigation": {
    "type": "sidebar",
    "initialScreen": "dashboard",
    "breadcrumb": "history",
    "menu": ["dashboard", "reports", "settings"],
    "auth": {
      "provider": "supabase",
      "loginScreen": "login",
      "protectedScreens": ["*"],
      "roleAccess": { "admin": ["*"], "user": ["dashboard", "profile"] },
      "persistence": "local",
      "tokenRefresh": true,
      "authDomains": ["myproject.supabase.co"],
      "sessionExpiredMessage": "Session expired, please sign in again"
    }
  },
  "screens": {
    "dashboard": { "label": "Dashboard", "icon": "chart-bar", "statePolicy": "preserve" },
    "new-item": { "label": "New", "icon": "plus", "statePolicy": "reset", "parent": "dashboard" },
    "login": { "label": "Login", "icon": "sign-in", "statePolicy": "reset" }
  },
  "tokens": { "colors": { "primary": "#0D9488" } },
  "sharedState": { "preferences": { "theme": "light" } },
  "templates": { },
  "layout": {
    "root": "shell",
    "elements": {
      "shell": { "type": "stack", "props": { "direction": "horizontal" }, "children": ["sidebar", "screen-outlet"] },
      "sidebar": { "type": "box", "children": ["nav"] },
      "screen-outlet": { "type": "screen-outlet", "style": { "flex": 1 } }
    }
  }
}
```

### AppSpec Properties

| Property | Type | Required | Purpose |
|----------|------|----------|---------|
| `type` | `"app"` | yes | Identifies as AppSpec |
| `name` | string | no | App display name |
| `navigation` | object | yes | Navigation config (see below) |
| `screens` | object | yes | Screen definitions: `{ id: { label, icon, statePolicy, parent?, roles? } }` |
| `tokens` | object | no | Design tokens (colors, spacing, components). Available to all screens |
| `sharedState` | object | no | Initial shared state. Keys become root state paths (e.g., `"preferences"` → `/preferences`) |
| `templates` | object | no | Shared templates available to all screens |
| `translations` | object | no | i18n translations |
| `layout` | object | yes | `{ root, elements }` — sidebar + screen-outlet layout |

### Navigation Properties

| Property | Type | Required | Purpose |
|----------|------|----------|---------|
| `type` | `"sidebar"` | yes | Navigation style |
| `initialScreen` | string | yes | Default screen on app load |
| `breadcrumb` | string | no | `"history"` (nav stack), `"hierarchy"` (parent chain), `"none"` |
| `menu` | string[] | no | Sidebar screen order. Omit to show all screens. Login always excluded |
| `auth` | object | no | Auth config (loginScreen, protectedScreens, roleAccess, etc.) |

### State Policies

| Policy | On leave | On return | Use for |
|--------|----------|-----------|---------|
| `preserve` | Keep state | Restore | Lists, dashboards |
| `reset` | Clear | Fresh initialState | Create forms |
| `reload` | Clear | Re-execute initialActions | Always-fresh data |

### Access Control

**`roleAccess` (recommended):** centralized, sole source of truth when present. Roles not listed = zero access.
**`ScreenDefinition.roles`:** fallback when `roleAccess` absent. `["*"]` = any role.
loginScreen is always accessible. Unauthenticated → redirect to login. Authenticated but unauthorized → stay + error (no redirect).

### Auto-Generated State

| Path | Content |
|------|---------|
| `/navigation/currentScreen` | Active screen ID |
| `/navigation/history` | Visited screen IDs |
| `/navigation/breadcrumb` | Enriched array with label, icon |
| `/app/screens` | Accessible screens (filtered by role, excludes loginScreen) |

Sidebar auto-refreshes on auth changes. Breadcrumb modes: `history` (navigation stack), `hierarchy` (parent chain), `none`.

**Sidebar navigation** is built from `/app/screens` (auto-generated, filtered by role). Use a `repeat` on `/app/screens` to render nav items — each item has `id`, `label`, `icon`.

### Auth Config

Persistence: `"local"` (survives browser close), `"session"` (lost on close), `"memory"` (lost on refresh).

Interceptors:
```json
"interceptors": { "logging": true, "timeout": { "ms": 15000 }, "retryOnError": { "maxRetries": 2, "statuses": [502, 503] } }
```

Security: tokens NEVER in state (engine closure only). `$auth` blocks token/password fields. Auth headers only for `authDomains`. Credentials cleared after login. Rate limit: 5/min. Cross-tab sync automatic.

Custom JWT provider response mapping: `tokenPath`, `refreshTokenPath`, and `userPath` are dot paths against the full login/refresh response. `rolePath` and `rolesPath` use a compat dual contract: plain keys like `"role"` / `"roles"` resolve inside the extracted `userPath` object; dotted paths like `"user.role"` or `"data.user.role"` resolve against the full response. If no role or roles are found, Mythik uses `defaultRole` (`"user"` by default) and warns in development.

### Login Screen

**Use `/screens/login/...` paths** (not `/form/...`). Combined with `statePolicy: "reset"`, credentials clear on logout.

```json
{
  "root": "login-page",
  "elements": {
    "login-page": { "type": "box", "style": { "display": "flex", "alignItems": "center", "justifyContent": "center", "minHeight": "100vh" }, "children": ["card"] },
    "card": { "type": "box", "style": { "width": 400, "padding": 32, "borderRadius": 16 }, "children": ["email", "pass", "error", "btn"] },
    "email": { "type": "input", "props": { "placeholder": "Email", "value": { "$bindState": "/screens/login/email" } } },
    "pass": { "type": "input", "props": { "placeholder": "Password", "type": "password", "value": { "$bindState": "/screens/login/password" } } },
    "error": { "type": "text", "visible": { "$auth": "error" }, "props": { "content": { "$auth": "error" } }, "style": { "color": "#EF4444" } },
    "btn": { "type": "button", "props": { "label": { "$cond": { "$auth": "loading" }, "$then": "Signing in...", "$else": "Login" }, "disabled": { "$auth": "loading" } },
      "on": { "press": { "action": "login", "params": { "email": { "$state": "/screens/login/email" }, "password": { "$state": "/screens/login/password" } } } }
    }
  }
}
```

Login renders fullscreen (no sidebar). After login, layout appears reactively.

`$auth` fields: `isAuthenticated`, `id`, `email`, `name`, `avatar`, `role`, `roles`, `metadata`, `metadata.*`, `user`, `loading`, `error`. Blocked: `token`, `accessToken`, `password`, `secret`, `session`.

Auth state paths (read-only, auto-managed): `/auth/isAuthenticated`, `/auth/loading`, `/auth/error`, `/auth/user/id`, `/auth/user/email`, `/auth/user/name`, `/auth/user/role`, `/auth/user/roles`, `/auth/user/metadata`. Protected by StateGuard.

### Cross-Screen Data Flow

**Master → Detail via framework-reserved `/ui/selectedRow`:**
```json
// List screen: row click (framework auto-writes row to /ui/selectedRow) + navigate
"onRowClick": [
  { "action": "navigateScreen", "params": { "screen": "item-detail" } }
]

// Detail screen: reads /ui/selectedRow directly
"props": { "content": { "$state": "/ui/selectedRow/name" } }
```

The framework writes the clicked row to `/ui/selectedRow` before dispatching `onRowClick` actions (see `ai-context-runtime-semantics.md § 2.1` + § 5.1). No explicit `setState` needed to capture the row. Do NOT use the literal string `"$row"` — there is no `$row` expression.

**Column action buttons follow the same pattern.** When a button in `columns[].actions[]` is clicked, the framework auto-writes the row to `/ui/selectedRow` before dispatching the action chain. The action's `$state` / `$template` params resolve at press time (lazy, not render-time). See `ai-context-runtime-semantics.md § 1.3`.

**Navigation with params:**
```json
// Source: navigate with extra params
{ "action": "navigateScreen", "params": { "screen": "profile", "employeeId": 42 } }

// Target: read /navigation/params
"props": { "content": { "$state": "/navigation/params/employeeId" } }
```

`/navigation/params` is reset on each navigation. Use `/ui/selected*` for data that persists across back-navigation.

### Fullstack Coherence (API + Frontend)

When generating both API spec and frontend screens:
- Frontend `fetch` URLs must match API `endpoint.path` values
- Frontend filter dropdown options must match API `catalogs` static values
- Frontend CRUD transaction methods (POST/PUT/DELETE) must match API endpoint methods
- API `policies` role lists should align with AppSpec `roleAccess`
- API `scopeFilter.bypassRoles` should include the same admin roles as AppSpec

## Interactive States & Animations

### Hover / Active / Focus

```json
"hover": { "scale": 1.03, "backgroundColor": "#F1F5F9" },
"active": { "scale": 0.97 },
"focus": { "boxShadow": "0 0 0 3px rgba(13,148,136,0.3)" },
"transition": { "duration": 150, "ease": "easeOut" }
```

Transform props (`scale`, `x`, `y`, `rotate`, `scaleX`, `scaleY`) → Motion wrapper. CSS props → pseudo-classes (no extra DOM). Buttons/touchables have built-in transitions — only add for custom behavior. CSS hover works on: `box`, `text`, `stack`, `grid`, `scroll`, `button`, `touchable`, `table`.

### Mount/Exit Animations

Two systems coexist. Prefer `animations` (engine) for new specs — it's cross-platform (web + RN), reduced-motion aware, and integrates with the animation engine's 15 curated recipes. `motion` is the legacy Framer-Motion-style field kept for backward compat.

**Animation engine (`animations` field — preferred):**
```json
"animations": { "mount": { "recipe": "fade-up" }, "hover": { "recipe": "lift" } }
"animations": { "mount": [{ "recipe": "fade" }, { "recipe": "scale-in" }] }
"animations": { "ambient": { "recipe": "breathe-subtle" }, "active": { "recipe": "pop" } }
"animations": { "stateChange": { "watch": "/cart/count", "on": "increase", "recipe": "pop", "duration": 300 } }
```
- 15 recipes: `fade`, `fade-up`, `fade-down`, `scale-in`, `slide-left`, `slide-right`, `lift`, `glow`, `pulse-primary`, `breathe-subtle`, `shimmer`, `float`, `pop`, `shake`, `spin`
- `glow` is WEB-ONLY (colored boxShadow halo; RN no-op until shadow parsing ships)
- Array per trigger = parallel animations (soft-cap 3, hard-cap 6 per trigger; 5/7 triggers soft/hard)

**Cascade — declare `animations` at any of five levels**:

1. `tokens.identity.animations` — app-wide defaults (e.g. every element mounts with `fade-up`). Applies to every element, including primitives **inside** custom element expansions.
2. `tokens.components.<type>.<variantName>.animations` OR `ElementDefinition.variants[name].animations` — per-variant overrides (e.g. the `ctaPulse` button variant adds `ambient: pulse-primary`). For custom elements, `ElementDefinition.variants` is checked first, then `tokens.components[type].variants` as theme-level fallback.
3. **`elementDef`** — the author's declaration on a primitive inside a custom element's render tree. Present **only** inside custom element expansions; undefined everywhere else (inheritance-neutral). Lets authors ship per-primitive animation defaults that survive identity cascade without being overridable by the consumer.
4. `spec.templates.<templateName>.animations` — per-template overrides; supports `$prop`/`$state`/`$cond` interpolation against the consuming element's props.
5. `element.animations` — per-element overrides; wins over all other levels. For custom element instances, applies **only** to the outer primitive of the expansion (black-box boundary).

Merge order is identity → variant → elementDef → template → element, per-trigger. Later levels override earlier. Non-overlapping triggers from different levels combine (identity's `mount` + variant's `ambient` + element's `hover` all apply together). `$state`/`$cond`/`$token`/`$prop` expressions resolve inside any level before merging.

Null semantics (precise):
- Per-trigger `null` at any level (e.g. `element.animations: { hover: null }`) disables that trigger and blocks inheritance. Use to opt-out of an inherited default.
- Whole-field `null` (e.g. `variant.animations: null`) is inheritance-neutral — that level contributes nothing, but earlier levels still apply. Equivalent to omitting the field.
- `undefined` / omitted = inherit from earlier level (pass-through).

```json
{
  "tokens": {
    "identity": { "animations": { "mount": { "recipe": "fade-up" } } },
    "components": {
      "button": {
        "cta": { "animations": { "ambient": { "recipe": "pulse-primary" } } }
      }
    }
  },
  "templates": {
    "hero-card": {
      "type": "box",
      "animations": { "mount": { "recipe": "scale-in" }, "hover": { "recipe": "lift" } }
    }
  },
  "elements": {
    "my-card": { "type": "hero-card", "animations": { "hover": null } },
    "rating": { "type": "rating-stars", "animations": { "mount": { "recipe": "scale-in" } } }
  }
}
```
Resolves: `my-card` gets `mount: scale-in` (template wins over identity), `hover` disabled (element null wins over template's lift). `rating` outer primitive gets `scale-in` (consumer wins); inner star primitives get `fade-up` from identity (consumer cannot reach them — black-box boundary).

**Legacy Framer-Motion field (`motion` — still supported):**
```json
"motion": { "initial": { "opacity": 0, "y": 20 }, "animate": { "opacity": 1, "y": 0 }, "transition": { "duration": 0.3 } }
"motion": { "exit": { "opacity": 0, "y": -10 } }
```
Staggered children: parent `"transition": { "staggerChildren": 0.05 }`, each child has own initial/animate. The legacy token-driven entrance injection via `identity.motionEntrance` is no longer supported — use `animations.mount` instead.

### Deep Design Token System

Tokens go beyond colors. Every visual property reads from tokens — shape, typography, spacing, elevation, motion, opacity. Three-layer resolution: framework defaults → DNA derivation → manual overrides.

**DNA Seed** — Define 1-8 seed values; the framework derives ALL tokens automatically via OKLCH color science:

```json
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
```

| Seed | Range | Controls |
|------|-------|----------|
| `primary` | hex | Base color → entire palette (13-stop tonal palette in OKLCH) |
| `harmony` | `complementary` \| `analogous` \| `triadic` \| `split-complementary` | How accent color relates to primary |
| `accent` | hex (optional) | Explicit accent instead of derived |
| `neutral` | `warm` \| `cool` \| `natural` | Neutral tone tint |
| `roundness` | 0–1 | Shape: 0=sharp/brutalist → 1=pill/playful |
| `density` | 0–1 | Spacing: 0=airy → 1=compact |
| `depth` | 0–1 | Shadows: 0=flat → 1=elevated |
| `motion` | `fluid` \| `snappy` \| `gentle` \| `energetic` | Animation personality |
| `formality` | 0–1 | Typography: 0=casual (Inter) → 1=formal (Playfair Display) |

Use `0–1` numeric DNA values in generated specs. The runtime accepts legacy `0–100` values for `roundness`, `density`, `depth`, and `formality` by normalizing values greater than `1` with `/100`, but canonical specs should emit `0.7`, not `70`.

**Three control levels:**

Level 1 — Minimal: `"dna": { "primary": "#0D9488" }` → full identity from 1 color.

Level 2 — Personality: `"dna": { "primary": "#0D9488", "roundness": 0.7, "motion": "fluid" }` → complete identity from 5 values.

Level 3 — Explicit override: DNA generates base, manual values override specific tokens:
```json
"tokens": {
  "dna": { "primary": "#0D9488" },
  "colors": { "error": "#DC2626" },
  "shape": { "radius": { "md": 24 } }
}
```

**Token categories and paths for `$token` references:**

```
colors.primary, colors.surface, colors.text, colors.error, colors.accent, ...
shape.radius.none/sm/md/lg/xl/full
typography.fontFamily.base/heading/mono
typography.scale.xs/sm/md/lg/xl/2xl  (each has .fontSize and .lineHeight)
typography.weight.normal/medium/semibold/bold
spacing.unit, spacing.scale.xs/sm/md/lg/xl/2xl
elevation.none/sm/md/lg/xl  (web: CSS boxShadow string, RN: native shadow props)
motion.duration.fast/normal/slow, motion.easing.default/enter/exit
motion.spring.damping/stiffness/mass, motion.stagger
opacity.disabled/pressed/backdrop/muted
```

**Auto dark mode:** DNA automatically generates `modes.dark` by inverting tonal palette stops. No manual dark theme needed. Override with explicit `modes.dark` if desired.

**Font loading:** Tokens define font names (`fontFamily.heading: "Playfair Display"`) but do NOT load fonts. Web: include `@font-face` or Google Fonts link. RN: use `expo-font`. This is the project's responsibility.

**CLI inspection:** `mythik tokens --dna '{"primary":"#0D9488","roundness":0.7}' --json` shows full resolved token set.

### Identity System (Forge)

DNA controls continuous/color values. Identity controls **categorical** visual dimensions that make apps look genuinely different:

```json
"tokens": {
  "dna": { "primary": "#0D9488", "roundness": 0.7 },
  "identity": {
    "surface": "outlined",
    "radiusPattern": "diagonal",
    "typographyHierarchy": "editorial",
    "labelStyle": "uppercase",
    "textDecoration": ["underline-accent", "shadow"]
  }
}
```

**Surface Treatment** — how every container, input, button, modal renders:

| Value | Feel | Effect |
|-------|------|--------|
| `elevated` | Material, floating (default) | boxShadow + border + solid bg |
| `flat` | Minimal, Notion-like | Color blocks only, no borders/shadows |
| `outlined` | Technical, Linear-like | 1px borders, transparent bg |
| `glass` | Premium, Apple-like | backdrop-filter blur, semi-transparent (needs dark/colored bg) |
| `bold` | Brutalist, confident | 2-3px solid borders, no shadows |
| `neo` | Soft 3D, tangible | Neumorphic inset+outset shadows, no borders |

**Radius Pattern** — asymmetric corner shapes:
`all` (default), `top`, `bottom`, `left`, `right`, `diagonal`, `inverse-diagonal`, `single`, `single-tr`, `single-bl`, `single-br`

**Typography Hierarchy** — heading scale relative to body:
`dramatic` (3×, 800w), `uniform` (1.3×, Notion-like), `editorial` (2.2×, elegant), `display` (4×, hero), `mono` (monospace), `contrast` (2.5×, ultra-thin 300w)

**Label Style** — form field labels: `normal`, `uppercase` (small caps + letter-spacing), `accent-colored`

**Text Decoration** — heading effects, **supports array for multi-select**:
`stroke`, `underline-accent`, `highlight`, `overline`, `shadow`

```json
"textDecoration": ["underline-accent", "shadow"]
```

**Box surface prop** — IMPORTANT: use `surface="card"` on card-like boxes:

```json
"my-card": {
  "type": "box",
  "props": { "surface": "card" },
  "style": { "padding": 24 },
  "children": ["content"]
}
```

Without `surface` prop, box is a plain layout div. With `surface="card"`, it gets identity-driven border, shadow, bg, and borderRadius. **Always use `surface="card"` for visual containers** (stat cards, form cards, content panels). Use `surface="modal"` for overlay panels.

**Page background** — always set the page layout bg to `colors.background`:
```json
"layout": { "type": "box", "style": { "backgroundColor": { "$token": "colors.background" } } }
```
This creates depth — cards (surface #fff) float on the slightly tinted background (#f8fafc).

**Color Scheme** — `identity.colorScheme`: `light-surface` (default), `dark-surface` (dark cards/light text), `colored-surface` (3 configurable tonal layers from primary palette).

**Colored Surface Layers** — configurable tonal steps (default 25/45/65):
```json
"identity": {
  "colorScheme": "colored-surface",
  "coloredSurfaceLayers": { "background": 25, "surface": 45, "primitive": 65 }
}
```
The 3 numbers are OKLCH lightness steps (0-100) applied to the primary color. Each produces a distinct layer: page bg (darkest), cards (mid), inputs (lightest). Focus ring uses accent color (not primary) in colored-surface.

**Color Weight** — WHERE color appears: `monochrome`, `branded-nav`, `gradient-hero`, `ambient`, `dark-native`. Layout tokens via `$token: colorWeight.navBg`.

**Accent Application** — WHERE accent appears: `buttons`, `navItems`, `cardLine` (array: `["top","left"]`), `links`, `backgrounds`, `iconContainers`.

**Architecture: structured surface styles** — `resolveSurfaceStyles()` returns platform-neutral objects (ShadowDef[], BorderDef, BlurDef — NO CSS strings). Platform serializers convert: `surfaceToCSS()` for web, `surfaceToRN()` for React Native. `resolveIdentity<T>(input, serializer)` orchestrates the full chain in one call. Surface styles are explicit — every property set (`border: 'none'` emitted explicitly, never omitted). Focus is surface-aware per type (bold keeps 2px, neo keeps inset shadow, glass uses semi-transparent border). `inputFocus` never includes `backgroundColor` (prevents checkbox override). Text/Input/Select/Textarea/Checkbox use `color: 'inherit'` — surface containers set `color: c.text`, children inherit automatically for correct dark/colored scheme text. Use `$token: "schemeColors.text"` and `$token: "colorWeight.navBg"` for scheme-aware values in specs.

**Runtime identity changes** — same as DNA, via `updateTokens`:
```json
{ "action": "updateTokens", "params": { "identity": { "surface": "bold", "radiusPattern": "diagonal" } } }
```

### Motion Tokens

```json
"tokens": {
  "motion": {
    "duration": { "fast": 150, "normal": 250, "slow": 400 },
    "easing": { "default": "ease-out", "enter": "ease-out", "exit": "ease-in" },
    "spring": { "damping": 20, "stiffness": 100, "mass": 1 },
    "stagger": 0.06,
    "presets": { "hoverLift": { "y": -2, "scale": 1.02 }, "fadeIn": { "initial": { "opacity": 0 }, "animate": { "opacity": 1 } } }
  }
}
```
Reference: `"hover": { "$token": "motion.presets.hoverLift" }`

## Component Variants

Token-driven styling. Define in `tokens.components.{type}.{variant}`:

```json
"tokens": {
  "components": {
    "button": {
      "primary": { "style": { "backgroundColor": "$colors.primary", "color": "#FFF", "borderRadius": "$shape.radius.md" }, "hover": { "scale": 1.05 }, "active": { "scale": 0.95 } },
      "danger": { "style": { "backgroundColor": "$colors.error", "color": "#FFF" } }
    },
    "box": {
      "card": { "style": { "backgroundColor": "$colors.surface", "borderRadius": "$shape.radius.lg", "padding": "$spacing.scale.md", "boxShadow": "$elevation.md" }, "hover": { "boxShadow": "$elevation.lg", "y": -2 } }
    }
  }
}
```
Usage: `{ "type": "button", "props": { "label": "Save", "variant": "primary" } }`
`$path` references (`$colors.primary`) resolve against active tokens — dark mode works automatically.
Element-level style/hover overrides variant (variant is base, element is override). Supports: `style`, `hover`, `active`, `focus`, `transition`.

## Skeleton & Export

**Auto-skeleton:** activates when spec has `fetch` in initialActions + loading + empty data. Zero config. Set `skeleton: false` on static elements. Shape mapping: text → line, image → rect, button → button, input → rect, icon → circle, charts → large rect.

**Export:** `{ "action": "export", "params": { "source": "/items", "columns": [{ "field": "name", "label": "Name" }, { "field": "price", "label": "Price", "format": "currency", "formatOptions": { "currency": "USD" } }], "filename": "report", "format": "csv" } }`
CSV built-in. XLSX/PDF via adapter. Column formats: `currency`, `number`, `percent`, `date`.

## ApiSpec (Server)

Declarative backend API definition. **See [ai-context-api.md](ai-context-api.md) for complete reference** (catalogs, endpoints, auth, audit).

Quick reference: `type: "api"` at root, with `auth`, `catalogs`, `endpoints` objects. No connection strings in spec.

## Storage Setup

Mythik stores specs in the consumer's database. Three tables are involved depending on which features the consumer opts into:

- **`screens`** (base, **REQUIRED**) — current spec per `id`. Used by every adapter (`SqlServerSpecStore`, `SupabaseSpecStore`, and the versioned subclasses which extend the base).
- **`screen_versions`** (opt-in) — version history. Required only when using `SqlServerVersionedSpecStore` / `SupabaseVersionedSpecStore` (i.e., consumers calling `mythik push --author <name>` or `runPush({ author })`).
- **`screen_environments`** (opt-in) — environment promotions. Required only when using `SqlServerEnvironmentStore` / `SupabaseEnvironmentStore`.

**The framework does NOT auto-create any of these tables.** Apply the schema below once during initial setup of the consumer's database, then the framework operates against the running tables.

**Authoritative since v0.1.0.** The framework's INSERT/SELECT/UPDATE statements (in `packages/core/src/spec-stores/sqlserver.ts`, `supabase.ts`, `sqlserver-versioned.ts`, `supabase-versioned.ts`) require these exact columns by name + semantic type. AI applying this schema in the consumer's environment MUST preserve all columns, constraints, and indexes; the SQL dialect is free to vary (NVARCHAR/VARCHAR/TEXT, BIT/BOOLEAN, DATETIME2/TIMESTAMPTZ — pick what the target DB supports).

**Versioned stores extend the base store.** When `SqlServerVersionedSpecStore.saveVersion(id, doc, meta)` runs, it appends to `screen_versions` AND calls the inherited base `save(id, doc)` which writes to `screens` (`packages/core/src/spec-stores/sqlserver-versioned.ts:110-111`). This means `screens` MUST exist for every consumer — there is no "versioning-only" mode that skips it.

### Table 0 — `screens` (current spec — REQUIRED for all stores)

| Column | Semantic type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | short string (≤255) | NOT NULL | — | Spec identifier; PK. Framework reads/writes via `WHERE id = ?` |
| `name` | short string (≤255) | NULL | — | Display name. Framework's INSERT populates with the same value as `id` (`sqlserver.ts:76` MERGE: `INSERT (id, name, spec, version, is_active) VALUES (@id, @id, @spec, 1, 1)`) |
| `spec` | long string (≥1MB capacity) | NOT NULL | — | JSON-encoded current spec. SQL Server uses `NVARCHAR(MAX)` text + defensive parse (`sqlserver.ts:58`); Postgres / Supabase MUST be `jsonb` (see below) |
| `version` | integer | NOT NULL | `1` | Incremented on every UPDATE (SQL Server: app-level at `sqlserver.ts:74`; Postgres: via TRIGGER, see below) |
| `is_active` | boolean | NOT NULL | `true` | Framework's INSERT sets `1`/`true` (`sqlserver.ts:76`); UPDATE never touches it |
| `created_at` | UTC timestamp | — | — | OPTIONAL — framework does not read or write this column. If you add it for consumer hygiene (audit trail), make it `NOT NULL` with a NOW UTC default; otherwise omit entirely. |
| `updated_at` | UTC timestamp | NOT NULL | NOW UTC | Required. Updated on every UPDATE (SQL Server: app-level via `updated_at = GETUTCDATE()` at `sqlserver.ts:74`; Postgres: via TRIGGER, see below). Framework's INSERT at `sqlserver.ts:76` omits this column, so initial value comes from the column DEFAULT. |

**Constraints**:
- `PRIMARY KEY (id)` — required (every framework query filters by `id`)

**Indexes** (all RECOMMENDED, none framework-required):
- `(is_active, id)` — useful for consumer queries filtering active screens. The framework's `list()` uses only `ORDER BY id` (`sqlserver.ts:83`, `supabase.ts:66`) and does not filter by `is_active`, so this index is consumer-hygiene only.

### Table 1 — `screen_versions` (version history — opt-in: VersionedSpecStore)

| Column | Semantic type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | auto-increment integer, PK | NOT NULL | DB-managed | Surrogate PK; framework never writes it |
| `screen_id` | short string (≤255) | NOT NULL | — | Spec doc identifier |
| `version` | integer | NOT NULL | — | Sequential per-`screen_id`; framework computes via `MAX(version) + 1` |
| `is_snapshot` | boolean | NOT NULL | `false` | `true` for full-spec rows, `false` for patch rows |
| `spec` | long string (≥1MB capacity) | NULL | — | JSON-encoded full spec; populated only when `is_snapshot = true` |
| `patches` | long string (≥1MB capacity) | NULL | — | JSON-encoded patch array; populated only when `is_snapshot = false` |
| `author` | short string (≤255) | NOT NULL | `'system'` | Provided via `--author` flag; bootstrapped to `'system'` for lazy v1 backfill |
| `source_type` | short string (≤50) | NOT NULL | `'push'` | Source channel (`push`, `patch`, etc.) |
| `description` | medium string (≤1000) | NULL | — | Optional description from `--description` flag |
| `created_at` | UTC timestamp | NOT NULL | NOW UTC | Set by DB on insert |

**Constraints**:
- `PRIMARY KEY (id)` — surrogate key on the auto-increment column
- `UNIQUE (screen_id, version)` — framework relies on per-screen uniqueness to compute next version

**Indexes** (required for query performance):
- `(screen_id, version)` — supports `WHERE screen_id = ? ORDER BY version DESC`
- `(screen_id, version) WHERE is_snapshot = true` (partial index) — accelerates `loadVersion`'s nearest-snapshot lookup. If the target DB doesn't support partial indexes, omit and accept full-scan fallback (correctness preserved, performance degrades on long histories)

### Table 2 — `screen_environments` (environment promotions — opt-in: EnvironmentStore)

| Column | Semantic type | Nullable | Default | Notes |
|---|---|---|---|---|
| `screen_id` | short string (≤255) | NOT NULL | — | PK part 1 |
| `environment` | short string (≤100) | NOT NULL | — | PK part 2 (`dev`, `staging`, `prod`, etc.) |
| `version` | integer | NOT NULL | — | Promoted spec version (logical reference to `screen_versions.version`; not enforced as FK in v0.1.0) |
| `promoted_at` | UTC timestamp | NOT NULL | NOW UTC | Set by DB on insert; UPDATE on re-promotion |
| `promoted_by` | short string (≤255) | NOT NULL | `'system'` | Author who promoted |

**Constraints**:
- `PRIMARY KEY (screen_id, environment)` — one promotion record per `(spec, env)` pair; re-promote upserts via MERGE/UPSERT

### Postgres / Supabase: `jsonb` for `spec` and `patches`

On Postgres-flavored backends (Supabase, plain Postgres), the JSON columns MUST be `jsonb`, not `text`:

- `screens.spec` — Supabase code path returns `rows[0].spec` directly (`packages/core/src/spec-stores/supabase.ts:41`) without `typeof === 'string' ? JSON.parse(...) : raw` defense. A `text` column would return a string and downstream consumers (e.g., `MythikInstance.getSpec`, `MythikRenderer`) would receive a stringified spec instead of an object.
- `screen_versions.spec` and `screen_versions.patches` — Supabase versioned path consumes these as already-parsed objects from PostgREST (`packages/core/src/spec-stores/supabase-versioned.ts:132`, `:146`, `:149`); a `text` column would cause `applyPatches` / `structuredClone` to receive a string instead of an object, silent corruption.

SQL Server stores parse `NVARCHAR(MAX)` defensively (`typeof === 'string' ? JSON.parse(...) : raw` at `sqlserver.ts:58`, `sqlserver-versioned.ts:133-135` and `:153`) and tolerate either form, but Postgres-flavored stores have no such defense.

### Postgres / Supabase: triggers for `screens.updated_at` and `screens.version`

On Postgres-flavored backends, `screens.updated_at` and `screens.version` MUST be maintained by `BEFORE UPDATE` triggers because the Supabase save path sends only the `spec` field (`packages/core/src/spec-stores/supabase.ts:55`: `body: JSON.stringify({ spec })`); it does NOT update `updated_at` or `version` itself. SQL Server stores set both columns app-level inside the MERGE (`sqlserver.ts:74`: `UPDATE SET spec = @spec, updated_at = GETUTCDATE(), version = version + 1`) and do not need triggers.

Recommended trigger pair on Postgres:

```sql
CREATE OR REPLACE FUNCTION screens_update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION screens_increment_version()
RETURNS TRIGGER AS $$ BEGIN NEW.version = OLD.version + 1; RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER screens_updated_at_trigger
  BEFORE UPDATE ON screens
  FOR EACH ROW EXECUTE FUNCTION screens_update_updated_at();

CREATE TRIGGER screens_version_trigger
  BEFORE UPDATE ON screens
  FOR EACH ROW EXECUTE FUNCTION screens_increment_version();
```

Trigger function names are arbitrary (use any unique name); the framework does not introspect them.

`screen_versions` and `screen_environments` do NOT need such triggers — those tables are append-only / upsert-on-PK and the framework writes all columns explicitly on each INSERT/UPSERT (`supabase-versioned.ts:61-69`, `:77-85`, `:89-97`, `:243-249`).

### Idempotency requirement

The applied DDL MUST be idempotent — re-running it on a database that already has the tables MUST NOT fail and MUST NOT recreate. Use the target dialect's "if not exists" form:
- SQL Server: `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '...') CREATE TABLE ...`
- Postgres / Supabase: `CREATE TABLE IF NOT EXISTS ...`
- MySQL / MariaDB: `CREATE TABLE IF NOT EXISTS ...`

### Verification (post-apply)

After applying the DDL, verify the relevant tables exist with correct columns by querying the target's information schema. The query below covers all three tables; consumers using only the base store can drop `screen_versions` + `screen_environments` from the `IN (...)` list.

```sql
-- Standard ANSI:
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('screens', 'screen_versions', 'screen_environments')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

Confirm: 7 columns for `screens` (`id`, `name`, `spec`, `version`, `is_active`, `created_at`, `updated_at`), 10 columns for `screen_versions` (`id` through `created_at`), 5 columns for `screen_environments` (`screen_id` through `promoted_by`). If any column is missing or has a wrong NULL/NOT NULL flag, abort and report — the framework's INSERT/SELECT/UPDATE will fail at runtime otherwise.

On Postgres / Supabase, additionally verify the two triggers on `screens` are present (`information_schema.triggers` WHERE `event_object_table = 'screens'`); without them, `updated_at` and `version` will silently stop advancing on save.

### Custom table names

All three table names are independently configurable; overriding one does not require overriding the others:

```ts
new SqlServerSpecStore({ ..., table: 'my_screens' })
new SqlServerVersionedSpecStore({ ..., table: 'my_screens', versionsTable: 'my_versions' })
new SqlServerEnvironmentStore({ ..., table: 'my_envs' })
```

(`SqlServerVersionedSpecStore` accepts both `table` from the base config and `versionsTable` from its own config, since it extends `SqlServerSpecStore`.)

If a consumer overrides any name, AI applies the same schema under the consumer-chosen name.

**Identifier safety scope**: SQL Server stores enforce `assertValidIdentifier` on every configured name (regex `/^[a-zA-Z_][a-zA-Z0-9_.]*$/`, max 128 chars — see `packages/core/src/security/identifier-guard.ts`). The validator is invoked in the constructor of `SqlServerSpecStore` (`sqlserver.ts:26`), `SqlServerVersionedSpecStore` (`sqlserver-versioned.ts:25`), and `SqlServerEnvironmentStore`. This blocks SQL injection via table-name interpolation in `[${table}]` / `[${versionsTable}]` template literals. Supabase stores do NOT validate any configured name (it flows directly into the REST URL via `${this.tableName}`); consumer code passing user-controlled table names to a Supabase store must validate them upstream.

### Canonical reference (SQL Server)

A working SQL Server bootstrap script for the **versioning tables only** (`screen_versions` + `screen_environments`) exists at `Demos/Mythik/demo-sqlserver/setup-versioning.ts` (in the demos workspace, outside the framework repo). It implements those two tables idempotently using `mssql` directly and is the canonical reference if the AI is uncertain about idempotent SQL Server syntax. There is no separate canonical script for the base `screens` table — AI applies this spec directly (the base table is short enough that translating the spec to a `CREATE TABLE` statement is unambiguous). For non-SQL-Server targets, AI translates both the spec and (if useful) the versioning script's structure to the target dialect.

### Schema evolution

When the framework changes the schema in a future version, this section will gain an "Evolution from v0.X.0" subsection listing per-version diffs (additive columns, new indexes, etc.) with idempotent ALTER instructions. AI inspecting the consumer's existing schema first, then applying the smallest set of ALTER statements to converge on the current version, is the canonical evolution path. v0.1.0 is the baseline — no evolution diffs yet.

## Rules

> Primitive-specific rules → [ai-context-primitives.md](ai-context-primitives.md). API rules → [ai-context-api.md](ai-context-api.md). Composition anti-patterns → [ai-context-patterns.md](ai-context-patterns.md).

1. Always use flat tree — root + elements map with string IDs for children
2. Field IDs must be unique within the spec — use descriptive names: `patient-name`, `submit-btn`
3. Arrays for ordered collections — never objects
4. Use `$let` array format when stored in JSONB — `[["a", expr], ["b", expr]]` preserves order
5. Use `$token` for all visual values — never hardcode colors, spacing, fonts
6. Use `$bindState` for form inputs — enables two-way binding
7. Use `$template` for computed strings — interpolation over concatenation
8. Use `$math`, `$array`, `$date`, `$format` instead of `$computed` — built-in ops cover 90%+
9. Use `$switch` for 3+ branches — replaces nested `$cond`. `default` required
10. `$array: 'append'` and `$array: 'replace'` use `value`, not `item` — `item` silently does nothing
11. `$group` only inside groupBy context — throws error outside
12. `$selection` only inside repeat with selection — throws error outside
13. Use `$auth` for user data, not `$state` — whitelisted, blocks tokens/passwords
14. CSS hover only works on: `box`, `text`, `stack`, `grid`, `scroll`, `button`, `touchable`, `table`
15. Don't use `overflow: hidden` with `box-shadow` hover — clips the shadow
16. Use `transaction` for all CRUD operations — instant UX with auto-rollback
17. In transactions: `closeModal` in `before`, data changes in `optimistic`
18. UPDATE transactions don't need `onSuccess` — re-fetch causes flash
19. Use `navigateScreen`/`goBackScreen` — not `navigate`/`goBack`
20. Use `repeat.source` for paginated/filtered lists — chain filter → search → slice
21. Use `derive` for computed stats — dependency-tracked, read-only
22. Use `dataSources` for reactive GET — `fetch` action for POST/PATCH/DELETE
23. Table `mode: "server"` for large datasets — writes sort/page to state
24. Use templates for repetitive elements — `$prop` parameterization
25. Use `forms` for coordinated validation — `isValid`, cross-field rules, submit gate
26. Use AppSpec for multi-screen apps — sidebar, navigation, shared state
27. Use `roleAccess` for centralized access — sole source when present
28. loginScreen always accessible — prevents redirect loops
29. Login renders fullscreen (no layout) — appears automatically when not authenticated
30. Login paths: `/screens/login/...` not `/form/...` — clears on logout with statePolicy reset
31. Auth headers auto-injected for `authDomains` — no manual headers in fetch
32. Use `variant` prop for component styling — don't copy style objects
33. `$path` references in variants resolve with dark mode automatically
34. Use `mythik push` for spec creation — no seed scripts
35. AppSpec patches use `/layout/elements/` not `/elements/`
36. Export columns support formatting — same as `$format`
37. `$token` auto-reads `/preferences/theme` — use `toggleTheme` action for dark mode
38. `emptyWhileLoading: false` keeps previous data during re-fetch — better UX
39. Set `tokens.identity` for app visual personality — at minimum `surface` + `typographyHierarchy`
40. Use `surface="card"` on card-like boxes — without it, boxes ignore identity surface treatment
41. Set app background via `tokens.identity.background` as a LayerBackground — `{ "color": "#0a0a0a", "layers": [...] }`. MythikRenderer mounts a root <BackgroundStack> that composes layers (solid/gradient/pattern/grain/image/blobs) with per-layer `blendMode` / `opacity` / `zIndex`. Palette threads from `tokens.colors.{primary,accent}` so blob layers render at render-time. Do not use the legacy `{ "$token": "backgroundCSS" }` pattern or `identity.background.style` shape.
42. `textDecoration` supports array for multi-select — `["underline-accent", "shadow"]` merges effects
43. Select dropdown uses `surface.modal` (always opaque) — never `surface.card` (transparent in outlined)
44. `_motion.whileTap` and `_motion.whileHover` forward to Framer Motion — use `"Infinity"` (string) for `repeat` in JSON, renderer converts to JS `Infinity`
45. `Element.key` forces remount on value change — use dynamic expression (e.g., `{ "$template": "preview-${/internal/version}" }`) to re-trigger mount animations on state change
46. Input supports `type: "color"` — renders native OS color picker, use with `$bindState`
47. Slider `label` is display-only — does NOT append current value. Use `$template` to include it: `"label": { "$template": "Roundness: ${/dna/roundness}%" }`
48. Identity icons: `weight` from tokens is default (spec prop overrides), `container` auto-wraps ('circle'/'square'/'rounded-square') unless `container={false}` in spec
49. Identity images: `corners` from tokens is default borderRadius (spec `style.borderRadius` overrides), `overlay` adds gradient/tint (spec `overlay="none"` suppresses)
50. `gradients.text = true` applies gradient clip on headings — spec `style.color` overrides. Web-only
51. `gradients.buttons = true` applies gradient bg on primary buttons — spec `style.background` overrides. Web-only
52. `identity.background` is a `LayerBackground` — `{ color?: string, layers?: LayerConfig[] }`. Legacy `identity.background.style`, `resolveBackgroundCSS()`, and `resolveBlobStyles()` are not part of the public contract. Layer kinds: `'solid'|'gradient'|'pattern'|'grain'|'image'|'blobs'`. Each carries `opacity?` + `blendMode?` + `zIndex?` (LayerCommonProps). Example: `"layers": [{ "type": "gradient", "kind": "radial", "stops": [...] }, { "type": "grain", "intensity": 0.04 }]`
53. Blob layer v2 — `{ "type": "blobs", "preset": "organic-duo"|"organic-trio"|"circle-pair", "palette": ["primary", "accent"], "motion": "drift-gentle"|"drift-fluid"|"drift-snappy"|"static", "blobOpacity"?: 0..1 }` for preset form, OR `{ "type": "blobs", "blobs": [{ "shape": "organic-1"|...|"circle"|"custom-svg", "position": {x,y}, "size": {width,height}, "color": "primary"|"accent"|hex, "opacity"?, "blur"?, "motion"?: {drift?, rotate?, scale?} }] }` for explicit form. Custom-svg requires `path` + `viewBox`. Motion converts to ambient animations via useShapeAnimations. RN: `blur` is currently not rendered; treat it as a web-only visual until filter parity ships.
54. **Do not emit `identity.motionEntrance` or `identity.motionHover`.** Per-element mount animation is now `element.animations.mount: { recipe: 'fade-up' | 'fade' | 'scale-in' | 'slide-right' | ... }` (15 recipes available; `glow` is web-only). Mapping from the old values: `motionEntrance: 'fade'` → `animations.mount.recipe: 'fade'`; `'slide-up'` → `'fade-up'`; `'scale'` → `'scale-in'`; `'slide-left'` → `'slide-right'`. Hover similarly uses `animations.hover`
55. `gradients.text` and `gradients.buttons` accept `'vibrant'` (OKLCH), `'soft'` (light tones), `'muted'` (sRGB desaturated center), `true` (=vibrant), or `false`
56. **Do not emit `backgroundBlobs`.** Box `backgroundBlobs` and legacy per-element blob rendering are not part of the public primitive contract. App-level background lives exclusively at `tokens.identity.background` (rule 41/52) and mounts at MythikRenderer via <BackgroundStack>.
57. **Do not emit `$token: "backgroundCSS"`.** `$token: "backgroundCSS"` does not resolve. Use the LayerBackground shape at `tokens.identity.background` (rule 41) instead.
58. Border/elevation override requires opt-in — `identity.overrideSurfaceBorders: true` overrides card+modal borders/shadows, `identity.overrideInputButtons: true` overrides input+button borders/shadows. Both default `false` (surface type controls everything). `borderColor`: 'neutral'|'primary'|'accent'|'text'. `elevationStyle`: 'none'|'diffuse'|'solid'|'color'. `elevationColor`: 'dark'|'primary'|'accent'
59. `identity.headingColor` ('default'|'primary'|'accent'|'primary-dark') controls heading text color. Gradient text overrides when active. Default = 'inherit'
60. Object composition in action params works without `$object` — `{ "dna": { "$state": "/dna" }, "identity": { "$state": "/identity" } }` resolves each `$state` recursively. Same in element props
61. `$event` is NOT a valid expression — do NOT use `{ "$event": "value" }` in action params. For select/control `on:change`, use `$bindState` on the value prop for two-way binding, then read the value with `$state` in the action: `"value": { "$bindState": "/path" }` + `"on": { "change": [{ "action": "myAction", "params": { "val": { "$state": "/path" } } }] }`
62. Preset dropdown pattern — `applyPreset` action applies registered presets. Use `$bindState` + `$state` pattern (rule 61). `'custom'` is a no-op. Every control that modifies tokens should add `{ "action": "setState", "params": { "statePath": "/ui/currentPreset", "value": "custom" } }` to its `on:change` to reset the preset indicator
63. Custom elements are first-class primitives — `plugins.registerElement` registers a type that consumers use with identical syntax to built-ins: `{ "type": "rating-stars", "props": { ... }, "animations": { ... }, "hover": { ... }, "visible": ..., "key": ... }`. All instance-level fields apply to the outer primitive of the expansion. See [ai-context-custom-elements.md](ai-context-custom-elements.md) for authoring
64. Custom element black-box boundary — consumer's instance-level `animations`, `hover`, `active`, `focus`, `motion`, `style`, `visible`, and `key` apply to the OUTER primitive only. Inner primitives are the author's domain and are not reachable from the consumer. Identity cascade (rule 63 / cascade level 1) still reaches inner primitives; consumer cannot override them directly
65. `$prop` is nearest-enclosing-custom-element-scoped — inside a custom element's render tree, `$prop` resolves against THAT element's merged props. Nesting a custom element inside another pushes a new prop context; the outer's props are shadowed, not merged. Pass values explicitly via prop declarations when nested access is needed
66. `$children` marker in custom element render trees — authors write `"$children"` as a string item in their render tree `children` array to mark where consumer children are inserted during expansion. Multiple markers each splice the full consumer children. Same slotting semantics as spec templates
67. `variant` is a PROP — place it inside `props`, never as a top-level element field. Applies to built-in primitives and Layer 3 custom elements alike: `{ "type": "stat-card", "props": { "variant": "primary", ... } }`. Top-level `variant` is silently ignored (the renderer reads `props.variant` only). Consumer may drive it dynamically via an expression: `"variant": { "$switch": { "$state": "/filter/recordType" }, "cases": { "1": "active" }, "default": "inactive" }`
68. Custom elements may expose action-chain props — author declares a prop (e.g. `onSelect`, type `"array"`) and the render tree's `on:<event>` references it as `{ "$prop": "onSelect" }`. Consumers supply the full action array as the prop value; inner `$state` / `$template` / `$item` inside those actions resolve at press time with the current state (not at render time). Enables tabs, menu items, and similar patterns where the consumer owns the action chain
69. Never use `$row` literal — there is no `$row` expression handler. Read row data via `$state: '/ui/selectedRow/<key>'` (framework writes clicked row before column action dispatch).
70. Never combine `crud: {}` with `endpoint.path` ending in `/:id`. CRUD operations auto-append `/:id` to PUT/DELETE routes. Declaring `path: '/api/x/:id'` produces `/api/x/:id/:id`.
71. Never include `:port` in `auth.authDomains[]` entries. The matcher uses `URL.hostname` for comparison — ports are silently stripped, leading to apparent matches that don't actually match.
72. `spatial-map` is the generic SVG/data-first primitive for floor plans, seating maps, parking maps, warehouse layouts, hospital beds, and similar spatial workflows. JSON `onItemPress` actions write item context to `/ui/selectedSpatialItem` before lazy dispatch. Compose domain menus/drawers/modals externally; do not encode restaurant-specific behavior into the primitive. Use `{ "$state": "/path" }` expressions for dynamic `items`, `zones`, `mode`, and `statusStyles`; do not invent `*Path` prop aliases.
73. For `spatial-map` editing, use `editPolicy` for movement rules and `onItemChange` for persistence. Do not use `interactionPolicy` for drag/keyboard movement. In JSON specs, persist moved items with `$array: "replace"` reading from `/ui/spatialItemChange` or the configured `itemChangePath`; use plain `setState` for non-undoable screens and wrap the same value in `editorCommit` for undoable editors.
74. For JSON-created client-side item ids, use `$uniqueId` with an explicit `source`, `field`, `prefix`, and optional `padding`. It is deterministic and scoped to the source array; use it for local/editor objects, not as a substitute for database primary keys when a backend owns identity.
75. For `spatial-map` lifecycle editing, compose create/duplicate/delete outside the primitive. Add/place uses consumer-owned `placeMode` + `canvasPressPath` + `$array: "append"`; duplicate copies the selected full item, generates a new `$uniqueId`, offsets position, and preserves shape/status/metadata; delete captures a candidate, opens a modal, confirms with `$array: "remove"`, then clears draft/selection state. Do not set `props.visible` on modals/drawers; `openModal`/`closeModal` drive `/ui/modals/{id}` automatically.
76. In `spatial-map`, item `status` is semantic/visual only; never treat `status: "inactive"` as non-interactive. Use `disabled: true` to intentionally lock an item. For add/place workflows, drive `canvasGuide.visible` from consumer state such as `/ui/floorEditor/placeMode` to show a generic dotted SVG crosshair without writing placement state on pointer move.
77. For `spatial-map` snap/guides, configure `editPolicy.snap` and `editPolicy.guides`; do not invent domain-specific placement props. Snap is generic and applies to drag, keyboard movement, item/zone resize handles, and canvas placement. Grid threshold is per-axis, so X and Y can snap independently; keyboard movement with grid snap advances by grid stops on the moved axis. In JSON add/place flows, read `/ui/spatialCanvasPress/point` as the effective coordinate and `/ui/spatialCanvasPress/rawPoint` only when the original pointer coordinate is needed. Snap/guide overlays are visual authoring aids and do not persist data by themselves.
78. For `spatial-map` resize/rotate, use item `transform.scaleX/scaleY` plus `rotation`; do not rewrite `shape` dimensions/points/path data as the primary resize model. For arbitrary `path` items, provide `localBounds` if resize handles are required. Persist runtime resize/rotate through `onItemChange` and `/ui/spatialItemChange/nextItem` with `$array: "replace"`; use `editorCommit` when the edit must be undoable. Snap for resize handles is world/map-coordinate snap, not a hidden per-item rotated grid.
79. For `spatial-map` zone editing, use `selectedZonePath`, `zoneChangePath`, `onZonePress`, and `onZoneChange`; do not overload item paths for zones. Runtime zone movement writes `nextZone.position`; runtime zone resize writes `nextZone.transform.scaleX/scaleY`; both preserve `nextZone.shape`, so polygon/path geometry is not rewritten as a side effect of editing. Zone movement participates in `editPolicy.snap`/`editPolicy.guides` using the center of transformed derived zone bounds as its snap anchor, or `position` when no bounds exist. Persist with `$array: "replace"` from `/ui/spatialZoneChange/nextZone` or the configured custom path; use `editorCommit` when the edit must be undoable. Use `interactionPolicy.selectZones`/`activateZones` and `editPolicy.dragZones`/`keyboardMoveZones`/`resizeZones`/`keyboardResizeZones` explicitly when a map is an editor.

80. For element `style`, use `backgroundColor` for solid colors and `backgroundImage` for gradients. Never use the `background` shorthand. The framework's surface treatments (`box`/`button` with `props.surface: "card"|"modal"`, etc.) emit `backgroundColor` longhand into the merged style; spec `style.background` shorthand triggers React shorthand/longhand conflict warnings on every rerender (`Updating a style property during rerender (backgroundColor) when a conflicting property is set (background)`). Same applies to gradient text on headings — when `identity.gradients.text` is set, the framework already drives `backgroundImage` via `background-clip: text`; do not override with `style.background`.
81. Use `editorSessions` for generic JSON-first editor undo/redo/dirty workflows. Declare tracked document paths such as `/layout/items` and `/layout/zones`; the framework writes metadata under `/ui/editorSessions/<id>` and protects that subtree. Use `editorCommit` for one atomic undoable edit, `editorUndo`/`editorRedo` for history navigation, `editorDiscard` to restore the last saved snapshot, and `editorValidate` for configured validators. For normal saves, configure `editorSessions.<id>.persistence` and dispatch `editorSave`; reserve `editorMarkSaved` for low-level/advanced integrations that have already completed their own persistence successfully. Do not track transient `/ui/*` drafts or selections as editor document paths.
82. Use `editorSessions.<id>.persistence` plus `editorSave` for generic editor document persistence. The AI should not hand-compose `transaction` + `editorMarkSaved` for normal editor saves. `editorSave` captures the tracked paths snapshot, persists it through the host fetcher with URL-guard checks, and marks only the sent snapshot as saved after success. Failed saves keep `dirty: true` and expose save metadata under `/ui/editorSessions/<id>`.
83. Use `navigation.editorSessionGuard` for generic unsaved-changes protection in app specs instead of hand-rolled JSON dirty checks. Configure `sessions`, render your own JSON modal from `/ui/navigationGuard/pending`, call `navigationGuardCancel`, `navigationGuardSaveAndProceed`, `navigationGuardProceed`, or `navigationGuardDiscardAndProceed`, and keep `pendingPath` under a consumer-owned `/ui/<segment>` path that does not collide with reserved framework paths. `navigationGuardSaveAndProceed` is the normal save-first UX for persisted editor sessions; `navigationGuardProceed` is a low-level non-destructive retry that only resumes after the pending editor sessions are already clean; use `navigationGuardDiscardAndProceed` when the user explicitly chooses to abandon unsaved tracked-path changes.
84. In React apps without auth framework fetch, pass `fetcher` to `MythikApp` when editor sessions use `editorSave` or `navigationGuardSaveAndProceed`. Auth-enabled apps continue to use the framework fetch produced by auth interceptors. Do not route save-and-continue through `/ui/lastError` or a hand-composed fetch action; the editor session engine owns save metadata under `/ui/editorSessions/<id>`.
85. For existing spec edits, the required AI loop is `mythik manifest` -> `mythik elements` -> `mythik patch --from-file` -> verify. Manifest tells you the structure; elements gives the exact JSON you are changing; patch is the validated write path. Do not skip directly to full-spec `pull`/rewrite/push for a local change, do not mutate DB rows manually, and do not call `SpecStore.save()` from app code. Use `push` for new specs or intentional full replacement only.
86. Mythik's AI documentation ships with the `mythik` npm package. Before generating or modifying specs, locate it with `mythik docs path` and start from `docs/llms.txt`, `docs/consumer/ai-context.md`, and `docs/wiki/compiled/README.md`. Use `mythik docs copy ./mythik-docs` when a project-local copy is easier to hand to an AI agent.
87. DNA numeric seeds (`roundness`, `density`, `depth`, `formality`) are canonical `0–1` values. Generate `0.7`, not `70`. The runtime tolerates legacy `0–100` values by normalizing any numeric seed greater than `1` with `/100` during DNA derivation, including initial AppSpec load and runtime `updateTokens`.
88. API query endpoints can combine `pagination: "offset"` with `scopeFilter`. For generated counts, Mythik applies the scope filter to the source query before `COUNT(*)`, so paginated totals remain tenant-scoped. Prefer generated counts. If a custom `endpoint.count` is truly needed with `scopeFilter`, include `{{scopeWhere[:alias]}}` or `{{scopeAnd[:alias]}}`; Mythik expands the macro to the correct scope predicate and removes it for bypass roles. Other custom count SQL is left verbatim. Use `:alias` for JOIN/subquery counts, and do not reference internal scope params directly.
89. Transaction `confirm` failures from `fetch` preserve backend error details for `onError`. Read `/tx/error/message` for the best available message; when the backend returns `{ error: { code, message } }`, Mythik keeps that message, `code`, HTTP `status`, and raw `data` after rollback. Do not parse `/ui/lastError` from transaction specs.
