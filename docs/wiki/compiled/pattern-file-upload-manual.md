---
id: pattern-file-upload-manual
title: Pattern — Manual upload (autoUpload: false)
kind: pattern
sources: [docs/consumer/ai-context-primitives.md#file-upload]
---

# Pattern — Manual upload

`autoUpload: false` — files selected and previewed but NOT uploaded until
triggered by a button action chain. Use for multi-field forms where the
upload should happen alongside the form submit.

## Skeleton

File-upload element:
```json
{
  "type": "file-upload",
  "props": { "accept": ".pdf,.docx,.xlsx", "multiple": true, "maxFiles": 5, "autoUpload": false, "label": "Attach documents" }
}
```

Submit chain — upload first, then submit:
```json
"on": { "press": [
  { "action": "uploadFile", "params": { "bucket": "docs", "target": "/form/attachmentUrl" } },
  { "action": "submitForm", "params": {
    "formId": "my-form",
    "url": "...",
    "method": "POST",
    "body": { "attachment": { "$state": "/form/attachmentUrl" } }
  }},
  { "action": "showNotification", "params": { "type": "success", "message": "Sent!" } }
]}
```

## Why this works

Action chains commit state between steps — by the time `submitForm` runs,
`/form/attachmentUrl` holds the just-uploaded URL.

## Use case

Document submission form — user picks files first (sees previews), fills
out other fields, clicks Submit → upload + form submission happen in one
chain.

## Related concepts

- [[@pattern-file-upload-auto]] — simpler alternative
- [[@primitive-file-upload]]
- [[@action-upload-file]]
- [[@action-submit-form]]
- [[@concept-action-chains]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § file-upload → Manual upload pattern`
