---
id: antipattern-crud-id-collision
title: Anti-pattern — CRUD `:id` collision
kind: pattern
sources: [docs/consumer/ai-context-api.md#endpoints, docs/consumer/ai-context-runtime-semantics.md#31-crud--one-endpoint-three-routes--blocker-3, docs/consumer/reference-doc.md#rule-70]
---

# Anti-pattern — CRUD `:id` collision

`crud: {}` automatically generates `POST <path>`, `PUT <path>/:id`, and
`DELETE <path>/:id` from a single endpoint declaration. **Combining
`crud: {}` with `endpoint.path` ending `/:id` produces broken
`/path/:id/:id` routes.**

## Wrong

```json
"endpoints": {
  "room-create": { "path": "/api/rooms",     "method": "POST",   "crud": { } },
  "room-update": { "path": "/api/rooms/:id", "method": "PUT",    "crud": { } },
  "room-delete": { "path": "/api/rooms/:id", "method": "DELETE", "crud": { } }
}
```

Each `crud:{}` is processed independently:
- `room-update` at `/api/rooms/:id` + auto-append `/:id` → `PUT /api/rooms/:id/:id` (broken).
- Every CRUD endpoint also registers POST at `<path>` — collisions compound.
- Consumer-facing symptom: routes clash in Express; requests return 404 or match wrong handler.

## Right

ONE endpoint at the base path with `crud: {}`:

```json
"rooms": {
  "path": "/api/rooms",
  "policy": "admin",
  "crud": {
    "table": "Rooms",
    "primaryKey": "id",
    "insertable": ["name", "capacity", "location"],
    "updatable": ["name", "capacity", "location"]
  }
}
```

Framework synthesizes `POST /api/rooms`, `PUT /api/rooms/:id`,
`DELETE /api/rooms/:id` automatically.

## Detection

`mythik lint` rule **`spec-crud-id-collision`** (severity: **error**)
catches `endpoint.path` ending `/:id` combined with `crud: {}`. Also
runs during `mythik validate` and `mythik push`. See [[@cli-lint]].

## Related concepts

- [[@concept-api-crud-endpoint]]
- [[@concept-api-endpoints-overview]]
- [[@cli-lint]]

## Sources (raw)

- `docs/consumer/ai-context-api.md § Anti-pattern`
- `docs/consumer/ai-context-runtime-semantics.md § 3.1`
- `docs/consumer/reference-doc.md § rules 70, 249`
