---
id: primitive-spatial-map
title: Primitive - spatial-map
kind: primitive
sources: [docs/consumer/ai-context-primitives.md, docs/consumer/ai-context.md, docs/consumer/reference-doc.md]
---

# Primitive - spatial-map

`spatial-map` is the generic SVG/data-first primitive for two-dimensional layouts: floor plans, seating maps, parking maps, warehouse locations, hospital beds, office maps, and similar domains.

It knows geometry, zones, items, status, selection, edit policy, snap guides, and action dispatch. It does not encode restaurant-specific workflows.

Core capabilities:

- asymmetric viewBox layouts, not just square grids,
- zones and items with rect/circle/ellipse/polygon/path shapes,
- item selection through `/ui/selectedSpatialItem`,
- zone selection through `/ui/selectedSpatialZone`,
- JSON action dispatch for item/zone/canvas interactions,
- edit mode with move, resize, rotate, keyboard controls, snap guides, and shape editing for polygon zones,
- lazy change contexts under `/ui/spatialItemChange` and `/ui/spatialZoneChange`.

Use `{ "$state": "/path" }` expressions for dynamic `items`, `zones`, `mode`, and `statusStyles`. Do not invent `*Path` prop aliases.

Related: [[@concept-spatial-map-editor]], [[@concept-spatial-map-zones]], [[@concept-editor-sessions]].
