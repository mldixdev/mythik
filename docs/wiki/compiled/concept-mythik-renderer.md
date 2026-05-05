---
id: concept-mythik-renderer
title: `MythikRenderer` - root mount
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#9-derive-and-datasources-lifecycle-v010--item-e, docs/consumer/reference-doc.md#rules-220-224, docs/consumer/reference-doc.md#render-error-visibility]
---

# `MythikRenderer` - root mount

The React entry point. Mounts the spec runtime + state subscription, owns
the v2 `<BackgroundStack>` mount when `tokens.identity.background` is a
`LayerBackground`, and catches thrown primitive/component render errors.

## Effect ordering (load-bearing)

The state-subscription `useEffect` is declared **BEFORE** the
`mountSpecRuntime` `useEffect`. React fires effects in declaration order,
so:

1. State subscription attaches.
2. `mountSpecRuntime` runs `deriveEngine.mount()`, which writes synchronously.
3. The subscription captures those writes -> first-paint re-render.

If you fork or reimplement `MythikRenderer`, **preserve this ordering**.

## Table row dispatcher

`MythikRenderer` wires table row interactions through
`packages/react/src/runtime/row-dispatcher.ts`. The shared
`createRowDispatcher` helper writes the clicked row to `/ui/selectedRow`
BEFORE dispatching column actions or direct `onRowClick` ActionBinding(s).
See [[@path-ui-selected-row]].

## Render error boundary

`MythikRenderer` catches thrown primitive/component render exceptions with a
renderer-level error boundary. In development with
`security.exposeErrors !== false`, it shows a visible overlay with the
message and component stack. In production, or with
`security.exposeErrors: false`, it renders a neutral placeholder without
details. The boundary resets when the `spec` prop changes. See
[[@concept-render-error-visibility]].

## v2 LayerBackground mount

When `tokens.identity.background` `isLayerBackground`, the renderer wraps
the rendered tree in a positioned container with `<BackgroundStack>` as
a sibling INSIDE a stacking context (`isolation: isolate`). Reads from
`/tokens/resolved` so preset swaps + playground updates trigger fresh
reads. See [[@concept-background-stack]].

## Props

- `spec` - the spec to render
- `instance` - `createMythik` instance
- `autoSkeleton={false}` - disable auto-skeleton entirely
- `autoDeviceContext={false}` - disable device-context auto-tracking
- `storage={...}` - StorageAdapter
- `storageConfig={...}` - global allowedTypes / maxSize
- `exportAdapters={{ xlsx, pdf }}` - register custom export formats

## Related concepts

- [[@concept-mount-spec-runtime]]
- [[@concept-derive-datasources-mount-order]]
- [[@concept-background-stack]]
- [[@path-ui-selected-row]]
- [[@concept-render-error-visibility]]
- [[@concept-skeleton-auto]]
- [[@path-ui-device]]
- [[@concept-storage-adapter]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md` - section 9
- `docs/consumer/reference-doc.md` - rules 220, 224, 251
