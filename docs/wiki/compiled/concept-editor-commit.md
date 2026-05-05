---
id: concept-editor-commit
title: editorCommit action
kind: action
sources: [docs/consumer/ai-context-runtime-semantics.md, docs/consumer/reference-doc.md]
---

# editorCommit action

`editorCommit` applies atomic tracked-path edits through an editor session and pushes one undo entry.

Use it when an edit should be recoverable:

```json
{
  "action": "editorCommit",
  "params": {
    "session": "floor-layout",
    "label": "Move item",
    "changes": [
      {
        "path": "/layout/items",
        "value": {
          "$array": "replace",
          "source": { "$state": "/layout/items" },
          "where": { "field": "id", "eq": { "$state": "/ui/spatialItemChange/itemId" } },
          "value": { "$state": "/ui/spatialItemChange/nextItem" }
        }
      }
    ]
  }
}
```

No-op commits do not push history. Dirty state is computed against the saved snapshot, not guessed from the last action.

Related: [[@concept-editor-sessions]], [[@concept-spatial-map-editor]].
