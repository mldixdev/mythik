---
id: expression-i18n
title: `$i18n` — translation key
kind: expression
sources: [docs/consumer/ai-context.md#values--formatting, docs/consumer/reference-doc.md#expression-types]
---

# `$i18n` — translation key

`$i18n` resolves a translation key for the active locale. Optional `args`
object passes interpolation values to the translation entry.

## Shape / Signature

```json
{ "$i18n": "key" }
{ "$i18n": "key", "args": { "name": <expr>, ... } }
```

## Examples

Simple key:
```json
{ "type": "text", "props": { "content": { "$i18n": "patient.name" } } }
```

With args:
```json
{ "$i18n": "welcome", "args": { "name": { "$state": "/user/name" } } }
```

Auth screen with i18n:
```json
"title": { "type": "text", "props": { "content": { "$i18n": "auth.login" } } }
```

## Constraints / Anti-patterns

- Translations live in `appSpec.translations.<locale>.<key>` (or screen-level
  for screen-spec apps).
- Active locale comes from `/preferences/locale` — toggle via `setLocale`
  action.
- Missing keys produce undefined / fallback per host-app config.

## Related concepts

- [[@action-set-locale]] — change active locale
- [[@concept-app-spec]] — `translations` field in AppSpec

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Values & Formatting → $i18n`
- `docs/consumer/reference-doc.md § Expression Types → $i18n`
