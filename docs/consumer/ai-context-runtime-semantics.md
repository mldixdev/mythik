# Mythik — Runtime Semantics

> Read when debugging runtime behavior or building CRUD / auth / table features.
> Companion to `ai-context.md` — read that first.

**Purpose**: runtime-behavior contract. Expression timing, reserved state paths, server API contracts, matcher semantics, store coordination, workflow paradigms.

**When to read**: your spec validates but behavior at runtime surprises. Or you're building a feature (CRUD, auth, table with row actions) and need the contract before composing.

**NOT here**: spec-gen rules (see `ai-context.md`), primitive prop tables (see `ai-context-primitives.md`), custom element authoring (see `ai-context-custom-elements.md`).

## Top behaviors to understand first

1. 🔴 [`/ui/selectedRow` magic path (§2.1)](#21-uiselectedrow--blocker-1)
2. 🔴 [CRUD 1-endpoint 3-route auto-generation (§3.1)](#31-crud--one-endpoint-three-routes--blocker-3)
3. 🟢 [dataSources + derive lifecycle (§5.2 + §5.3)](#52-datasources-lifecycle) — SHIPPED v0.1.0 Item E
4. 🟢 [authDomains hostname-only matching (§4.1)](#41-authdomains-hostname-only--blocker-5)

These five behaviors caused the most source-reading in the 2026-04 consumer-simulation experiment. If you read only one section of this doc, read these.

---

## 1. Expression Resolution Timing

When the framework resolves `$state`, `$template`, `$prop`, `$auth`, and other expressions varies by surface (where the expression lives in the spec). This matrix is the foundation of every debugging session involving "why is my `$state` returning stale / wrong data?".

### 1.1 Resolution Timing Matrix

| Surface | Binding Location | Resolution Timing | Context Source | Rationale |
|---|---|---|---|---|
| Spatial item press | `spatial-map.onItemPress` | **Lazy** - at item press via `lazyActionPaths` | Dispatch context + item from `/ui/selectedSpatialItem` | Renderer wraps spec ActionBindings into a function via `createContextDispatcher`; engine keeps raw at render; dispatcher resolves at press |
| Spatial item edit | `spatial-map.onItemChange` | **Lazy** - at edit commit via `lazyActionPaths` | Dispatch context + item change from `/ui/spatialItemChange` | Renderer wraps spec ActionBindings into a function via `createContextDispatcher`; engine keeps raw at render; dispatcher resolves after drag drop or keyboard move |
| Spatial zone press | `spatial-map.onZonePress` | **Lazy** - at zone press via `lazyActionPaths` | Dispatch context + zone from `/ui/selectedSpatialZone` | Renderer wraps spec ActionBindings into a function via `createContextDispatcher`; engine keeps raw at render; dispatcher resolves at press |
| Spatial zone edit | `spatial-map.onZoneChange` | **Lazy** - at edit commit via `lazyActionPaths` | Dispatch context + zone change from `/ui/spatialZoneChange` | Renderer wraps spec ActionBindings into a function via `createContextDispatcher`; engine keeps raw at render; dispatcher resolves after drag/resize drop or keyboard move/resize |
| Spatial canvas press | `spatial-map.onCanvasPress` | **Lazy** - at SVG canvas press via `lazyActionPaths` | Dispatch context + canvas point from `/ui/spatialCanvasPress` | Renderer writes canvas context to `canvasPressPath` before dispatch; item handlers stop propagation |
| Editor session commit | `editorCommit.params.changes[].value` | **Lazy** - at action dispatch | Current state and prior lazy spatial contexts | Dispatcher deep-resolves commit params immediately before the history engine applies the atomic tracked-path edit |
| Direct props | `element.props.*` | **Eager** — at render | Render context | Props become HTML/RN attributes; must be concrete at render |
| Event binding (outside repeat) | `element.on.<event>` | **Lazy** — at press/dispatch | Dispatch context | Action params need current state, not render-time snapshot |
| Event binding (inside repeat) | `element.on.<event>` | **Eager** for `$item`/`$index` shape + params | Item context + dispatch context | `$item` binds to the row being rendered; outer wrapping is eager, inner `$state` still resolves per dispatch |
| Event binding as `$prop` | `element.on.<event>: { $prop: "..." }` | **Eager** outer shape (for Layer 3 propagation) + lazy inner | Prop cascade + dispatch | Custom-element action propagation needs consumer's binding at render; inner state/template stay press-time |
| Column actions | `columns[].actions[].onPress` | **Lazy** — at press via `lazyActionPaths` | Dispatch context + row from `/ui/selectedRow` | Primitive declares lazy paths; engine keeps raw at render; dispatcher resolves at press |
| Row click | `onRowClick` | **Lazy** — at click via `lazyActionPaths` | Dispatch context + row from `/ui/selectedRow` | Renderer wraps spec ActionBindings into a function via `createRowDispatcher`; engine keeps raw at render; dispatcher resolves at click |
| `$template` in action params | action params | **Lazy** — at dispatch | Action dispatch context | Template's nested expressions resolve with dispatch-time state |
| `$template` in element props | prop values | **Eager** — at render | Render context | Props need concrete string at render |
| `initialActions[]` params | spec-level | **Eager** at spec mount | Mount context | Runs once at mount; state then stable for subsequent renders |
| Transaction `before` | transaction phase | **Eager** at dispatch start | Dispatch context | Pre-network; fires before optimistic |
| Transaction `optimistic` | transaction phase | **Eager** at dispatch | Dispatch + optimistic state | State changes applied synchronously |
| Transaction `onSuccess` / `onError` | transaction phase | **Eager** at network resolve/reject | Dispatch + response | Response available in resolver context |
| Form bindings | `$bindState` | **Eager read** at render + write on input change | Render + event | Bidirectional binding |

### 1.2 `element.on` — lazy event bindings

**Contract:** Outside a `repeat`, event bindings in `element.on.<eventName>` are stored raw by the renderer. The action dispatcher resolves inner `$state` / `$template` at press/dispatch time, not render time.

**Why it matters:** `onClick: [{ action: "fetch", params: { url: { "$template": "/api/items/${ /ui/selectedId }" }}}]` — the `$template` reads `/ui/selectedId` at *click* time. If the user clicked a different row between render and click, the click reads the later value. Correct behavior for typical event flows.

**Special cases:**
- **Inside a `repeat`** — the binding wrapper is eagerly resolved so `$item` / `$index` can bind to the row being rendered. Inner `$state` / `$template` inside `params` stay lazy (press-time) unless they reference `$item` directly.
- **`$prop` bindings** — when the binding itself is `{ $prop: "onAction" }` (custom-element Layer 3 propagation), the `$prop` is resolved eagerly so the consumer's supplied action chain replaces it. Inner expressions inside that chain stay lazy.
- **`TransactionBinding`** — passed through verbatim; transaction engine resolves phases at their respective times.

Implementation: `packages/core/src/renderer/engine.ts:996-1049`.

### 1.3 Column actions — lazy resolution at press time

**Contract:** Actions declared inside `columns[].actions[].onPress` resolve their inner `$state` / `$template` / `$auth` expressions **at press time**, not render time. Row context flows via the framework-managed `/ui/selectedRow` magic path (see §2.1 + §5.1).

**Canonical pattern:**

```json
{
  "type": "table",
  "props": {
    "data": { "$state": "/items" },
    "columns": [{
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
  }
}
```

When the user clicks the action:
1. Framework writes the clicked row to `/ui/selectedRow` (via `createRowDispatcher` at `packages/react/src/runtime/row-dispatcher.ts`).
2. Dispatcher resolves `itemId: { $state: "/ui/selectedRow/id" }` against the just-written value.
3. `openModal` action receives the correct `itemId` for the clicked row.

**Mechanism:** Primitives declare `lazyActionPaths` in `PRIMITIVE_PROP_SCHEMAS`. Table declares `['columns[].actions[].onPress']`. The engine consults this declaration in `resolvePropsWithContext` (`engine.ts:167-186`) and keeps matched subtrees raw — `resolveDeep` does NOT walk into them. Similarly, `scanDeps` does NOT register state paths inside lazy subtrees as render dependencies, so cache invalidation is not triggered by row-context state changes.

**Any `$state` path works.** The lazy contract is path-agnostic — the resolver evaluates whatever `$state` path it sees at press time. `/ui/selectedRow/*` is canonical for row-context reads, but column actions can also read `/auth/user/...`, `/preferences/*`, or any other state path.

**Two-step workaround (legacy pattern, still works):**

```json
"onPress": [
  { "action": "openModal", "params": { "id": "edit-modal" } }
]
```

The modal content reads `/ui/selectedRow/*` via `$state` separately. Pre-v0.1.0 specs that wrote this workaround for the prior eager-resolution bug continue to work.

**Implementation references:** `packages/core/src/renderer/engine.ts:167-186` (`resolvePropsWithContext`); `packages/core/src/renderer/prop-schemas.ts` (`table.lazyActionPaths`); `packages/core/src/renderer/lazy-paths.ts` (parser + matcher).

### 1.4 `$prop` cascade (Layer 3 custom elements)

**Contract:** Inside a custom-element render tree, `$prop` references are resolved eagerly at each cascade level with the consumer's supplied values. Nesting pushes a new prop context; the element's own `$prop` reads its merged props.

**Why eager:** custom-element composition requires the consumer's values (action chains, data, style tokens) to substitute into the render tree at expansion time. Lazy resolution would break Layer 3 propagation.

**Inner expressions:** `$state` / `$template` inside a consumer-supplied `$prop` action chain stay lazy (resolved at dispatch). See reference-doc rule 239.

Implementation: `packages/core/src/expressions/handlers/prop.ts`.

### 1.5 `$template` interpolation

**Contract:** Resolved at the consumption site. `$template` in a prop value resolves at render; `$template` in an action param resolves at dispatch. Nested expressions (`$state`, `$auth`, `$math`) inside the template resolve with the template's execution context.

**Examples:**

```json
{ "props": { "src": { "$template": "/avatars/${ /auth/user/id }.png" } } }
```

Resolves at render with current `/auth/user/id`.

```json
{ "action": "fetch", "params": { "url": { "$template": "/api/items/${ /ui/selectedId }" } } }
```

Resolves at dispatch with current `/ui/selectedId`.

Implementation: `packages/core/src/expressions/handlers/template.ts`.

### 1.6 Transaction phase timing

**Contract:** Transaction bindings fire their phases at distinct moments:

- **`before`** — eager at dispatch start. Side-effects that must NOT be rolled back (closeModal, navigate). Runs before any network call (reference-doc rule 13).
- **`optimistic`** — eager at dispatch. State changes applied synchronously; UI reflects the change immediately. Rolled back on `onError`.
- **`onSuccess`** — eager at network resolve. Response available in resolver context. UPDATE transactions typically omit `onSuccess` — the optimistic state is already correct; re-fetch causes visible flash (reference-doc rule 14).
- **`onError`** — eager at network reject. Optimistic state reverted via snapshot BEFORE this phase runs. Error available in resolver context. For `fetch` confirm HTTP failures, `/tx/error` preserves backend details after rollback when available: HTTP `status`, raw `data`, nested `error.code`, and the best message from nested `error.message`, `data.message`, or fallback error text.

**Internal phase (not consumer-visible):** a `snapshot` phase captures the state immediately before `optimistic`, enabling rollback. Consumers never invoke `snapshot` directly.

Implementation: `packages/core/src/actions/transaction-engine.ts`.

### 1.7 Form bindings (`$bindState`)

**Contract:** Two-way binding. At render, the input value is read from the state path (eager). On input change, the new value is written to the state path (event-time).

**Example:**

```json
{ "type": "input", "props": { "value": { "$bindState": "/form/username" } } }
```

The input reads `/form/username` at render and writes back on every change event. There is no "resolve at press" concept — the framework wires both directions at render.

Implementation: `packages/core/src/forms/engine.ts` + renderer integration in `packages/react/src/MythikRenderer.tsx`.

---

## 2. Framework-Reserved State Paths

Several state paths are written by the framework itself, not by consumer specs. Reading them works; writing them from a spec is usually a mistake — the framework overwrites, or state invariants break. This section documents the framework-managed paths, their write-owner, lifetime, and canonical read patterns.

### 2.1 `/ui/selectedRow` 🔴 BLOCKER #1

**Row context model**: a row interaction (column action OR direct `onRowClick`) writes the row data to `/ui/selectedRow` immediately before dispatching the action chain. Downstream actions and elements (modal content, detail panels) read fresh row context via `$state` or `$template` against `/ui/selectedRow/*`. Single-selection scope per screen — see multi-table caveat below.

**Write-owner:** `packages/react/src/runtime/row-dispatcher.ts` (the `createRowDispatcher` helper used by `MythikRenderer.tsx`'s table-specific wiring). When a user clicks a table column action OR triggers `onRowClick`, the helper writes the clicked row's data to `/ui/selectedRow` *immediately before* dispatching the action:

```ts
export function createRowDispatcher(
  store: StateStore,
  dispatchAction: (binding: EventBinding) => void,
  rowPath: string = RESERVED_PATHS.SELECTED_ROW,
): (binding: EventBinding | undefined, row?: Record<string, unknown>) => void {
  const dispatchWithContext = createContextDispatcher<Record<string, unknown>>(
    store,
    dispatchAction,
    rowPath,
  );

  return (binding, row) => {
    dispatchWithContext(binding, row || undefined);
  };
}
```

**Lifetime:** persists until the next row interaction dispatch (column action or direct `onRowClick`). No auto-clear on modal close, screen navigate, or tab switch. A stale `/ui/selectedRow` from a previous click is normal state.

**Scope:** singleton per screen. Two tables on the same screen share the path — the most recently clicked row wins. The framework does not namespace per-table today.

**Read patterns (canonical):**

In a downstream element (e.g., modal content opened by the action):

```json
{
  "type": "text",
  "props": {
    "content": { "$template": "Editing: ${ /ui/selectedRow/name }" }
  }
}
```

Or in the action's own params (column actions and onRowClick both resolve `$state` lazily at click time via the table's lazyActionPaths — see §1.3) or in a subsequent action's params (which run after the row write):

```json
{
  "action": "fetch",
  "params": {
    "url": { "$template": "/api/items/${ /ui/selectedRow/id }" }
  }
}
```

**Anti-pattern — `$row` does not exist:**

```json
{ "content": { "$row": "name" } }
```

There is no `$row` expression. `$item` exists for `repeat` contexts, but tables use a different iteration model and `$item` does not apply inside column cells. Use `/ui/selectedRow` for post-click row data.

**Multi-table caveat:** if your screen has two tables with row actions, both tables write to `/ui/selectedRow`. There is no per-table row path today. If multi-table row isolation is required, the framework would need a `selection.rowPath` config option (not in scope for v0.1).

See also §5.1 for the row-write-then-dispatch order and §1.3 for why action params can read the freshly written row lazily at press time.

### Spatial item context model

`spatial-map` writes the activated item context to `/ui/selectedSpatialItem` immediately before dispatching JSON `onItemPress` actions. The payload is domain-neutral: `kind`, `mode`, `itemId`, `zoneId`, `status`, `label`, `position`, `rotation`, `shape`, `metadata`, `item`, and optional `zone`.

`onItemPress` params resolve lazily at press time, so `$state: "/ui/selectedSpatialItem/itemId"` reads the item just pressed. `selectedItemPath` can override the default path when a screen needs isolated spatial maps.

### Spatial zone context model

`spatial-map` writes the activated/selected zone context to `/ui/selectedSpatialZone` immediately before dispatching JSON `onZonePress` actions. The payload is domain-neutral: `kind`, `mode`, `zoneId`, optional `label`, `position`, `rotation`, optional `transform`, optional `localBounds`, `shape`, `metadata`, and full `zone`.

`onZonePress` params resolve lazily at press time, so `$state: "/ui/selectedSpatialZone/zoneId"` reads the zone just pressed. `selectedZonePath` can override the default path for isolated editors. Programmatic function callbacks pass through and own selected visual state through `selectedZoneId` or direct store writes.

`onCanvasPress` writes canvas context before dispatching JSON actions. The default write path is `/ui/spatialCanvasPress`; set `canvasPressPath` to isolate a specific editor, for example `/ui/floorEditor/canvasPress`. The payload is domain-neutral: `kind: "canvas"`, `mode`, `point`, `viewBox`, optional `zoneId`, and optional `zone`. Use it for generic click-to-place flows: enter a consumer-owned placement mode, read `canvasPressPath/point`, build a pending item, append it to the consumer-owned items array, then select/draft it externally.

`onCanvasPress` can clear the selected item/zone and/or dispatch its action. `interactionPolicy.clearSelectionOnCanvasPress` controls clearing; dispatch does not depend on clearing. The primitive does not open drawers, modals, menus, or inspectors itself; compose those externally with actions and state.

### Spatial item edit changes

`spatial-map` writes edit-change context to `itemChangePath` before dispatching JSON `onItemChange`. The default path is `/ui/spatialItemChange`; use `itemChangePath` to isolate multiple maps.

Runtime-generated `changeType` values are `move`, `resize`, and `rotate`. JSON-composed editor flows may also write `update`, `create`, `duplicate`, or `delete` as consumer-owned lifecycle records.

The context is domain-neutral: `kind`, `changeType`, `itemId`, `previousItem`, `nextItem`, `previousPosition`, `position`, `delta`, optional `zoneId`, and optional `zone`. Resize contexts include `previousTransform`, `transform`, `previousLocalBounds`, and `localBounds`; rotate contexts include `previousRotation` and `rotation`; all runtime edits include complete `previousItem` and `nextItem`. Runtime contexts normalize transform values with the active edit policy, so `minScale`/`maxScale` in `editPolicy` are reflected in emitted metadata.

`onItemChange` is a lazy action path. `$state` expressions inside action params resolve after the change context is written. The JSON-first persistence pattern for runtime edits is `$array: "replace"` using `/ui/spatialItemChange/nextItem` or the configured custom path. Use plain `setState` for non-undoable persistence; wrap the same value in `editorCommit` when the edit should participate in undo/redo/dirty state.

### Spatial zone edit changes

`spatial-map` writes zone edit-change context to `zoneChangePath` before dispatching JSON `onZoneChange`. The default path is `/ui/spatialZoneChange`; use `zoneChangePath` to isolate multiple maps.

Runtime zone edits emit `changeType: "move"` or `changeType: "resize"`. The context is domain-neutral: `kind`, `changeType`, `zoneId`, `previousZone`, `nextZone`, `previousPosition`, `position`, `delta`, `previousTransform`, `transform`, `previousRotation`, `rotation`, `previousLocalBounds`, `localBounds`, and `zone`.

Runtime zone movement writes `nextZone.position`; runtime zone resize writes `nextZone.transform.scaleX/scaleY`; both preserve `nextZone.shape`. This keeps rect, circle, ellipse, polygon, and path zones on the same transform-layer model and leaves polygon/path point editing as a separate capability. Zone drag, zone resize handles, and keyboard zone edits use the same snap/guides resolver pattern as item editing. The zone movement snap anchor is the center of transformed derived zone bounds, or `position` when no bounds exist. `onZoneChange` is a lazy action path; persist with `$array: "replace"` using `/ui/spatialZoneChange/nextZone` or the configured custom path. Use plain `setState` for non-undoable persistence; wrap the same value in `editorCommit` when the edit should participate in undo/redo/dirty state.

### Editor session history

`editorSessions` is the generic runtime for JSON-first editing surfaces that need undo, redo, discard, validation, and dirty state. Declare it at the spec root and track only durable document paths:

```json
"editorSessions": {
  "floor-layout": {
    "paths": ["/layout/items", "/layout/zones"],
    "maxHistory": 50,
    "persistence": {
      "url": "/api/floor-layout",
      "method": "PUT",
      "body": "trackedPaths"
    },
    "validators": [
      { "type": "arrayUniqueField", "path": "/layout/items", "field": "id" },
      { "type": "arrayUniqueField", "path": "/layout/zones", "field": "id" }
    ]
  }
}
```

The framework writes metadata to `/ui/editorSessions/<id>` and protects that subtree from consumer `setState`. Read `dirty`, `canUndo`, `canRedo`, `undoDepth`, `redoDepth`, `lastCommitLabel`, `status`, `saveStatus`, `saveError`, `lastSaveAttemptAt`, and `validation` for toolbars and save banners. Do not track `/ui/*` drafts, selected objects, modal flags, placement modes, or other transient editor state as document paths.

Use `editorCommit` for one atomic undoable edit. For spatial editors, keep using the primitive's lazy change contexts and wrap the same replacement value you would otherwise pass to `setState`:

```json
{
  "action": "editorCommit",
  "params": {
    "session": "floor-layout",
    "label": "Update item",
    "changes": [
      {
        "path": "/layout/items",
        "value": {
          "$array": "replace",
          "source": { "$state": "/layout/items" },
          "where": { "field": "id", "eq": { "$state": "/ui/spatialItemChange/itemId" } },
          "value": { "$state": "/ui/spatialItemChange/nextItem" }
        }
      }
    ]
  }
}
```

`editorUndo` and `editorRedo` restore tracked document paths and update `/ui/editorSessions/<id>` metadata. Consumer UI state is intentionally not part of the engine; clear or resync selected/draft paths in the same action chain when stale inspector state would be confusing. `editorDiscard` restores the last marked-saved snapshot and clears history. `editorCommit` with `validate: true` validates after applying the edit and does not roll back automatically; commit, undo, redo, and discard clear stale validation metadata unless validation is explicitly requested again.

For normal persistence, configure `editorSessions.<id>.persistence` once and dispatch `editorSave`:

```json
{
  "action": "editorSave",
  "params": {
    "session": "floor-layout"
  }
}
```

`editorSave` captures the current tracked-path snapshot, builds the payload from that snapshot, checks the resolved URL with the renderer's URL guard, persists through the host `fetcher`, and marks only that sent snapshot as saved after success. It does not dispatch the built-in `fetch` action internally and does not read `/ui/lastError`; that avoids races with data sources or unrelated fetches. It also does not re-run action middleware or rate limiting as a nested dispatcher call. If the user edits while the save is in flight, the saved snapshot is recorded but the current document remains dirty.

Default persistence is `method: "PUT"` and `body: "trackedPaths"`, which sends tracked paths as a nested object that preserves state shape, for example `{ "layout": { "items": [...], "zones": [...] } }`. Use `body: "snapshot"` for `{ "paths": { "/layout/items": [...] } }`, or a custom object body when the backend needs a specific envelope. Headers from the session config and per-call `editorSave` params are merged; per-call keys win.

Save payloads are editor documents, so `editorSave` does not deep-sanitize empty strings or nested values. Empty strings can be meaningful labels. If a backend needs domain-specific coercion, use a custom `body` expression or perform that coercion in the backend.

When `persistence.target` is set, the response JSON is written to that state path after a successful save. If the target lives inside a tracked path, the framework applies the same response value to the captured saved snapshot before marking clean, so server-returned metadata such as `/layout/savedAt` does not immediately make the editor dirty. Failed saves never mark clean; they leave `dirty: true`, set `status: "error"` when the document is still dirty, and expose `saveStatus`, `saveError`, and `lastSaveAttemptAt`. A later document edit clears stale save errors. Reserve `editorMarkSaved` for advanced/low-level integrations that have already completed persistence successfully outside `editorSave`.

### Editor session dirty navigation guard

Use `navigation.editorSessionGuard` in an `AppSpec` when app navigation must be blocked while one or more editor sessions are dirty:

```json
{
  "navigation": {
    "type": "sidebar",
    "initialScreen": "floor-editor",
    "editorSessionGuard": {
      "enabled": true,
      "sessions": ["floor-layout"],
      "pendingPath": "/ui/navigationGuard/pending"
    }
  }
}
```

The AppEngine reads `/ui/editorSessions/<id>/dirty` at navigation time. If a guarded session is dirty, `navigateScreen` or `goBackScreen` does not change screens; instead the engine writes a pending object to `pendingPath` with `kind: "editor-session-dirty"`, the action (`"navigateScreen"` or `"goBackScreen"`), target screen/params when applicable, and `dirtySessions`.

The framework is headless here: render your own confirmation UI from the pending state. `navigationGuardCancel` clears the pending state. `navigationGuardSaveAndProceed` is the normal save-first action for persisted editor sessions: it calls the currently mounted `EditorSessionEngine.save({ session })` for each pending dirty session, then continues only if those sessions become clean. `navigationGuardProceed` is non-destructive and only continues after the pending sessions are already clean, so treat it as a low-level retry for advanced flows that saved elsewhere. `navigationGuardDiscardAndProceed` explicitly abandons unsaved tracked-path changes by delegating to the mounted `EditorSessionEngine.discard(sessionId)` for each pending dirty session, then continues.

In React hosts, `editorSave` needs a fetch transport. Auth-enabled `MythikApp` instances use the framework fetch produced by auth interceptors. Non-auth apps can pass `fetcher` directly to `MythikApp`; `editorSave` and `navigationGuardSaveAndProceed` use that function instead of the global `/ui/lastError`-based fetch action.

`blockNavigation`, `blockGoBack`, and `blockBrowserUnload` default to blocking when the guard is enabled. Browser unload uses the native browser prompt and cannot display custom text. Custom `pendingPath` values must be concrete, consumer-owned `/ui/<segment>` paths and must not collide with reserved framework paths such as `/ui/editorSessions/*`, `/ui/spatialItemChange`, or `/ui/selectedRow`.

### 2.2 `/ui/device/*`

The framework auto-tracks device context and writes to `/ui/device/*`:

- `/ui/device/viewportWidth`, `/ui/device/viewportHeight` — updated on resize
- `/ui/device/platform` — `"web"` | `"ios"` | `"android"`
- `/ui/device/orientation` — `"portrait"` | `"landscape"` (updated on orientation change)
- `/ui/device/colorScheme` — `"light"` | `"dark"` (OS color scheme)

**Read pattern:** prefer the dedicated expressions `$breakpoint` (for responsive values), `$platform` (for cross-platform branching) over direct state reads. These expressions abstract over the paths and handle default fallbacks (reference-doc rule 37).

**Write-owner:** device context hook (React-side). Not configurable by consumer specs.

Implementation: `packages/core/src/device/context.ts` (interface), React-side provider writes values.

### 2.3 `/ui/modals/{id}` and `/ui/drawers/{id}`

**Write-owner:** framework. When an `openModal` action fires, the engine writes `true` to `/ui/modals/<id>`; `closeModal` writes `false`. Same pattern for drawers at `/ui/drawers/<id>`.

**Read-owner:** framework. The renderer reads the path to determine modal/drawer visibility.

**Consumer contract:** do NOT set `visible` prop on modals or drawers — the engine manages visibility via `/ui/modals/{id}` automatically (reference-doc rule 10).

Implementation: `packages/core/src/actions/dispatcher.ts:103-116` (openModal/closeModal/openDrawer/closeDrawer handlers) + renderer modal wiring.

### 2.4 `/ui/loading`, `/ui/lastError`, and dataSources loading/error paths

**`/ui/loading`** — `fetch` action writes `true` at request start, `false` at resolve. Shared across fetch actions; for fine-grained tracking, use per-target state writes in your own action chains.

**`/ui/lastError`** — `fetch` action writes the error message on failure, cleared on next successful fetch.

**dataSources auto-managed paths (post-Item-E wire):**
- `/{target}Loading` — `true` during in-flight request, `false` after resolve/reject
- `/{target}Error` — error message on failure, `null` on success

For a dataSource with `target: "/rooms"`, the framework writes `/roomsLoading` + `/roomsError` automatically.

Implementation: `packages/core/src/data/data-sources.ts:76-86` (loadingPath / errorPath derivation + write on fetch start).

### 2.5 `/login/*`

**Write-owner:** consumer specs via `$bindState: "/login/username"`, `"/login/password"` on input elements. Auto-cleared on logout action (reference-doc rule 47) — credentials never persist after logout.

**Convention:** framework examples use `/login/username` + `/login/password`. The `login` action accepts these via `$state`:

```json
{
  "action": "login",
  "params": {
    "username": { "$state": "/login/username" },
    "password": { "$state": "/login/password" }
  }
}
```

For email-convention apps, use `loginBody` template to map email → username at the spec level — see §3.2.

### 2.6 Forms state paths (`<formId>.*`)

When a form is declared in `spec.forms`, the framework reserves the `<formId>.*` subtree in state for form field values, validation state, and form-level flags. Internal keys like `__valid`, `__touched`, `__errors` are framework-owned.

**Read patterns:** use `$formValid` and `$formField` expressions instead of direct state reads — they abstract over the internal flag paths and future-proof against framework changes.

Implementation: `packages/core/src/forms/engine.ts`.

### 2.7 Upload state paths

The `upload` action reserves per-upload state paths for upload lifecycle state (active upload ID, progress, error, result). The exact path layout lives alongside the upload action handler.

**Write-owner:** framework. Do not write these from consumer specs.

Implementation: `packages/core/src/actions/dispatcher.ts` (upload action handler — search for `upload` in the dispatcher's action map).

### 2.8 Render errors and `security.exposeErrors`

There are two render-error surfaces:

- **Renderer `_error` nodes** — emitted by the render engine for spec/resolution failures. When `security.exposeErrors !== false`, `MythikRenderer` renders the `_error` placeholder and writes diagnostics to `/ui/renderErrors`.
- **Thrown primitive/component exceptions** — caught by `MythikRenderer`'s render error boundary. In development with `exposeErrors !== false`, the boundary shows a visible overlay with the error message and component stack. In production or with `exposeErrors: false`, it renders a neutral placeholder without details.

The boundary resets when the `spec` prop changes. A corrected spec can recover from a previous thrown render exception without remounting the host app.

Host setup:

```ts
const svc = createMythik({ security: { exposeErrors: false } });
```

Spec authors do not configure this in JSON specs; it is a host/runtime security setting.

---

## 3. Server API Contracts

The Mythik server (ApiSpec-driven) exposes a set of conventions for request/response shapes, auto-generated routes, and security invariants. This section documents the contracts so consumer specs + AI can compose correctly without reverse-engineering `server.ts`.

### 3.1 CRUD — one endpoint, three routes 🔴 BLOCKER #3

**Contract:** a single endpoint declaration with `crud: { table, primaryKey, insertable, updatable }` generates **three** routes automatically:

- `POST <path>` — insert a new row (body filtered to `insertable` fields)
- `PUT <path>/:id` — update a row (body filtered to `updatable` fields, `:id` matches `primaryKey`)
- `DELETE <path>/:id` — delete a row (by primary key)

**Canonical declaration:**

```json
{
  "endpoints": {
    "rooms": {
      "path": "/api/rooms",
      "crud": {
        "table": "Rooms",
        "primaryKey": "id",
        "insertable": ["name", "capacity", "location"],
        "updatable": ["name", "capacity", "location"]
      },
      "audit": {
        "createdBy": "createdByUser",
        "createdAt": "createdAt",
        "updatedBy": "updatedByUser",
        "updatedAt": "updatedAt"
      }
    }
  }
}
```

This ONE endpoint produces three Express routes. Do NOT declare three endpoints.

**Anti-pattern (collides):**

```json
{
  "endpoints": {
    "room-create": { "path": "/api/rooms", "method": "POST", "crud": { ... } },
    "room-update": { "path": "/api/rooms/:id", "method": "PUT", "crud": { ... } },
    "room-delete": { "path": "/api/rooms/:id", "method": "DELETE", "crud": { ... } }
  }
}
```

Each endpoint's `crud:{}` is processed independently. `room-update` at `/api/rooms/:id` + auto-append `/:id` → `PUT /api/rooms/:id/:id` (broken). Every CRUD endpoint also registers the POST route at `<path>` — collisions compound. Consumer-facing symptom: routes clash in Express; requests return 404 or match the wrong handler.

**`filterFields` behavior:** fields in the request body NOT listed in `insertable` (for POST) or `updatable` (for PUT) are silently dropped. This is a security feature — clients cannot inject arbitrary columns (e.g., `isAdmin: true`). Audit fields should NOT appear in `insertable`/`updatable` — the framework writes them post-filter (see audit below).

**Audit config — un-spoofable fields:** when `endpoint.audit` is configured, the server writes the JWT-derived user + timestamp to the audit columns on INSERT/UPDATE. These fields bypass `filterFields` (framework writes them after filtering). Clients cannot forge `createdBy` / `updatedBy` / `createdAt` / `updatedAt`. This is CV4 in the 2026-04 experiment validations — confirmed secure-by-design.

Implementation: `packages/server/src/server.ts:549-686` (the `if (endpoint.crud)` block — POST at 585, PUT at 640, DELETE at 685, audit field injection at 568-571 and 593-596).

### 3.2 `/api/auth/login` body contract

**Expected request body:** `{ "username": string, "password": string }` — **not `email`**.

**Response on missing fields:** HTTP 400 with:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "username and password are required" } }
```

**Response on success:** JWT + refresh token shape (exact fields depend on provider config; check your `auth.provider` response shape).

**Why `username` and not `email`:** the framework supports non-email username auth (many internal apps use employee ID, LDAP username, etc.). Consumer specs with email convention should use `loginBody` template to map at the spec level:

```json
{
  "auth": {
    "loginBody": {
      "username": { "$state": "/login/email" },
      "password": { "$state": "/login/password" }
    }
  }
}
```

The `loginBody` template is resolved at login dispatch — consumer's email field value becomes the server's `username` field value. Server sees `{ username: <email-string>, password: <pw> }` and validates against the users table's `usernameColumn` (which can be an email column).

Implementation: `packages/server/src/server.ts:104-116`.

### 3.3 Query endpoint response envelope

**Contract:** all query endpoints (type `query` in ApiSpec) return responses in this envelope shape:

```json
{
  "data": [ /* row objects */ ],
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "totals": { "total_amount": 1250.50 }
}
```

- `data` — always present, always an array (may be empty)
- `total`, `page`, `pageSize` — present when the endpoint has pagination config
- `totals` — present when the endpoint has totals config (SUM/AVG aggregates)

**Consumer contract:** the envelope is NOT auto-unwrapped. Specs reading the response must target `response.data`:

```json
{
  "action": "fetch",
  "params": {
    "url": "/api/rooms/query",
    "target": "/rooms"
  }
}
```

Setting `target: "/rooms"` writes the entire envelope to `/rooms`. Consumer reads via `$state: "/rooms/data"` at consumption sites.

If you only want the data array in state, use a two-step action chain: first `fetch` with no `target` (captures in transient), second `setState` writing `response.data` to your desired path.

Implementation: `packages/server/src/server.ts:497-511` (envelope construction: `data` at 497, optional `total`/`page`/`pageSize` at 499-504, optional `totals` at 506-509).

### 3.4 `scopeFilter` + `bypassRoles`

**`scopeFilter`:** a SQL WHERE clause template injected server-side on query + update + delete operations, resolved against JWT claims. Prevents cross-tenant row access.

**Example** (conceptual):

```json
{
  "endpoints": {
    "rooms": {
      "scopeFilter": "tenant_id = :jwt.tenant_id",
      "bypassRoles": ["admin"]
    }
  }
}
```

For role `admin`, the filter is NOT applied (admin sees all rows). Any other role sees only rows matching their JWT's `tenant_id` claim.

**Security invariant:** `scopeFilter` applies to UPDATE and DELETE, not just SELECT. A user cannot update or delete rows outside their scope — the filter is appended to the WHERE clause of those queries. Combined with audit fields (§3.1), this gives a defense-in-depth posture for multi-tenant apps.

For query endpoints with `pagination: "offset"`, framework-generated totals are scoped before aggregation: Mythik wraps the original query with the scope filter first, then performs `COUNT(*)` over that scoped source. This keeps `total` aligned with the rows the user is allowed to see. Custom `endpoint.count` SQL is an advanced escape hatch. When custom count SQL is used with `scopeFilter`, it must include a scope macro: `{{scopeWhere[:alias]}}` if the count has no `WHERE`, or `{{scopeAnd[:alias]}}` if it already has one. Mythik expands the macro to the correct predicate and removes it for bypass roles. Mythik does not otherwise rewrite custom count SQL; use `:alias` for JOIN/subquery counts so the generated scope predicate is qualified.

Implementation: `packages/server/src/server.ts` (search `buildScopeWhereClause` for all scope-filter call sites).

---

## 4. Matcher Semantics

### 4.1 `authDomains` — hostname-only 🟢 BLOCKER #5

**Contract:** auth headers (Bearer tokens) are auto-injected on fetch/submitForm requests when the URL's hostname matches any entry in `authDomains`. Port is stripped; only the hostname is compared.

**Matching rules:**

| `authDomains` entry | Matches | Does NOT match |
|---|---|---|
| `"api.example.com"` | `https://api.example.com/...` (any port) | `https://notapi.example.com`, `https://example.com` |
| `"example.com"` | `https://example.com`, `https://api.example.com`, `https://foo.example.com` (exact + subdomain) | `https://notexample.com` |
| `"localhost"` | `http://localhost:5173/...`, `http://localhost:3010/...`, `http://localhost/...` | `http://127.0.0.1` |
| `"localhost:5173"` | nothing (port is stripped from the URL side, but the domain entry literally contains `:5173` which is never the hostname of any URL) | everything |

**Mechanism:** `new URL(fetchUrl).hostname` comparison. Port stripping is a side-effect of the URL API — `.hostname` excludes the port. Subdomain matching: an entry `"example.com"` matches any URL whose hostname ends with `.example.com` (note the leading dot in the comparison — prevents `"api.com"` from matching `"notapi.com"`).

**Dev-mode guidance:** configure `authDomains: ["localhost"]` (no port). Tokens inject on any localhost port during dev.

**URL scheme filter:** only `http://` and `https://` URLs are considered. Relative paths (`/api/rooms`), `file:`, `data:`, and other schemes return `false` before matching — auth headers are not injected on those requests.

Implementation: `packages/core/src/fetch/interceptors/auth.ts:17-28`.

### 4.2 Contract URL template matching

When ApiSpec endpoints declare URL templates (e.g., `/api/items/:id`), the Contract subsystem matches incoming requests against the templates and extracts params. The same expression engine resolves `$state`, `$template`, `$auth` used elsewhere in the framework.

**Contract:** template resolution uses the same pipeline as fetch action params. Path params, query params, and body expressions all go through the resolver — no special "contract-only" expression evaluation rules.

Implementation: `packages/core/src/contract/matcher.ts` (matching) + `packages/core/src/contract/extractor.ts` (param extraction) + `packages/core/src/contract/engine.ts` (orchestration).

---

## 5. Store Coordination Patterns

The framework coordinates state writes across the store, expression resolver, action dispatcher, and persistence layer in specific orders. Understanding these orders closes the gap between "my action fired" and "my state reads the data I expected".

### 5.1 `dispatchAction` — row-write-then-dispatch

**Contract:** when a user triggers a row interaction (column action OR direct `onRowClick`), the framework:

1. Writes the clicked row object to `/ui/selectedRow` via the `createRowDispatcher` helper at `packages/react/src/runtime/row-dispatcher.ts`. Triggered by column actions AND direct `onRowClick`.
2. Dispatches the action chain (with `$state` / `$template` params resolved lazily at click time via `lazyActionPaths` — see §1.3)

The order is fixed in the `createRowDispatcher` helper (used by `MythikRenderer`'s table-specific wiring):

```ts
const dispatchWithContext = createContextDispatcher<Record<string, unknown>>(
  store,
  dispatchAction,
  RESERVED_PATHS.SELECTED_ROW,
);

return (binding, row) => {
  dispatchWithContext(binding, row || undefined);
};
```

**Implication:** any `$state: "/ui/selectedRow/..."` read that fires AFTER this function returns (subsequent actions in the chain, modal content rendered in response, etc.) sees the fresh row. The action's own params also resolve lazily at click time (via `lazyActionPaths` — see §1.3), so `$state: "/ui/selectedRow/..."` in `onPress` / `onRowClick` params correctly reads the freshly-written row.

**Consumer consequences — patterns that work cleanly:**

- Open a modal on row click → modal content reads `/ui/selectedRow` at render → fresh row
- Fire a second action AFTER `openModal` in the same onPress chain → reads fresh row
- Template interpolation inside the modal (`$template` with `/ui/selectedRow/*`) → fresh row

**Patterns that break:**

- Multiple parallel tables writing to `/ui/selectedRow` and expecting isolation (last write wins)
- Any code path that writes to `/ui/selectedRow` directly (framework reserved — see rule 241)

### 5.2 `dataSources` lifecycle

**Status marker:** ✅ SHIPPED v0.1.0 Item E. Wired via internal `mountSpecRuntime` helper called from `MythikRenderer` (web + RN) per spec mount. See §9 for full lifecycle ordering and re-mount safety.

**Contract:**

- **Mount:** at spec mount, the framework instantiates a DataSourcesEngine with the spec's `dataSources` config + state store + resolver
- **Dependency tracking:** the engine runs `scanDeps` on each dataSource's `url`, `params`, `headers` to extract referenced state paths. These become the dataSource's deps
- **Auto re-fetch:** when the store fires a write to any declared dep, the engine re-fetches the dataSource (debounced to coalesce rapid writes when `debounce` is configured)
- **`emptyWhileLoading`:** when `true`, the target state path is cleared to `null` at fetch start. When `false` (default), the old data stays visible during the fetch
- **Manual refresh:** the `refreshDataSource` action forces a re-fetch by dataSource id:
  ```json
  { "action": "refreshDataSource", "params": { "id": "rooms" } }
  ```
- **Loading/error paths:** `/{target}Loading` + `/{target}Error` are auto-managed (see §2.4)
- **`trigger: "auto"` vs `"manual"`:** auto-reactive by default; `manual` skips auto re-fetch (only `refreshDataSource` action triggers)

**Example declaration:**

```json
{
  "dataSources": {
    "rooms": {
      "url": "/api/rooms/query",
      "params": { "filter": { "$state": "/filters/status" } },
      "target": "/rooms",
      "emptyWhileLoading": false,
      "trigger": "auto",
      "debounce": 300
    }
  }
}
```

On any write to `/filters/status`, the engine re-fetches (300ms debounce) and writes the response envelope (§3.3) to `/rooms`. Consumer reads the list via `$state: "/rooms/data"`.

Implementation: `packages/core/src/data/data-sources.ts` (engine factory, `scanDeps` invocation, `refreshDataSource` action definition).

### 5.3 `derive` evaluation order

**Status marker:** ✅ SHIPPED v0.1.0 Item E. Wired via internal `mountSpecRuntime` helper. See §9 for re-entrant safety, error degradation, and state protection details.

**Contract:**

- **Mount:** the framework builds a dependency graph from `spec.derive` entries, runs topological sort (`packages/core/src/derive/evaluator.ts:26`), throws `Circular dependency detected in derive` if cyclic
- **Dirty tracking:** on every state write, only the subset of derive nodes transitively depending on the changed path re-evaluate
- **`protectedPaths`:** the state guard blocks actions from writing directly to paths owned by a derive. Actions that `setState` on a protected path are rejected (the state guard returns the write path to the caller via `getProtectedPaths`)
- **Order vs `initialActions`:** derive evaluates synchronously at mount (in topological order, before `initialActions` async IIFE runs). `initialActions` writes state independently; the derive engine subscribes to the store and recomputes reactively when those writes land. No ordering coordination needed — engines self-sufficient. dataSources with URL templates depending on `initialActions` output use skip-on-undefined-URL-deps (§9) to defer the initial fetch until deps resolve

**Example declaration:**

```json
{
  "derive": {
    "/stats/activeCount": {
      "$array": "count",
      "source": { "$state": "/items" },
      "where": { "$eq": [{ "$item": "status" }, "active"] }
    }
  }
}
```

`/stats/activeCount` is read-only from consumer specs (attempts to `setState` on it are blocked). Writes to `/items` trigger re-evaluation.

Implementation: `packages/core/src/derive/evaluator.ts` (`topologicalSort` at line 26, cycle detection at line 37-39, `getProtectedPaths` at line 19 + 116).

### 5.4 SpecStore layering — `save` vs `saveVersion` vs CLI patch

The persistence layer has distinct paths used at different levels. Understanding the layering prevents bypassing validation and keeps spec writes inside the validated CLI / engine path.

- **`store.save(id, doc)`** - low-level persistence primitive. Accepts `doc: unknown`. No validation. Called by validated orchestration after checks succeed. **Never called from application code** - treat as `@internal`. Calling `store.save()` from your app bypasses validation and produces silently-broken specs.
- **`store.saveVersion(id, doc, meta)`** - versioned write. Writes a row to `screen_versions` table and updates the current spec. Enables diff/rollback/promote/bisect.
- **`SpecEngine.patch(id, patches)`** - validated orchestration. Applies RFC-6902 patches, runs DocumentHandler validation, short-circuits on error, and persists the patched document through `store.save`.
- **CLI/API `mythik push` / `runPush`** - validates and handles `--author` / `author` by writing through `saveVersion` when the resolved store is versioned.
- **CLI/API `mythik patch` / `runPatch`** - uses `SpecEngine.patch` for patch application + validation. Without `author`, it persists through the normal `store.save` path. With a versioned store + `author`, it captures the patched document and writes once through `saveVersion`, so lazy bootstrap preserves the pre-patch current spec as v1 and the patch becomes the next version. JSON/TOON success output includes `versioned: boolean` and `version?: number`.

**Consumer rule (to be enforced by Item I linter):** never call `store.save()` from application code. Use:

- `mythik push <id>` / `mythik patch <id>` for interactive/shell work
- `runPush` / `runPatch` from `mythik-cli/api` for programmatic work (Item F exposes these as public exports)

Implementation:

- `packages/core/src/spec-engine/types.ts:8-13` (SpecStore interface — `save`, `load`, `list`, `delete`)
- `packages/core/src/spec-engine/engine.ts` (patch validate and base persist flow)
- `packages/cli/src/commands/push.ts` (CLI push versioning path)
- `packages/cli/src/commands/patch.ts` (CLI patch versioning path)

**Implementation location per store type** (as of v0.1.0):

- Browser-safe stores (`MemorySpecStore`, `SupabaseSpecStore`, `MemoryVersionedSpecStore`, `SupabaseVersionedSpecStore`, `MemoryEnvironmentStore`, `SupabaseEnvironmentStore`) — import from `mythik` (main entry).
- Node-only stores (`FileSpecStore`, `SqlServerSpecStore`, `SqlServerVersionedSpecStore`, `SqlServerEnvironmentStore`) — import from `mythik/server`.

The `SpecStore` interface contract (signature, behavior, save-vs-validate layering) is identical across entries. Only the import path changes.

### 5.5 Transaction rollback mechanics

**Contract:** at dispatch start, the transaction engine captures a store snapshot via `store.getSnapshot()` immediately before the `optimistic` phase runs. If the network call rejects (`onError`), the snapshot is restored before `onError` actions execute.

**Phase rollback semantics:**

| Phase | Rolled back on error? | Runs if network fails? |
|---|---|---|
| `before` | **No** — side-effects persist (closeModal, navigate) | Yes — runs first, before any network |
| `optimistic` | **Yes** — state snapshot restored | Yes — applied, then potentially reverted |
| `onSuccess` | No — only runs if network succeeded | No — skipped on network failure |
| `onError` | No — runs AFTER rollback | Yes — sees restored state |

**Implications:**

- Do NOT put data mutations in `before` — they persist through rollback
- Do NOT put navigation in `optimistic` — rollback does not un-navigate
- `onError` sees the pre-optimistic state (rollback has already happened by the time onError runs)

Implementation: `packages/core/src/actions/transaction-engine.ts` (phases: `before` at line 47-50, snapshot at 52-53, `optimistic` at 55-58, `onSuccess` at 79-81, `onError` at 94-99).

---

## 6. Workflow Paradigms

The framework supports two axes of workflow choice: **how you modify specs** (push vs patch) and **how you track history** (git vs DB versioning). Each axis has independent trade-offs; most teams pick one paradigm per axis and commit to it.

### 6.1 Push vs patch — file-first vs DB-first

**Push paradigm:**

- Specs live in git under `specs/*.json`
- Modify locally, run `mythik push <id>`, CLI sends the full spec doc to the DB
- Diff-reviewable in CI (normal git diff on the JSON file)
- Full-spec bandwidth cost per write

**Patch paradigm:**

- Specs live in the DB; local files are optional (working copy)
- Modify via `mythik patch <id> --from-file patch.json` for shell-safe surgical writes
- ~11x token efficiency vs full push (framework-internal measurement for typical single-element edits)
- Requires `mythik pull <id>` to sync any local `specs/*.json` snapshot after a DB patch

**Decision table:**

| Use case | Recommended paradigm | Rationale |
|---|---|---|
| Specs committed to git, CI gating | Push | Git log is the source of truth |
| Single-spec surgical edit | Patch | Token efficiency |
| Runtime admin UI editing specs | Patch (DB-first) | DB IS the source of truth |
| Multi-environment deploy (dev→staging→prod) | Push + DB versioning (§6.2) | Git for dev, versioned promote for env move |
| Large refactor across many specs | Push | Bulk easier; patch chains get fragile |

**Mixing warning:** do not `patch` and later `push` from stale `specs/*.json`. In DB-first workflows, the DB is source of truth; local files are bootstrap/snapshots only until refreshed from `mythik pull <id>`. Current CLI pull exports to stdout, so write that output back with a UTF-8-safe shell/CI step before committing local specs.

**Input note:** `mythik patch --from-file <path>` is the preferred cross-shell path. `--from-file <path>` wins over ambient non-TTY stdin; use `--from-file -` or pipe without `--from-file` when stdin is intentional.

### 6.2 Git-backed vs DB-versioned history

**Git-backed history:**

- Specs in repo, `git log` + `git blame` serve as audit trail
- No `--author` flag needed on push/patch
- CLI writes via `store.save` (unversioned path, see §5.4)
- Best for: single-env apps, dev-loop iteration, specs-as-code

**DB-versioned history:**

- `--author` flag on push/patch activates `store.saveVersion` (see §5.4)
- Writes a row to `screen_versions` table (requires the declarative storage schema from `ai-context.md` Storage Setup)
- Enables: `mythik diff <id>`, `mythik rollback <id>`, `mythik promote <from>→<to>`, `mythik bisect`
- Audit trail queryable in SQL (who changed what, when)
- Best for: multi-environment deployments, runtime admin UI (admin edits bypass git), compliance requirements

**When to enable DB versioning:**

| Signal | Recommendation |
|---|---|
| Single dev env, specs in git | Skip. Git is enough. |
| Separate dev + staging + prod DBs | Enable. Use `mythik promote` for env moves. |
| Admin UI that edits specs at runtime | Enable. Git can't capture runtime edits. |
| Compliance (SOX, HIPAA, etc. asking "who changed screen X on date Y") | Enable. Native SQL audit query beats git log. |

**Storage note:** DB versioning requires the `screen_versions` and `screen_environments` tables. Mythik does not auto-create them; apply the declarative schema from `ai-context.md` Storage Setup in the consumer database before using versioned stores.

---

## 7. Common Scenarios

Each scenario: problem shape → root cause → canonical solution.

### 7.1 Reading row data in a column action

**Problem:** column action needs to read the clicked row's id (or any other field).

**Root:** §1.3 — column action params resolve lazily at press time; framework writes the clicked row to `/ui/selectedRow` before dispatch.

**Canonical solution:** read `/ui/selectedRow/*` directly via `$state` in the action's params.

```json
"onPress": [{
  "action": "openModal",
  "params": {
    "id": "edit-modal",
    "itemId": { "$state": "/ui/selectedRow/id" }
  }
}]
```

The `$state` resolves at click time against the just-written `/ui/selectedRow`.

**Alternative (two-step pattern, still valid):** open a modal first; the modal content reads `/ui/selectedRow` separately. Useful when the action chain is generic and the consumer reads row context downstream.

```json
"onPress": [
  { "action": "openModal", "params": { "id": "edit-modal" } }
]
```

### 7.2 Why my `$state` in action params used to resolve stale (pre-v0.1.0)

**Pre-v0.1.0 problem:** `{ action: "setState", params: { value: { "$state": "/some/path" } } }` inside a column action used the render-time value, not the click-time value. Bug F9 in the v49 audit.

**v0.1.0 fix:** column action params now resolve at press time via `lazyActionPaths` declaration on the table primitive (see §1.3).

**If your spec used the two-step workaround for this bug:** both the workaround and the direct `$state` pattern now work. Direct `$state` is canonical going forward; the workaround remains valid (no migration required).

**If your spec was hitting the bug without a workaround:** the bug is silently fixed. No code change required on your end.

### 7.3 My CRUD endpoint collides with itself

**Problem:** declared `room-create`, `room-update`, `room-delete` endpoints, each with `crud:{}`. Server logs show route collision or `:id/:id` double-append.

**Root:** §3.1 — each `crud:{}` declaration synthesizes three routes. Three endpoints → nine routes → collision.

**Solution:** ONE endpoint at `/api/rooms` with `crud: { insertable, updatable, table, primaryKey }`. Framework synthesizes `POST /api/rooms`, `PUT /api/rooms/:id`, `DELETE /api/rooms/:id`.

### 7.4 Auth works in prod but not dev with `localhost:5173`

**Problem:** `authDomains: ["localhost:5173"]` silently fails to inject auth headers.

**Root:** §4.1 — matcher uses `parsed.hostname` (strips port). Entry `"localhost:5173"` never matches any URL's hostname (which is just `"localhost"`).

**Solution:** `authDomains: ["localhost"]`. Matches all localhost ports (5173, 3010, etc.).

### 7.5 Wiring a reactive data source with a debounced filter

**Status:** post-Item-E only. Pre-Item-E, use `initialActions + fetch + setState` instead (see `ai-context.md` fetch/dataSources decision guide).

**Problem (post-Item-E):** want a rooms list that re-fetches when a status filter changes, debounced to avoid hammering the server.

**Root:** §5.2 — `dataSources` engine tracks deps via `scanDeps`, auto re-fetches on dep writes, supports `debounce`.

**Solution:**

```json
{
  "dataSources": {
    "rooms": {
      "url": "/api/rooms/query",
      "params": { "status": { "$state": "/filters/status" } },
      "target": "/rooms",
      "debounce": 300
    }
  }
}
```

Any write to `/filters/status` triggers re-fetch after 300ms idle. Read `/rooms/data` (envelope — §3.3) for the list.

### 7.6 Choosing push vs patch for my team's workflow

**Problem:** team unsure whether to commit specs to git (push flow) or edit directly in DB (patch flow).

**Root:** §6.1 — two valid paradigms with distinct trade-offs.

**Solution (decision tree):**

- Specs change via PR review? → **Push.**
- Specs change via admin UI at runtime? → **Patch** (DB is truth).
- Multiple environments with promote flow? → **Push to dev + DB versioning + `mythik promote` for env moves.**
- Single dev, fast iteration? → Either works; default to push (git is cheap).

### 7.7 Login form with email convention

**Problem:** app uses email as identifier; `/api/auth/login` expects `username`.

**Root:** §3.2 — server expects `{ username, password }` by design. Maps via `loginBody` template.

**Solution:**

```json
{
  "auth": {
    "loginBody": {
      "username": { "$state": "/login/email" },
      "password": { "$state": "/login/password" }
    }
  }
}
```

Login spec binds input to `/login/email`; `loginBody` maps it to `username` at dispatch. Server sees `{ username: <email>, password: <pw> }`, validates against users table.

---

## 8. Appendix

### 8.1 File path references by component

**Core renderer:**
- `packages/core/src/renderer/engine.ts:167-186` — `resolvePropsWithContext` (eager prop resolution)
- `packages/core/src/renderer/engine.ts:996-1049` — `element.on` lazy path + `$prop` special-case + repeat eager wrapping
- `packages/react/src/MythikRenderer.tsx:284-297` — table-specific wiring (createRowDispatcher invocation + onRowClick ActionBinding wrap)
- `packages/react/src/runtime/row-dispatcher.ts` — `createRowDispatcher` helper (row-write-then-dispatch implementation)

**Expression handlers:**
- `packages/core/src/expressions/handlers/prop.ts` — `$prop` cascade
- `packages/core/src/expressions/handlers/template.ts` — `$template`
- `packages/core/src/expressions/handlers/bind.ts` — `$item`, `$index`, `$bindItem`

**Actions + transactions:**
- `packages/core/src/actions/dispatcher.ts:103-116` — openModal / closeModal / openDrawer / closeDrawer handlers
- `packages/core/src/actions/transaction-engine.ts` — transaction phases

**Data + derive engines:**
- `packages/core/src/data/data-sources.ts` — dataSources engine (post-Item-E wire)
- `packages/core/src/derive/evaluator.ts` — derive engine (post-Item-E wire)

**Forms + device:**
- `packages/core/src/forms/engine.ts` — form bindings + reserved state paths
- `packages/core/src/device/context.ts` — DeviceContext interface

**Fetch + auth:**
- `packages/core/src/fetch/interceptors/auth.ts:17-28` — authDomains matcher

**Server:**
- `packages/server/src/server.ts:104-116` — `/api/auth/login` endpoint
- `packages/server/src/server.ts:497-511` — query envelope
- `packages/server/src/server.ts:549-686` — CRUD auto-routes (POST 585, PUT 640, DELETE 685, audit injection 568-571 + 593-596)
- `packages/server/src/server.ts:607-630` — scopeFilter in PUT
- `packages/server/src/server.ts:653-675` — scopeFilter in DELETE

**Spec engine + stores:**
- `packages/core/src/spec-engine/types.ts:8-13` — `SpecStore` interface
- `packages/core/src/spec-engine/engine.ts` (patch validate and base persist flow)
- `packages/cli/src/commands/push.ts` (CLI push versioning path)
- `packages/cli/src/commands/patch.ts` (CLI patch versioning path)

**Contract:**
- `packages/core/src/contract/matcher.ts` — URL template matcher
- `packages/core/src/contract/extractor.ts` — param extraction
- `packages/core/src/contract/engine.ts` — contract orchestration

### 8.2 Finding ID cross-index

| Finding ID | Section | Blocker # | Type |
|---|---|---|---|
| F3 | §4.1 | #5 | Matcher doc |
| F4 (canonical reads) | §2.1 | #1 | Reserved path |
| F4 (timing workaround) | §1.3 | #2 (timing) | Expression timing |
| F5 | §3.1 | #3 | Server contract |
| F9 | §1.3, §5.1 | #2 | Timing (runtime fix via Item D) |
| F10 | §5.2, §5.3 | #4 | Wiring — ✅ SHIPPED v0.1.0 Item E |
| F14 | §6.1 | — | Workflow paradigm |
| F15.c | §6.2 | — | Workflow paradigm |
| F17 | §3.2 | — | Server contract |
| F18 | §3.3 | — | Server contract |
| CV4 | §3.1 (audit fields un-spoofable) | — | Positive validation |

### 8.3 `reference-doc.md` rules added by this document

- Rule 241 — `/ui/selectedRow` is framework-reserved (§2.1)
- Rule 242 — Column action expressions resolve eagerly (current behavior) (§1.3)
- Rule 243 — CRUD endpoint generates 3 routes from 1 declaration (§3.1)
- Rule 244 — `/api/auth/login` expects `{ username, password }` (§3.2)
- Rule 245 — Query endpoints envelope responses in `{ data: [...] }` (§3.3)

## 9. `derive` and `dataSources` lifecycle (v0.1.0 — Item E)

**Mount/unmount scope**: per `MythikRenderer` instance via `useEffect` with deps `[spec, dispatcher, svc, fetcher]`. Spec change → unmount old runtime, mount new. Same spec reference → no remount.

**Internal mount order** (inside `mountSpecRuntime`):
1. `DeriveEngine.mount()` — sync evaluation in topological order; writes derive paths to store.
2. Subscribe `derive.onStateChange` to store — reactive recompute on state changes.
3. `protectionRegistry.contribute(derivePaths)` — derive paths now blocked from setState.
4. `dispatcher.registerAction(dataSources.getActionDefinition())` — `refreshDataSource` available.
5. `DataSourcesEngine.mount()` — initial fetches with skip-on-undefined-URL-deps.

**Renderer useEffect order**: state subscription useEffect is declared BEFORE `mountSpecRuntime` useEffect. React fires useEffects in declaration order, so the subscription is attached first; deriveEngine.mount()'s synchronous writes are then captured by that listener and trigger an initial-paint re-render. (Item E close-what-you-surface fix `9f3f94f`.)

**Skip-on-undefined-URL-deps**: if a dataSource's URL `$template` references state that's undefined/null/empty at mount time, the initial fetch is skipped and `/{target}Deferred: true` is set. The existing reactive subscription catches up when deps resolve. Makes engines self-sufficient — no coordination with initialActions needed.

**URL templating contract**: `DataSourceConfig.url` accepts a literal string OR an expression object (`{ $template: '/api/${/path}' }` or `{ $state: '/some/path' }`). Plain strings are returned LITERAL by the resolver — `${...}` in plain strings is NOT substituted. Validator (load-time) flags plain strings containing `${...}` as an error pointing to the `$template` form.

**Re-entrant safety**: derive recompute writes fire the store subscription, which calls `onStateChange` recursively. This is intentional (chained derives need to cascade — B depending on A's output sees A's write and recomputes). Infinite loops are prevented structurally: topo-sort at mount throws on circular deps; a derive's own write doesn't make itself dirty (its deps don't include its own path).

**Error degradation**: `DeriveEngine.evaluatePath` wraps each evaluation in try/catch. On error: `console.error` with the path name, leave path unwritten (consumer reads undefined), continue with other derives. Reactive recompute on subsequent state changes can recover.

**State protection**: derive paths are contributed via RAII handle to `protectionRegistry`; `stateGuard` reads via lazy callback. Validator catches `setState → derive path` at load (8 new derive/dataSources checks); dispatcher catches at runtime via `stateGuard.assertCanWrite`. Defense in depth.

**Re-mount safety (navigation)**: `dispatcher.registerAction` uses `Map.set` (silent overwrite). Re-mounting a spec with the same dataSources on the same dispatcher does not throw "action already registered". DataSourcesEngine's `refresh()` early-returns if the engine has been unmounted.
