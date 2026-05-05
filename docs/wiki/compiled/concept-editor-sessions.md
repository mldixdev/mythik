---
id: concept-editor-sessions
title: Editor sessions
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md, docs/consumer/reference-doc.md]
---

# Editor sessions

Editor sessions provide document-style editing over tracked state paths.

They manage:

- undo and redo,
- dirty tracking,
- discard to saved snapshot,
- validation metadata,
- save status and save errors,
- integration with navigation dirty guards.

Use `editorCommit` to group one or more tracked-path changes into a semantic editor operation. The action lazily resolves `changes[].value` at dispatch time, so it composes with spatial edit contexts such as `/ui/spatialItemChange/nextItem` and `/ui/spatialZoneChange/nextZone`.

Related: [[@concept-editor-commit]], [[@concept-editor-save]], [[@concept-navigation-dirty-guard]].
