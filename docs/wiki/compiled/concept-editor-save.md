---
id: concept-editor-save
title: editorSave action
kind: action
sources: [docs/consumer/ai-context-runtime-semantics.md, docs/consumer/reference-doc.md]
---

# editorSave action

`editorSave` is the recommended save action for editor sessions.

It captures the in-flight tracked-path snapshot, persists that snapshot through the host fetcher, and marks only that sent snapshot as saved after success. If the user edits while save is in flight, the current document remains dirty.

Save failures never mark the session clean. Status, error, and attempt metadata live under `/ui/editorSessions/<id>`.

Do not hand-compose `transaction` plus `editorMarkSaved` for normal editor save flows. `editorMarkSaved` is a low-level escape hatch.

Related: [[@concept-editor-sessions]], [[@concept-navigation-dirty-guard]].
