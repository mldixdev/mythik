# Mythik — Composition Patterns

> Read when combining 2+ features in a single spec. Expression contexts, anti-patterns, and recipes.

## Expression Resolution Contexts

Where each expression can be used. **"no"** = documented trap (will fail or produce wrong results).

| Expression | props | visible | style | derive | repeat.source | $template | transaction |
|---|---|---|---|---|---|---|---|
| `$state` | yes | yes | yes | yes | yes | yes | yes |
| `$item` / `$index` | yes | yes | yes | — | yes | **no** | **no** |
| `$auth` | yes | yes | yes | — | — | **no** | — |
| `$cond` | yes | yes | yes | yes | yes | — | yes |
| `$and`/`$or`/`$not` | yes | yes | yes | yes | yes | — | yes |
| `$format` | yes | — | — | yes | — | — | — |
| `$array` | yes | yes | — | yes | yes | — | yes |
| `$math` | yes | — | — | yes | — | — | yes |
| `$template` | yes | — | — | — | — | — | yes |
| `$let`/`$in` | yes | yes | yes | yes | yes | — | yes |
| `$prop` | yes | yes | yes | — | — | — | — |
| `$i18n` | yes | — | — | — | — | — | — |
| `$breakpoint` | yes | yes | yes | — | — | — | — |
| `$platform` | yes | yes | yes | — | yes | — | — |
| `$computed` | yes | yes | yes | — | — | — | — |

**Key traps:**
- `$item` in `$template`: does NOT work. Capture in `$let` first: `{ "$let": { "x": { "$item": "name" } }, "$in": { "$template": "${x}" } }`
- `$item` in transaction: does NOT resolve. Capture row data via `setState` before the transaction fires
- `$auth` in derive: not available. Use `$state` to read from `/auth/*` paths that the auth engine populates

## Complete Recipes

> **Status:** Pending runtime validation. Recipes will be added after real-use testing
> in a dedicated session (render + interact + verify each feature works correctly).

**Planned recipes:**
1. CRUD with filters + derive (table, search, modals, transactions, loading/content/empty)
2. Fullstack API + Frontend (coherent API spec + frontend with matching dataSources)

### Identity-Aware Spec Pattern

When generating specs, always:
1. Set page layout bg to `{ "$token": "colors.background" }` (not white)
2. Use `surface="card"` on card-like boxes (stat cards, form cards, content panels)
3. Set `tokens.identity` for app personality — at minimum `surface` + `typographyHierarchy`
4. Use `$token` for all visual values — the identity system controls borders, shadows, radius through tokens
5. For colored-surface schemes, set `coloredSurfaceLayers` to control tonal separation (default 25/45/65)
6. Use `$token: "schemeColors.text"` for scheme-aware text in previews/themed content
7. Use `$token: "colorWeight.navBg"` for layout elements that respond to color weight

Identity values are linted deeply in AppSpec and screen Spec tokens. Use the documented enum values exactly: `colorScheme` is `"light-surface"`, `"dark-surface"`, or `"colored-surface"` (not `"light"` / `"dark"`); `radiusPattern`, `typographyHierarchy`, `colorWeight`, nested icon/image settings, and numeric identity ranges are validated before render.

```json
{
  "tokens": {
    "dna": { "primary": "#0D9488", "harmony": "analogous", "formality": 0.3 },
    "identity": { "surface": "outlined", "typographyHierarchy": "editorial", "labelStyle": "uppercase", "radiusPattern": "all" }
  },
  "root": "layout",
  "elements": {
    "layout": { "type": "box", "style": { "backgroundColor": { "$token": "colors.background" }, "minHeight": "100vh" }, "children": ["card"] },
    "card": { "type": "box", "props": { "surface": "card" }, "style": { "padding": 24 }, "children": ["title", "form"] },
    "title": { "type": "text", "props": { "content": "Settings", "variant": "heading" } }
  }
}
```

**Anti-patterns:**
- Card-like boxes WITHOUT `surface="card"` — they ignore identity surface treatment and look inconsistent
- Hardcoding text color instead of letting surface containers set `color: c.text` via CSS inheritance — child primitives use `color: 'inherit'` automatically

## Composition Anti-Patterns

### Action chains don't stop on failure

**Wrong:** Using `validateForm` to gate a submission chain — it marks errors but does NOT halt subsequent actions.
```json
"press": [
  { "action": "validateForm", "params": { "formId": "f" } },
  { "action": "fetch", "params": { "url": "/api/save", "method": "POST" } }
]
```
**Right:** Use `submitForm` with `formId` — validates, blocks if invalid, submits if valid:
```json
"press": { "action": "submitForm", "params": { "formId": "f", "url": "/api/save", "method": "POST", "body": {} } }
```

### Don't mix fetch and dataSources for the same target

`initialActions` fetch and `dataSources` write to different loading state paths (`/ui/loading` vs `/{target}Loading`). Using both for the same data creates conflicting state. Pick one pattern per data source.

### Derive only sees current page data

With server-side pagination, `derive` computes from whatever is in state (one page). Don't use derive for totals on server-paginated data — use the API's `totals` response instead.

### Transaction CRUD phase rules

- `closeModal` in `before` (instant UX feedback)
- Data mutation in `optimistic` (append/replace/remove)
- Server call in `confirm` (fetch with POST/PUT/DELETE)
- Re-fetch only in CREATE's `onSuccess` — NOT in UPDATE/DELETE (causes flash)

### "all" filter is not a wildcard

