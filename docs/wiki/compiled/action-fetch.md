---
id: action-fetch
title: `fetch` — HTTP request
kind: action
sources: [docs/consumer/ai-context.md#fetch-details, docs/consumer/reference-doc.md#fetch-action-details]
---

# `fetch` — HTTP request

HTTP request to an URL, writing the response to a target state path. The
default action for one-shot operations (`POST`/`PATCH`/`DELETE` in
transactions, `GET` in `initialActions`). For reactive GETs, prefer
[[@concept-data-sources]].

## Shape / Signature

```json
{ "action": "fetch", "params": {
  "url": "<string-or-$template>",
  "method"?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  "headers"?: <object-or-$state>,
  "body"?: <object-with-expressions>,
  "target"?: "/state/path"
}}
```

## Behavior

- Body expressions are deeply resolved before sending.
- **Empty strings in body → `null`** (prevents DB errors on typed columns).
- Sets `/ui/loading` to `true` while in flight; `false` when done.
- On error: writes `/ui/lastError` with status and message.
- **Auth headers auto-injected** for URLs whose hostname matches
  `auth.authDomains` — see [[@concept-auth-domains]].

## Examples

GET into state:
```json
{ "action": "fetch", "params": { "url": "/api/items", "target": "/items" } }
```

POST with body:
```json
{ "action": "fetch", "params": {
  "url": { "$template": "${/config/apiUrl}/rest/v1/tasks" },
  "method": "POST",
  "headers": { "$state": "/config/headers" },
  "body": {
    "title": { "$state": "/form/title" },
    "description": { "$state": "/form/description" }
  },
  "target": "/lastResult"
}}
```

PATCH inside a transaction confirm phase:
```json
"confirm": [{ "action": "fetch", "params": {
  "method": "PATCH",
  "url": { "$template": "/api/items?id=eq.${/form/editId}" },
  "headers": { "Prefer": "return=representation" },
  "body": { "name": { "$state": "/form/name" } },
  "target": "/tx/result"
}}]
```

## Constraints / Anti-patterns

- **Don't mix `fetch` and `dataSources` for the same data target.** They
  write to different loading-state paths. See
  [[@antipattern-mix-fetch-and-datasources]] + [[@pattern-fetch-vs-datasources]].
- **Plain strings with `${...}` are LITERAL** — wrap in `$template`.

## Related concepts

- [[@action-submit-form]] — fetch + validate + notify wrapper
- [[@concept-data-sources]] — reactive alternative
- [[@concept-fetch-interceptors]] — auth/logging/timeout/retry
- [[@path-ui-loading-error]] — auto-managed loading/error paths
- [[@concept-transactions]] — `confirm` phase
- [[@concept-fire-and-forget]] — background fetch

## Sources (raw)

- `docs/consumer/ai-context.md § Actions → fetch Details`
- `docs/consumer/reference-doc.md § fetch Action Details`
