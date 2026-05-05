---
id: concept-cross-tab-sync
title: Cross-tab synchronization
kind: concept
sources: [docs/consumer/reference-doc.md#cross-tab-synchronization]
---

# Cross-tab synchronization

Auth events are automatically synchronized across browser tabs. **No
configuration needed** — automatic when auth is configured.

## Events

| Event | Trigger | Effect on other tabs |
|---|---|---|
| `SIGNED_IN` | Login completes | Other tabs can restore session from persistence |
| `SIGNED_OUT` | Logout | All tabs clear session and redirect to loginScreen |
| `TOKEN_REFRESHED` | Token refresh completes | Other tabs pick up new refresh token |
| `SESSION_EXPIRED` | Refresh fails | All tabs clear session |

## Mechanism

- **Primary**: BroadcastChannel API (97%+ browser support).
- **Fallback**: localStorage `storage` events for legacy browsers.

## Related concepts

- [[@concept-auth-config]]
- [[@concept-session-persistence]]
- [[@action-login]]

## Sources (raw)

- `docs/consumer/reference-doc.md § Cross-Tab Synchronization`