`$array: "filter"` with value `"all"` matches the literal string, not everything. Use `$cond` to bypass:
```json
{ "$cond": { "$state": "/filter", "eq": "all" }, "$then": { "$state": "/items" }, "$else": { "$array": "filter", "source": { "$state": "/items" }, "where": { "field": "status", "eq": { "$state": "/filter" } } } }
```

### requiredIf is truthy-only

Does NOT support `eq`. For conditional required based on value equality, use `derive` to compute a boolean, then `requiredIf` on that derived path.

**Cross-field conditional pattern end-to-end:**
```json
{
  "derive": {
    "/ui/isEngineering": { "$cond": { "$state": "/form/department", "eq": "Engineering" }, "$then": true, "$else": false }
  },
  "forms": {
    "employee-form": {
      "fields": {
        "salary": { "statePath": "/form/salary", "rules": [
          { "type": "required" },
          { "type": "requiredIf", "args": { "field": { "$state": "/ui/isEngineering" } }, "message": "Salary required for Engineering" },
          { "type": "greaterThan", "args": { "other": { "$state": "/form/minSalary" } }, "message": "Must exceed minimum" }
        ]}
      }
    }
  }
}
```

### Action chains commit state between steps

Each action in a sequential chain (`[action1, action2, action3]`) commits state before the next runs. `[setState, navigateScreen]` works — the navigated screen sees the state written by setState.

### submitForm in transaction.confirm is not recommended

`submitForm` is technically valid in any action context, but inside `transaction.confirm` it conflicts — submitForm includes its own validation gate and error handling, while the transaction engine handles rollback separately. Use `fetch` in confirm instead.

## Reusable Components — Templates + Variants

> Two underused reuse mechanisms already in the framework. **Use them before duplicating style blocks.**

### When to use `appSpec.templates`

Define an element template once, reference it by custom type name in any screen. Use for COMPOSITE reusable elements (button with specific style + animation + icon, card with header + content + footer, etc.).

**Defining a template (app-level):**
```json
{
  "templates": {
    "button-pulse-cta": {
      "type": "button",
      "defaults": { "variant": "primary" },
      "props": {
        "label": { "$prop": "label" }
      },
      "style": {
        "background": "linear-gradient(135deg, #6366f1, #8b5cf6)",
        "color": "#ffffff",
        "padding": { "$prop": "padding" },
        "borderRadius": 10
      },
      "animations": { "ambient": { "recipe": "pulse-primary" } },
      "children": ["$children"]
    }
  }
}
```

**Using in any screen:**
```json
{ "type": "button-pulse-cta", "props": { "label": "Sign Up", "padding": "10px 20px" } }
```

Parametrize via `$prop`. Use `$children` in template's `children` array to slot consumer's children.

### When to use `tokens.components.{type}.{variantName}`

Define a reusable style set for a PRIMITIVE (button, input, card) that merges into every element declaring `variant: "name"`. Use for STYLE-ONLY reuse (same type, different visual variant).

**Defining a variant:**
```json
{
  "tokens": {
    "components": {
      "button": {
        "ctaPulse": {
          "style": {
            "background": { "$token": "colors.primary" }
          },
          "animations": {
            "ambient": { "recipe": "pulse-primary" },
            "hover": { "recipe": "lift" },
            "active": { "recipe": "pop" }
          }
        }
      }
    }
  }
}
```

**Using in any spec:**
```json
{ "type": "button", "props": { "variant": "ctaPulse", "label": "..." } }
```

### Rule: don't duplicate style blocks across specs

If the same rich style object appears in 2+ specs (or 2+ places in same spec), extract to a template or variant. Duplication inflates DB storage, breaks DRY, makes updates O(N).

**Anti-pattern:**
```json
// screen-a.json
{ "type": "button", "style": { "background": "linear-gradient(...)", "animation": "pulse 2s ...", ...20 lines } }

// screen-b.json
{ "type": "button", "style": { "background": "linear-gradient(...)", "animation": "pulse 2s ...", ...20 lines } }
```

**Right:**
```json
// appSpec.templates once
{ "templates": { "button-pulse-cta": { ...full definition... } } }

// both screens
{ "type": "button-pulse-cta", "props": { "label": "..." } }
```

### Templates vs variants: which to choose

| Situation | Use |
|---|---|
| Same primitive type, different style set | `tokens.components.{type}.{variant}` |
| Composite (custom type wrapping primitive + children slot) | `appSpec.templates` |
| Style varies by state (hover/active/focus) | Variants (built-in state slots) |
| Parametrized via props + children | Templates (with `$prop` + `$children`) |

Templates are more flexible but more verbose. Variants are lightweight and integrate natively with primitive rendering. Prefer variants when you only vary style; use templates when you compose structure.

### Animations cascade across both mechanisms

`animations` declared at any of four levels merges via the cascade — identity → variant → template → element — with per-trigger null semantics. **Templates and variants are NOT animation islands**: the template's `animations: { ambient: pulse }` composes with identity's `animations: { mount: fade-up }` AND with an element's `animations: { hover: null }` override. Use the level that matches the SCOPE of the default:

- `tokens.identity.animations` — app-wide default (every element mounts with fade-up).
- `tokens.components.<type>.<variantName>.animations` — per-variant default for one primitive type.
- `spec.templates.<name>.animations` — per-template default (supports `$prop`/`$state`/`$cond`).
- `element.animations` — per-instance override.

Avoid repeating the same `animations: { mount: { recipe: 'fade-up' } }` on every element — declare it once in `identity.animations` and let the cascade propagate. Same for per-variant effects (declare in the variant definition, not on every consuming element). See the Animations section in [ai-context.md](ai-context.md#interactive-states--animations) for the full null-semantics decision table.
