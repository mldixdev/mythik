---
id: cli-config
title: CLI config — `.mythikrc` + env vars
kind: concept
sources: [docs/consumer/reference-doc.md#configuration--never-pass-keys-inline]
---

# CLI config

**Always** use `.mythikrc` + environment variables. **Never pass API keys
as CLI flags** — they appear in terminal history, chat logs, and process
lists.

## `.mythikrc`

```json
{
  "store": "supabase",
  "supabase": {
    "url": "https://xxx.supabase.co",
    "apiKey": "$MYTHIK_API_KEY"
  }
}
```

## Env var

```bash
export MYTHIK_API_KEY="your-key"
```

The CLI resolves `$MYTHIK_API_KEY` at runtime.

## Add to `.gitignore`

```
.mythikrc
```

## Related concepts

- [[@cli-overview]]

## Sources (raw)

- `docs/consumer/reference-doc.md § Configuration — Never pass keys inline`
