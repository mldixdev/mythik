---
id: concept-role-access
title: Access control — `roleAccess` vs ScreenDefinition.roles
kind: concept
sources: [docs/consumer/ai-context.md#access-control, docs/consumer/reference-doc.md#access-control--roleaccess-vs-screen-roles]
---

# Access control

Two models exist for screen access. **Only one is active per app** —
they don't mix.

## Model 1 — `roleAccess` (recommended)

Defined in `navigation.auth.roleAccess`. **Sole source of truth** when
present — `ScreenDefinition.roles` is ignored.

```json
"roleAccess": {
  "admin": ["*"],
  "user": ["task-manager", "dashboard", "profile"],
  "viewer": ["dashboard"]
}
```

- Role with `["*"]` accesses every screen.
- Role NOT listed has **zero access** (denied everywhere).
- `loginScreen` is ALWAYS accessible — prevents redirect loops.

## Model 2 — `ScreenDefinition.roles` (backward compat)

Used when `roleAccess` is NOT defined.

```json
"screens": {
  "dashboard": { "label": "Dashboard", "roles": ["admin", "user", "viewer"] },
  "admin-panel": { "label": "Admin", "roles": ["admin"] }
}
```

- `roles: ["*"]` (default) means any role can access.

## Navigation behavior on denial

| User state | Behavior |
|---|---|
| **Unauthenticated** | Redirect to `loginScreen` |
| **Authenticated but unauthorized** (`/auth/isAuthenticated` true, role doesn't match) | Stay on current screen, set `/auth/error`, **no redirect to login** |

## Related concepts

- [[@concept-app-spec]]
- [[@concept-screen-definition]]
- [[@concept-auth-config]]
- [[@expression-auth]] — read role for visibility checks
- [[@cli-contract]] — cross-validates roleAccess vs API policies

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation → Access Control`
- `docs/consumer/reference-doc.md § Access Control`
