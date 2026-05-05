---
id: cli-overview
title: CLI overview - `mythik <command>`
kind: concept
sources: [docs/consumer/ai-context.md#cli-workflow, docs/consumer/reference-doc.md#cli--spec-modification-via-mythik-cli]
---

# CLI overview

The `mythik` CLI is the only approved path for spec writes. Three approved
forms are documented in [[@cli-push]] and rule 248.

## Commands

```bash
mythik init   --store supabase --url <url> --key $MYTHIK_API_KEY  # configure
mythik docs path                                                  # locate bundled AI docs
mythik docs copy ./mythik-docs                                    # copy docs for an AI agent
mythik push <screen>                                              # create/replace
mythik pull <screen>                                              # export to stdout
mythik manifest <screen>                                          # structural tree
mythik elements <screen> <id1,id2,...>                            # element details
mythik patch <screen> --from-file patch.json                      # RFC 6902
mythik validate <screen>                                          # validate
mythik delete <screen> --confirm                                  # delete (requires --confirm)
mythik tokens --dna '{"primary":"#0D9488"}' --json                # inspect tokens
mythik contract --app <id> --api <id>                             # cross-validate
mythik lint [--from-file path | --from-dir folder]                # detect anti-patterns
mythik history <screen>                                           # version history
```

## Common flags

- `--json` - machine-parseable output
- `--store <type>` - store type (`supabase`, `sqlserver`, `memory`, `file`)
- `--url <url>` - connection URL
- `--key <key>` - API key (NEVER inline; see [[@cli-config]])
- `--table <name>` - override store table (rule 91)
- `--toon` - TOON format

## Spec types auto-detected

CLI detects `type: "app"`, `type: "api"`, or screen-spec automatically.
Manifest output adapts per doctype. See [[@cli-app-spec]].

## Workflow

1. **`docs path`** - locate the installed AI docs
2. **`manifest`** - see structure, decide what to modify
3. **`elements`** - inspect specific elements
4. **`patch --from-file patch.json`** - apply surgical changes
5. **`manifest`** - verify

## Related concepts

- [[@cli-docs]]
- [[@cli-config]]
- [[@cli-push]]
- [[@cli-pull]]
- [[@cli-manifest]]
- [[@cli-elements]]
- [[@cli-patch]]
- [[@cli-toon]]
- [[@cli-validate]]
- [[@cli-delete]]
- [[@cli-tokens]]
- [[@cli-contract]]
- [[@cli-lint]]
- [[@cli-history]]
- [[@cli-versioning-author]]
- [[@cli-app-spec]]
- [[@cli-programmatic-api]]

## Sources (raw)

- `docs/consumer/ai-context.md` CLI Workflow
- `docs/consumer/reference-doc.md` CLI spec modification
