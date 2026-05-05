---
id: concept-api-auth
title: API auth (`auth` block)
kind: concept
sources: [docs/consumer/ai-context-api.md#auth]
---

# API auth

`auth` block in ApiSpec defines the auth strategy, claims mapping,
provider, policies, and scope filter.

## Shape

```json
"auth": {
  "strategy": "jwt",
  "claims": { "username": "sub", "roles": "roles", "scope": "institutions" },
  "provider": {
    "usersTable": "Users",
    "usernameColumn": "username",
    "passwordColumn": "password",
    "passwordHash": "bcrypt",
    "activeCondition": "active = 1",
    "rolesQuery": "SELECT role AS val FROM UserRoles WHERE username = @username",
    "scopeQuery": "SELECT institution_id AS val FROM UserInstitutions WHERE username = @username"
  },
  "policies": {
    "items": { "roles": ["ADMIN", "EDITOR"] },
    "reports": { "roles": ["ADMIN", "VIEWER"] },
    "admin": { "roles": ["ADMIN"] }
  },
  "scopeFilter": {
    "claim": "institutions",
    "type": "int",
    "column": "institution_id",
    "bypassRoles": ["ADMIN"]
  }
}
```

## Components

| Component | Purpose |
|---|---|
| `claims` | Maps JWT claim names to your naming convention |
| `provider` | Database-backed login: user table, password hash, role/scope queries |
| `policies` | Named role lists referenced by endpoints via `policy` |
| `scopeFilter` | Row-level security — see [[@concept-api-scope-filter]] |

## Provider details

- `passwordHash`: `"bcrypt"` (default) or `"argon2"`.
- Provider queries use `@username` parameter.
- Scope queries return `val` column.

## Related concepts

- [[@concept-api-spec]]
- [[@concept-api-scope-filter]]
- [[@concept-api-login-body-contract]]
- [[@pattern-fullstack-coherence]] — alignment with AppSpec roleAccess
- [[@cli-contract]]

## Sources (raw)

- `docs/consumer/ai-context-api.md § Auth`
