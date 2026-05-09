# Lint Report - Event Binding Guard Refresh

Validation of cross-references, stale public references, and generated wiki shape after refreshing the compiled wiki delta from `docs/consumer` on 2026-05-09.

## Broken Cross-References

**0 broken wiki links** across compiled wiki files.

## Stale / Private Reference Scan

**0 hits** for publish-blocking pattern families:

- scoped package names
- removed migration-doc references
- unreleased scaffold-package references
- beta/prerelease release-status drift
- private consumer or local-path references
- internal process residue

## Article Counts

- Total markdown files in `compiled`: **333**
- Generated article files, excluding `README.md` and `_*.md`: **327**
- Migration pages removed: **yes** (`migration-*.md` no longer publish)
- Metadata folder publish status: **excluded**

## Key Refresh Additions

- Dotted `$let` binding reads for `$ref` and `$template`
- Mixed event arrays containing actions plus transactions
- `params.skipIf` dispatch-time action guards
- Optional SQL adapter dependency wording
- Generic SQL store / driver package-layout pages
- `concept-public-package-names`
- `cli-existing-spec-edit-loop`
- `primitive-spatial-map`
- `concept-spatial-map-editor`
- `concept-spatial-map-zones`
- `concept-editor-sessions`
- `concept-editor-commit`
- `concept-editor-save`
- `concept-navigation-dirty-guard`
- `cli-docs`

## Tooling

Cross-reference check:

```powershell
$allFiles = Get-ChildItem -LiteralPath docs\wiki\compiled -File -Filter *.md
$articleFiles = $allFiles | Where-Object { $_.Name -notlike '_*' -and $_.Name -ne 'README.md' }
$ids = @{}
foreach ($file in $articleFiles) { $ids[$file.BaseName] = $true }
$refs = Select-String -LiteralPath $allFiles.FullName -Pattern '\[\[@([a-z0-9-]+)\]\]' -AllMatches |
  ForEach-Object {
    foreach ($m in $_.Matches) {
      [pscustomobject]@{ Ref=$m.Groups[1].Value; Path=$_.Path; Line=$_.LineNumber }
    }
  }
$broken = @($refs | Where-Object { -not $ids.ContainsKey($_.Ref) })
```

Stale reference check:

```powershell
$files = Get-ChildItem -LiteralPath docs\wiki\compiled -File -Filter *.md
$patterns = <publish-blocking-pattern-list>
Select-String -LiteralPath $files.FullName -Pattern $patterns -SimpleMatch
```

Re-run both checks on every wiki refresh.
