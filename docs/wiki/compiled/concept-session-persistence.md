---
id: concept-session-persistence
title: Session persistence — local / session / memory
kind: concept
sources: [docs/consumer/ai-context.md#auth-config, docs/consumer/reference-doc.md#session-persistence]
---

# Session persistence

Configurable in AppSpec via `navigation.auth.persistence`.

| Mode | Config Value | Behavior |
|---|---|---|
| **Local** | `"persistence": "local"` (default) | Survives browser close. Refresh token + safe user data in localStorage. |
| **Session** | `"persistence": "session"` | Lost on browser/tab close. Uses sessionStorage. |
| **Memory** | `"persistence": "memory"` | Lost on page refresh. Most secure — re-login required every time. |

## What's persisted

- Refresh token + user profile (id, email, name, avatar, role, roles, metadata).

## What's NEVER persisted

- **Access tokens.** They live exclusively in engine closure.

## On page load

`mount()` restores the session from persistence and attempts a token refresh
to validate the session is still alive. If refresh fails, the persisted
session is cleared.

## Related concepts

- [[@concept-auth-config]]
- [[@concept-auth-security]]
- [[@concept-cross-tab-sync]]

## Sources (raw)

- `docs/consumer/ai-context.md § AppSpec & Navigation → Auth Config`
- `docs/consumer/reference-doc.md § Session Persistence`
