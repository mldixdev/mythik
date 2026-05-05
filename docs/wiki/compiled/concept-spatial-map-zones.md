---
id: concept-spatial-map-zones
title: Spatial-map zones and polygon editing
kind: concept
sources: [docs/consumer/ai-context-primitives.md, docs/consumer/reference-doc.md]
---

# Spatial-map zones and polygon editing

Zones describe map regions. Zone geometry remains generic: rooms, parking areas, warehouse sections, hospital wings, retail zones, or any other spatial partition.

Polygon zones can enter shape-edit mode when the editor enables `editPolicy.shapeEditZones`. Vertex handles allow polygon point movement; segment handles support inserting points; keyboard controls support accessible editing where configured.

The polygon shape is stored in zone-local coordinates and rendered through the zone transform. Runtime change contexts provide complete previous/next zone objects so persistence can use `$array: "replace"`.

For non-polygon zones, use move/resize/rotate editing or switch the zone shape to polygon when freeform contour editing is required.

Related: [[@primitive-spatial-map]], [[@concept-spatial-map-editor]].
