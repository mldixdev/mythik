---
id: concept-spatial-map-editor
title: Spatial-map editor workflow
kind: concept
sources: [docs/consumer/ai-context-primitives.md, docs/consumer/ai-context-runtime-semantics.md, docs/consumer/reference-doc.md]
---

# Spatial-map editor workflow

Spatial editing is data-first. Runtime interactions produce complete next objects, and JSON specs persist them with `$array: "replace"`.

Recommended pattern:

- Use `mode: "edit"` for editor surfaces.
- Use `editPolicy` to enable or disable movement, resize, rotate, shape editing, keyboard controls, snap, and guides.
- Persist item updates from `/ui/spatialItemChange/nextItem`.
- Persist zone updates from `/ui/spatialZoneChange/nextZone`.
- Wrap the same replace action in `editorCommit` when the screen needs undo/redo/dirty tracking.

`status` is visual. Disabled/inactive semantics should be driven by interaction policy, not by hiding the item from editor selection. That keeps inactive items recoverable.

Related: [[@primitive-spatial-map]], [[@concept-editor-sessions]], [[@concept-editor-commit]].
