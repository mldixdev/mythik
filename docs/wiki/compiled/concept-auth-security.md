---
id: concept-auth-security
title: Auth security guarantees
kind: concept
sources: [docs/consumer/ai-context.md#auth-config, docs/consumer/reference-doc.md#security-guarantees]
---

# Auth security guarantees

Architectural guarantees from the auth subsystem. Most are enforced at the
type/runtime level, not by convention.

## Guarantees

- **Tokens NEVER exist in the state store**: only in engine closure.
- **`$auth` blocks token/password fields** via whitelist.
- **Auth headers only injected for `authDomains` URLs.**
- **Credentials cleared from state after login** (success AND failure).
- **Custom JWT role mapping is explicit**: plain `rolePath` / `rolesPath`
  keys resolve inside the extracted user object; dotted paths resolve
  against the full response. See [[@concept-custom-jwt-provider]].
- **Refresh mutex**: max 1 concurrent refresh (anti-stampede).
- **Login rate limit**: 5 attempts/min with exponential backoff.
- **Cross-tab sync**: logout in one tab = logout in all tabs.
- **StateGuard blocks spec writes to `/auth/*`.**
- **XSS-resistant by architecture**: JSON to primitives to React escaping.

## Blocked `$auth` fields

Always return `undefined`:
`token`, `accessToken`, `access_token`, `refreshToken`, `refresh_token`,
`password`, `secret`, `session`, `metadata.token`, `metadata.password`.

## Production behavior

- **Auth errors silent in production**: `login`, `logout`, `refreshSession`
  errors logged to console only when `NODE_ENV !== 'production'`. In
  production, suppressed to prevent stack-trace leakage to attackers.
  Errors still appear in UI via `/auth/error`.

## Never trust client auth as security

`AppAuthConfig` is UX routing (hide screens by role), not server-side
security. Always validate tokens on the backend (rule 42).

## Related concepts

- [[@concept-auth-config]]
- [[@concept-custom-jwt-provider]]
- [[@expression-auth]]
- [[@concept-auth-domains]]
- [[@concept-state-protection]]
- [[@concept-cross-tab-sync]]

## Sources (raw)

- `docs/consumer/ai-context.md` - AppSpec & Navigation / Auth Config (Security)
- `docs/consumer/reference-doc.md` - Security Guarantees
