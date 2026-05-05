---
id: concept-storage-adapter
title: StorageAdapter (host-app)
kind: concept
sources: [docs/consumer/reference-doc.md#storageadapter-setup-host-app]
---

# StorageAdapter (host-app)

The host app provides a StorageAdapter to enable file uploads. Two
canonical adapters ship; consumers can write custom ones.

## Supabase Storage

```tsx
import { createSupabaseStorageAdapter } from 'mythik';

<MythikRenderer
  spec={spec}
  instance={svc}
  storage={createSupabaseStorageAdapter({ client: supabaseClient })}
/>
```

## Generic URL (any backend)

```tsx
import { createUrlStorageAdapter } from 'mythik';

<MythikRenderer
  spec={spec}
  instance={svc}
  storage={createUrlStorageAdapter({
    uploadUrl: 'https://api.example.com/upload',
    deleteUrl: 'https://api.example.com/files',
    responsePath: 'data.url',
    headers: { 'X-Api-Key': apiKey },
  })}
/>
```

## Global limits (optional security backstop)

```tsx
<MythikRenderer
  spec={spec}
  instance={svc}
  storage={adapter}
  storageConfig={{
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 10_485_760,
  }}
/>
```

`storageConfig` enforces ABOVE per-element `accept` + `maxSize` — defense
in depth.

## Related concepts

- [[@primitive-file-upload]]
- [[@action-upload-file]]
- [[@concept-file-upload-overview]]
- [[@pattern-file-upload-auto]]
- [[@pattern-file-upload-manual]]

## Sources (raw)

- `docs/consumer/reference-doc.md § StorageAdapter Setup (Host App)`
