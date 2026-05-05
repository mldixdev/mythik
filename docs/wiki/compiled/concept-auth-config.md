---
id: concept-auth-config
title: AppSpec auth config
kind: concept
sources: [docs/consumer/ai-context.md#auth-config, docs/consumer/reference-doc.md#authentication]
---

# AppSpec auth config

Auth configuration lives at `navigation.auth` in AppSpec.

## Shape / Signature

```json
"navigation": {
  "auth": {
    "provider": "supabase",
    "loginScreen": "login",
    "protectedScreens": ["*"],
    "roleAccess": { "admin": ["*"], "user": ["dashboard", "profile"] },
    "persistence": "local",
    "tokenRefresh": true,
    "authDomains": ["myproject.supabase.co"],
    "sessionExpiredMessage": "Session expired, please sign in again",
    "loginBody": { "username": { "$state": "/login/email" }, "password": { "$state": "/login/password" } },
    "interceptors": { "logging": true, "timeout": { "ms": 15000 } }
  }
}
```

## Properties

| Property | Description |
|---|---|
| `provider` | Auth provider key (`"supabase"`, `"jwt"`, etc.) |
| `loginScreen` | Screen ID for login |
| `protectedScreens` | Array of screen IDs requiring auth (`["*"]` = all) |
| `roleAccess` | Centralized access map (preferred) - see [[@concept-role-access]] |
| `persistence` | `"local"`, `"session"`, `"memory"` - see [[@concept-session-persistence]] |
| `tokenRefresh` | Enable proactive token refresh |
| `authDomains` | Hostnames that auto-receive Bearer token - see [[@concept-auth-domains]] |
| `sessionExpiredMessage` | Shown on session expiry |
| `loginBody` | Server-side body shape mapping (e.g., email to username) - see [[@pattern-login-body-template]] |
| `interceptors` | Fetch interceptor config - see [[@concept-fetch-interceptors]] |

## Custom JWT provider response mapping

For custom JWT auth, response paths are explicit. `tokenPath`,
`refreshTokenPath`, and `userPath` are dot paths against the full response.
`rolePath` and `rolesPath` use a compat dual contract: plain keys such as
`"role"` / `"roles"` resolve inside the extracted `userPath` object, while
dotted paths such as `"user.role"` or `"data.user.role"` resolve against
the full response. See [[@concept-custom-jwt-provider]].

## Related concepts

- [[@concept-auth-state-paths]]
- [[@concept-auth-security]]
- [[@concept-custom-jwt-provider]]
- [[@concept-auth-domains]]
- [[@concept-session-persistence]]
- [[@concept-cross-tab-sync]]
- [[@concept-fetch-interceptors]]
- [[@concept-role-access]]
- [[@pattern-login-screen]]
- [[@pattern-login-body-template]]

## Sources (raw)

- `docs/consumer/ai-context.md` - AppSpec & Navigation / Auth Config
- `docs/consumer/reference-doc.md` - Authentication / AppSpec Auth Config
