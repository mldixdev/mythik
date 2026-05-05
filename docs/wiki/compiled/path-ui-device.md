---
id: path-ui-device
title: `/ui/device/*` — auto-tracked device context
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#22-uidevice]
---

# `/ui/device/*`

Framework auto-tracks device context — viewport, platform, orientation,
OS color scheme. Updated in real-time.

## Paths

| Path | Type | Updated on |
|---|---|---|
| `/ui/device/viewportWidth` | number | Resize |
| `/ui/device/viewportHeight` | number | Resize |
| `/ui/device/platform` | `"web"` / `"ios"` / `"android"` | Mount |
| `/ui/device/orientation` | `"portrait"` / `"landscape"` | Orientation change |
| `/ui/device/colorScheme` | `"light"` / `"dark"` | OS preference change |

## Read patterns

**Prefer `$breakpoint` and `$platform`** for typical use — they abstract
over the paths and handle defaults. Use direct `$state` reads for
detection beyond what the expressions cover (orientation, OS scheme).

```json
{ "$breakpoint": { "sm": 1, "md": 2, "lg": 3 } }                         // viewport
{ "$platform": { "web": "blur(24px)", "native": null } }                  // platform
{ "$cond": { "$state": "/ui/device/orientation", "eq": "portrait" }, "$then": "vertical", "$else": "horizontal" }
```

## Opt-out

`autoDeviceContext={false}` on `MythikRenderer` disables auto-tracking
(host app must populate manually).

## Legacy compat

`$breakpoint` reads `/ui/device/viewportWidth` first, falls back to
`/ui/viewportWidth` for existing apps that wrote there manually.

## Related concepts

- [[@expression-breakpoint]]
- [[@expression-platform]]
- [[@concept-state-protection]] — framework-managed paths

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 2.2`
