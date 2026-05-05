---
id: expression-platform
title: `$platform` — cross-platform value
kind: expression
sources: [docs/consumer/ai-context.md#responsive--cross-platform, docs/consumer/reference-doc.md#expression-types]
---

# `$platform` — cross-platform value

`$platform` resolves to different values based on the current platform
(`web`, `ios`, `android`). Reads `/ui/device/platform` from state.
**`native` is an alias** matching ios + android. Specific platform keys take
priority over `native`.

## Shape / Signature

```json
{ "$platform": { "web": <value>, "native": <value>, "ios"?: <value>, "android"?: <value> } }
```

## Examples

Platform-specific styling:
```json
"style": { "backdropFilter": { "$platform": { "web": "blur(24px)", "native": null } } }
```

Different layouts per platform (root-level):
```json
{
  "root": { "$platform": { "web": "layout-web", "native": "layout-native" } },
  "elements": {
    "layout-web": { "type": "stack", "style": { "backdropFilter": "blur(24px)" } },
    "layout-native": { "type": "screen", "props": { "title": "Dashboard" } },
    "shared-form": { "type": "stack", "children": ["..."] }
  }
}
```

Platform-specific overrides for ios:
```json
{ "$platform": { "web": "hover-card", "ios": "ios-card", "android": "android-card" } }
```

## When to use `$platform` vs `$breakpoint`

| Use | Pick |
|---|---|
| Same component, different sizing (columns, gaps, padding) | [[@expression-breakpoint]] |
| Different implementation per platform (CSS blur vs BlurView, hover vs press, web sidebar vs native tabs) | `$platform` |

## Constraints / Anti-patterns

- **If no key matches, resolves to `undefined`.** Always provide keys for
  all target platforms (or include `native` as fallback).
- Root-level `$platform` enables platform-divergent layouts while
  state/initialActions/forms remain shared — only presentation branches.

## Related concepts

- [[@expression-breakpoint]] — responsive layout (different axis)
- [[@path-ui-device]] — auto-tracked `/ui/device/platform`
- [[@concept-identity-glass-rn]] — RN BlurView wrapping for `glass` surface

## Sources (raw)

- `docs/consumer/ai-context.md § Expressions → Responsive & Cross-Platform → $platform`
- `docs/consumer/reference-doc.md § Expression Types → $platform`
