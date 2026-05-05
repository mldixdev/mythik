---
id: action-open-url
title: `openUrl` — open external URL
kind: action
sources: [docs/consumer/ai-context.md#action-reference]
---

# `openUrl`

Opens an external URL (typically in a new tab on web).

## Shape / Signature

```json
{ "action": "openUrl", "params": { "url": "<absolute-url>" } }
```

## Examples

```json
{ "action": "openUrl", "params": { "url": "https://docs.example.com" } }
```

With expression-built URL:
```json
{ "action": "openUrl", "params": {
  "url": { "$template": "https://maps.google.com/?q=${ /location/lat },${ /location/lng }" }
}}
```

## Related concepts

- [[@action-fetch]] — for in-app HTTP requests
- [[@expression-template]] — building dynamic URLs

## Sources (raw)

- `docs/consumer/ai-context.md § Actions → Action Reference`
