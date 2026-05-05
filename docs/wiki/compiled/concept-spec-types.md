---
id: concept-spec-types
title: Spec Types — Screen vs App vs Api
kind: concept
sources: [docs/consumer/ai-context.md#spec-structure, docs/consumer/ai-context.md#appspec--navigation, docs/consumer/ai-context-api.md#apispec-server, docs/consumer/reference-doc.md#app-spec--screen-outlet]
---

# Spec Types — Screen vs App vs Api

Mythik distinguishes three top-level document types. The framework picks the
right handler from the document's shape: **Screen specs** (no `type` field) are
single-screen UI; **AppSpecs** declare `type: "app"` for multi-screen apps with
sidebar/auth/shared state; **ApiSpecs** declare `type: "api"` for declarative
backend APIs. The CLI auto-detects which kind it's operating on.

## Shape / Signature

Screen spec — no `type`:
```json
{ "root": "...", "elements": { "...": "..." } }
```

AppSpec:
```json
{ "type": "app", "name": "...", "navigation": { ... }, "screens": { ... }, "layout": { ... } }
```

ApiSpec:
```json
{ "type": "api", "name": "...", "auth": { ... }, "catalogs": { ... }, "endpoints": { ... } }
```

## Per-type discrimination

| Field | Screen | App | Api |
|---|---|---|---|
| `type` | absent | `"app"` | `"api"` |
| Root layout | `root` + `elements` (top-level) | `layout.root` + `layout.elements` | n/a |
| Children of `screens`? | n/a | yes | n/a |
| Served to browser? | yes | yes (with auth filtering) | **never** (404) |
| CLI detection | auto | auto | auto |

## Examples

Inspecting different doctypes:
```bash
mythik manifest task-manager      # Screen — element tree
mythik manifest app-demo          # App — layout + screens + tokens
mythik manifest ejecucion-api     # Api — catalogs + endpoints + auth
```

## Constraints / Anti-patterns

- **Api specs are never served to the browser.** `GET /api/screens/:id` and
  `GET /api/app/:id` return 404 for documents with `type: "api"`. This
  prevents disclosure of table names, SQL queries, and auth config.
- **AppSpec patches use `/layout/elements/`**, not `/elements/`.
  Screen-spec elements live at `/elements/{id}`; AppSpec layout elements
  live at `/layout/elements/{id}`.
- Validation is per-doctype: AppSpec validates cross-references (screen
  existence, roleAccess consistency); ApiSpec validates endpoints/catalogs;
  Screen specs validate element trees + expressions.

## Related concepts

- [[@concept-spec-structure]] — Screen-spec details
- [[@concept-app-spec]] — AppSpec details
- [[@concept-api-spec]] — ApiSpec details
- [[@cli-app-spec]] — CLI commands for AppSpecs
- [[@concept-spec-engine]] — patch/validate/save flow

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation` + `§ ApiSpec`
- `docs/consumer/ai-context-api.md § ApiSpec (Server)`
- `docs/consumer/reference-doc.md § App Spec & Screen Outlet`
