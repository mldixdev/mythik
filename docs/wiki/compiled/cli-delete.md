---
id: cli-delete
title: `mythik delete` — with safety gate
kind: concept
sources: [docs/consumer/reference-doc.md#delete--with-safety-gate]
---

# `mythik delete`

Deletes a spec. **Requires `--confirm`** — without it, only previews.

## Usage

Preview (no deletion):
```bash
mythik delete task-manager
# → Screen "task-manager" (107 elements). Use --confirm to delete.
```

Delete with backup:
```bash
mythik delete task-manager --confirm > backup.json
```

Plain delete:
```bash
mythik delete task-manager --confirm
```

## Related concepts

- [[@cli-pull]]
- [[@cli-overview]]

## Sources (raw)

- `docs/consumer/reference-doc.md § Delete — With Safety Gate`
