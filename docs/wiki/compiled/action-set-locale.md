---
id: action-set-locale
title: `setLocale` — change active locale
kind: action
sources: [docs/consumer/ai-context.md#action-reference]
---

# `setLocale`

Changes the active locale, which drives `$i18n` lookups and locale-sensitive
formatting (`$format`, `$date`).

## Shape / Signature

```json
{ "action": "setLocale", "params": { "locale": "<bcp47-tag>" } }
```

## Examples

```json
{ "action": "setLocale", "params": { "locale": "es-HN" } }
```

Bind to a select element:
```json
{ "type": "select",
  "props": {
    "options": [{ "label": "English", "value": "en" }, { "label": "Español", "value": "es-HN" }],
    "value": { "$bindState": "/preferences/locale" }
  },
  "on": { "change": { "action": "setLocale", "params": { "locale": { "$state": "/preferences/locale" } } } }
}
```

## Related concepts

- [[@expression-i18n]] — translation lookups
- [[@expression-format]] — locale option per call
- [[@concept-app-spec]] — `translations` field

## Sources (raw)

- `docs/consumer/ai-context.md § Actions → Action Reference`
