---
id: concept-navigation-dirty-guard
title: Navigation dirty guard
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md, docs/consumer/reference-doc.md]
---

# Navigation dirty guard

`navigation.editorSessionGuard` protects dirty editor sessions during app navigation.

When navigation would leave a dirty editor session, the app engine writes pending guard state under `/ui/navigationGuard/pending` by default. Consumer JSON renders the confirmation UI from that state.

Canonical actions:

- `navigationGuardCancel` - clear pending guard state and stay on the current screen.
- `navigationGuardSaveAndProceed` - save pending dirty sessions, then resume navigation only if they become clean.
- `navigationGuardProceed` - low-level retry after sessions are already clean; it does not save or discard.
- `navigationGuardDiscardAndProceed` - discard pending dirty sessions through the mounted editor engine, then resume.

Custom `pendingPath` values must stay under non-reserved `/ui/<segment>` paths.

Related: [[@concept-editor-sessions]], [[@concept-editor-save]].
