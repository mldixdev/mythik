---
id: cli-existing-spec-edit-loop
title: Existing spec edit loop
kind: cli
sources: [docs/consumer/ai-context.md, docs/consumer/reference-doc.md, docs/consumer/WHERE-TO-LOOK.md]
---

# Existing spec edit loop

For existing persisted specs, AI agents must inspect first, patch second, and verify after.

Required loop:

1. `mythik manifest <id>` - inspect the current structure and identify candidate element IDs.
2. `mythik elements <id> <ids>` - inspect only the exact nodes and nearby containers that will change.
3. Write a small RFC 6902 patch file.
4. `mythik patch <id> --from-file patch.json` - apply through the validated CLI path.
5. Re-run `manifest` or `elements` to verify the changed surface.

`pull` is for backup, migration, review, or full-document work. `push` is for new specs or intentional full replacement. Routine edits should not replace whole screens.

Never edit database rows directly and never call `SpecStore.save()` from app code. Those bypass validation.

Related: [[@cli-manifest]], [[@cli-elements]], [[@cli-patch]], [[@antipattern-store-save-bypass]].
