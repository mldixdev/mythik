# Mythik compiled wiki index

Flat catalog generated from `docs/wiki/compiled`. Use the article ID for wikilinks, for example `[[ @concept-spec-structure ]]` without the spaces.

## Actions (19)

@action-apply-preset :: action-apply-preset.md :: `applyPreset` — apply curated DNA+Identity
@action-copy-clipboard :: action-copy-clipboard.md :: `copyToClipboard`
@action-drawer :: action-drawer.md :: `openDrawer` / `closeDrawer`
@action-export :: action-export.md :: `export` — data export
@action-fetch :: action-fetch.md :: `fetch` — HTTP request
@action-form-control :: action-form-control.md :: `validateForm` / `touchField` / `resetForm`
@action-login :: action-login.md :: `login` / `logout` / `refreshSession`
@action-modal :: action-modal.md :: `openModal` / `closeModal`
@action-navigate :: action-navigate.md :: `navigateScreen` / `goBackScreen` (and low-level `navigate`/`goBack`)
@action-open-url :: action-open-url.md :: `openUrl` — open external URL
@action-refresh-data-source :: action-refresh-data-source.md :: `refreshDataSource` — force re-fetch
@action-selection :: action-selection.md :: `toggleSelection` / `selectAll` / `selectNone`
@action-set-locale :: action-set-locale.md :: `setLocale` — change active locale
@action-set-state :: action-set-state.md :: `setState` — write to state
@action-show-notification :: action-show-notification.md :: `showNotification` / `dismissNotification`
@action-submit-form :: action-submit-form.md :: `submitForm` — validate + fetch + notify
@action-toggle-theme :: action-toggle-theme.md :: `toggleTheme` — switch dark/light
@action-update-tokens :: action-update-tokens.md :: `updateTokens` — runtime token update
@action-upload-file :: action-upload-file.md :: `uploadFile` / `deleteFile`

## Anti-patterns (21)

@antipattern-action-chain-no-stop :: antipattern-action-chain-no-stop.md :: Anti-pattern — `validateForm` doesn't halt chains
@antipattern-all-filter-wildcard :: antipattern-all-filter-wildcard.md :: Anti-pattern — `"all"` is not a wildcard
@antipattern-auth-domains-port :: antipattern-auth-domains-port.md :: Anti-pattern — `:port` in `authDomains`
@antipattern-background-blobs-prop :: antipattern-background-blobs-prop.md :: Anti-pattern — `Box.backgroundBlobs` prop
@antipattern-background-css-token :: antipattern-background-css-token.md :: Anti-pattern — `$token: "backgroundCSS"`
@antipattern-checkbox-toggle-value :: antipattern-checkbox-toggle-value.md :: Anti-pattern — `value` on checkbox/toggle
@antipattern-crud-id-collision :: antipattern-crud-id-collision.md :: Anti-pattern — CRUD `:id` collision
@antipattern-derive-server-pagination :: antipattern-derive-server-pagination.md :: Anti-pattern — `derive` over server-paginated state
@antipattern-element-variant-top-level :: antipattern-element-variant-top-level.md :: Anti-pattern — top-level `variant` field
@antipattern-event-expression :: antipattern-event-expression.md :: Anti-pattern — `$event` expression
@antipattern-input-type-name :: antipattern-input-type-name.md :: Anti-pattern — `inputType` instead of `type`
@antipattern-mix-fetch-and-datasources :: antipattern-mix-fetch-and-datasources.md :: Anti-pattern — mixing `fetch` + `dataSources` for same target
@antipattern-modal-drawer-visible :: antipattern-modal-drawer-visible.md :: Anti-pattern — `visible` on modal/drawer
@antipattern-motion-entrance-token :: antipattern-motion-entrance-token.md :: Anti-pattern — `identity.motionEntrance` / `motionHover`
@antipattern-overflow-hidden-with-shadow :: antipattern-overflow-hidden-with-shadow.md :: Anti-pattern — `overflow: hidden` + `box-shadow` hover
@antipattern-required-if-equals :: antipattern-required-if-equals.md :: Anti-pattern — `requiredIf` with value comparison
@antipattern-row-literal :: antipattern-row-literal.md :: Anti-pattern — `$row` literal
@antipattern-row-template-capture :: antipattern-row-template-capture.md :: Anti-pattern — `$item` directly in `$template`
@antipattern-store-save-bypass :: antipattern-store-save-bypass.md :: Anti-pattern — `store.save()` bypass
@antipattern-style-block-duplication :: antipattern-style-block-duplication.md :: Anti-pattern — duplicate style blocks
@antipattern-submit-form-in-tx-confirm :: antipattern-submit-form-in-tx-confirm.md :: Anti-pattern — `submitForm` in `transaction.confirm`

## CLI (19)

@cli-app-spec :: cli-app-spec.md :: CLI on AppSpecs
@cli-config :: cli-config.md :: CLI config — `.mythikrc` + env vars
@cli-contract :: cli-contract.md :: `mythik contract` — frontend↔backend cross-validation
@cli-delete :: cli-delete.md :: `mythik delete` — with safety gate
@cli-docs :: cli-docs.md :: `mythik docs` — bundled AI documentation
@cli-elements :: cli-elements.md :: `mythik elements` — inspect specific elements
@cli-existing-spec-edit-loop :: cli-existing-spec-edit-loop.md :: Existing spec edit loop
@cli-history :: cli-history.md :: `mythik history` — version history with diffs
@cli-lint :: cli-lint.md :: `mythik lint` — anti-pattern detection
@cli-manifest :: cli-manifest.md :: `mythik manifest` — structural tree
@cli-overview :: cli-overview.md :: CLI overview - `mythik <command>`
@cli-patch :: cli-patch.md :: `mythik patch` - RFC 6902 patches
@cli-programmatic-api :: cli-programmatic-api.md :: Programmatic API — `mythik-cli/api`
@cli-pull :: cli-pull.md :: `mythik pull` — export spec
@cli-push :: cli-push.md :: `mythik push` — three approved write paths
@cli-tokens :: cli-tokens.md :: `mythik tokens` — DNA inspection
@cli-toon :: cli-toon.md :: `--toon` - token-efficient format
@cli-validate :: cli-validate.md :: `mythik validate`
@cli-versioning-author :: cli-versioning-author.md :: `--author` flag — activates versioning

## Concepts (177)

@concept-action-chains :: concept-action-chains.md :: Action chains — sequential execution
@concept-action-middleware :: concept-action-middleware.md :: Action middleware
@concept-animation-build-css :: concept-animation-build-css.md :: `buildCSSKeyframes` — web output
@concept-animation-build-rn :: concept-animation-build-rn.md :: `buildReanimatedSpec` — RN output
@concept-animation-caps :: concept-animation-caps.md :: Animation performance caps
@concept-animation-cascade :: concept-animation-cascade.md :: 5-level animation cascade
@concept-animation-null-semantics :: concept-animation-null-semantics.md :: Animation null semantics
@concept-animation-recipes :: concept-animation-recipes.md :: 15 animation recipes
@concept-animation-triggers :: concept-animation-triggers.md :: Animation triggers — 7 triggers
@concept-animations-engine :: concept-animations-engine.md :: `animations` engine (preferred)
@concept-api-audit :: concept-api-audit.md :: `audit` — auto-inject user + timestamp
@concept-api-auth :: concept-api-auth.md :: API auth (`auth` block)
@concept-api-catalogs :: concept-api-catalogs.md :: API catalogs — dropdown sources
@concept-api-crud-endpoint :: concept-api-crud-endpoint.md :: API CRUD endpoint — 1 declaration → 3 routes
@concept-api-endpoint-properties :: concept-api-endpoint-properties.md :: API endpoint properties (full table)
@concept-api-endpoints-overview :: concept-api-endpoints-overview.md :: API endpoints — 4 patterns
@concept-api-handler-endpoint :: concept-api-handler-endpoint.md :: API handler endpoint — complex logic
@concept-api-login-body-contract :: concept-api-login-body-contract.md :: `/api/auth/login` body contract
@concept-api-param-properties :: concept-api-param-properties.md :: API param properties
@concept-api-public-endpoint :: concept-api-public-endpoint.md :: API public endpoint (`policy: "public"`)
@concept-api-query-endpoint :: concept-api-query-endpoint.md :: API query endpoint — SQL-driven read
@concept-api-scope-filter :: concept-api-scope-filter.md :: `scopeFilter` — row-level security
@concept-api-spec :: concept-api-spec.md :: ApiSpec — declarative backend
@concept-app-auto-state-paths :: concept-app-auto-state-paths.md :: AppSpec auto-state paths
@concept-app-spec :: concept-app-spec.md :: AppSpec — multi-screen app
@concept-auth-config :: concept-auth-config.md :: AppSpec auth config
@concept-auth-domains :: concept-auth-domains.md :: `authDomains` — hostname matcher
@concept-auth-security :: concept-auth-security.md :: Auth security guarantees
@concept-auth-state-paths :: concept-auth-state-paths.md :: Auth state paths — `/auth/*`
@concept-auto-dark-mode :: concept-auto-dark-mode.md :: Auto dark mode
@concept-background-caps :: concept-background-caps.md :: `validateBackgroundCaps` — performance caps
@concept-background-layer-kinds :: concept-background-layer-kinds.md :: Background layer kinds
@concept-background-recipes :: concept-background-recipes.md :: 8 curated background recipes
@concept-background-stack :: concept-background-stack.md :: `BackgroundStack` — root mount
@concept-blob-layer :: concept-blob-layer.md :: Blob layer v2 — preset + explicit
@concept-blob-motion :: concept-blob-motion.md :: Blob motion — drift / rotate / scale
@concept-blob-shapes-catalog :: concept-blob-shapes-catalog.md :: `BLOB_CATALOG` — 6 curated shapes
@concept-cli-tokens-inspect :: concept-cli-tokens-inspect.md :: `mythik tokens` — CLI inspection
@concept-component-variants :: concept-component-variants.md :: Component variants — `tokens.components.{type}.{variant}`
@concept-cross-tab-sync :: concept-cross-tab-sync.md :: Cross-tab synchronization
@concept-css-vs-motion :: concept-css-vs-motion.md :: CSS vs Motion — auto-detection
@concept-custom-detection-pattern :: concept-custom-detection-pattern.md :: Custom-detection pattern (preset → "custom" on edit)
@concept-custom-element-action-props :: concept-custom-element-action-props.md :: Action-chain props (consumer-supplied event handlers)
@concept-custom-element-black-box :: concept-custom-element-black-box.md :: Custom element black-box contract
@concept-custom-element-cache :: concept-custom-element-cache.md :: Custom element cache invalidation
@concept-custom-element-error-boundary :: concept-custom-element-error-boundary.md :: Custom element error boundary
@concept-custom-element-prop-cascade :: concept-custom-element-prop-cascade.md :: `$prop` cascade in nested custom elements
@concept-custom-element-repeat :: concept-custom-element-repeat.md :: Custom elements under `repeat`
@concept-custom-elements :: concept-custom-elements.md :: Custom elements (Layer 3)
@concept-custom-jwt-provider :: concept-custom-jwt-provider.md :: Custom JWT provider response mapping
@concept-customize-action :: concept-customize-action.md :: Customize — write a custom action
@concept-customize-cli-lint-rule :: concept-customize-cli-lint-rule.md :: Customize — custom CLI lint rule (NOT extensible in v0.1)
@concept-customize-expression-handler :: concept-customize-expression-handler.md :: Customize — custom expression handler (NOT extensible in v0.1)
@concept-customize-plugin :: concept-customize-plugin.md :: Customize — custom plugin (auth-style)
@concept-customize-server-middleware :: concept-customize-server-middleware.md :: Customize — custom server middleware (`mythik-server`)
@concept-customize-spec-store :: concept-customize-spec-store.md :: Customize — write a custom `SpecStore`
@concept-customize-validator-rule :: concept-customize-validator-rule.md :: Customize — custom validator rule (NOT extensible in v0.1)
@concept-customize-versioned-store :: concept-customize-versioned-store.md :: Customize — custom `VersionedSpecStore`
@concept-data-sources :: concept-data-sources.md :: `dataSources` — reactive GET fetching
@concept-data-sources-lifecycle :: concept-data-sources-lifecycle.md :: DataSources lifecycle (mount, deps, skip-on-undefined)
@concept-debugging-runtime-pointers :: concept-debugging-runtime-pointers.md :: Debugging runtime — source-file pointers
@concept-derive :: concept-derive.md :: `derive` — derived state
@concept-derive-datasources-mount-order :: concept-derive-datasources-mount-order.md :: Derive + DataSources mount ordering
@concept-dna-seeds :: concept-dna-seeds.md :: DNA seeds — 8 inputs that derive everything
@concept-editor-commit :: concept-editor-commit.md :: editorCommit action
@concept-editor-save :: concept-editor-save.md :: editorSave action
@concept-editor-sessions :: concept-editor-sessions.md :: Editor sessions
@concept-element-children-slot :: concept-element-children-slot.md :: `"$children"` slot in custom element render trees
@concept-element-definition :: concept-element-definition.md :: `ElementDefinition` shape
@concept-element-key :: concept-element-key.md :: Element `key` — forced remount
@concept-element-prop-definition :: concept-element-prop-definition.md :: `PropDefinition` — declaring custom element props
@concept-element-properties :: concept-element-properties.md :: Element Properties (full catalogue)
@concept-element-render-node :: concept-element-render-node.md :: `ElementRenderNode` — render tree
@concept-element-variants :: concept-element-variants.md :: Custom element variants — `ElementDefinition.variants`
@concept-environment-store :: concept-environment-store.md :: EnvironmentStore — version pointers
@concept-export-action :: concept-export-action.md :: Export — CSV + adapters
@concept-expression-contexts :: concept-expression-contexts.md :: Expression Resolution Contexts (where each expression works)
@concept-expression-timing :: concept-expression-timing.md :: Expression Resolution Timing (eager vs lazy)
@concept-fetch-interceptors :: concept-fetch-interceptors.md :: Fetch interceptors
@concept-file-upload-overview :: concept-file-upload-overview.md :: File upload — overview
@concept-fire-and-forget :: concept-fire-and-forget.md :: `fireAndForget` — background action dispatch
@concept-font-loading :: concept-font-loading.md :: Font loading — project responsibility
@concept-form-state-paths :: concept-form-state-paths.md :: Form state paths — `/ui/forms/{id}/*`
@concept-forms :: concept-forms.md :: `forms` — declarative form validation
@concept-identity-accent-application :: concept-identity-accent-application.md :: `identity.accentApplication` — where accent appears
@concept-identity-animations :: concept-identity-animations.md :: `identity.animations` — cascade level 1
@concept-identity-border-elevation-override :: concept-identity-border-elevation-override.md :: Identity border + elevation overrides
@concept-identity-color-scheme :: concept-identity-color-scheme.md :: `identity.colorScheme` - surface polarity
@concept-identity-color-weight :: concept-identity-color-weight.md :: `identity.colorWeight` — where color appears
@concept-identity-glass-rn :: concept-identity-glass-rn.md :: Glass surface on React Native — BlurView
@concept-identity-gradients :: concept-identity-gradients.md :: `identity.gradients` — gradient text + buttons
@concept-identity-heading-color :: concept-identity-heading-color.md :: `identity.headingColor`
@concept-identity-helpers :: concept-identity-helpers.md :: Identity helpers — resolve API
@concept-identity-icons :: concept-identity-icons.md :: `identity.icons` — icon defaults
@concept-identity-images :: concept-identity-images.md :: `identity.images` — image defaults
@concept-identity-label-style :: concept-identity-label-style.md :: `identity.labelStyle` — form label formatting
@concept-identity-overview :: concept-identity-overview.md :: Identity system - overview
@concept-identity-radius-pattern :: concept-identity-radius-pattern.md :: `identity.radiusPattern` — 11 corner options
@concept-identity-surface :: concept-identity-surface.md :: `identity.surface` — 6 surface types
@concept-identity-text-decoration :: concept-identity-text-decoration.md :: `identity.textDecoration` — heading effects (multi-select)
@concept-identity-typography-hierarchy :: concept-identity-typography-hierarchy.md :: `identity.typographyHierarchy` — 6 heading scales
@concept-initial-actions :: concept-initial-actions.md :: `initialActions` — mount-time actions
@concept-interactive-states :: concept-interactive-states.md :: Interactive states — hover / active / focus / transition
@concept-keyframe-snapshot :: concept-keyframe-snapshot.md :: `KeyframeSnapshot` schema
@concept-layer-background :: concept-layer-background.md :: `tokens.identity.background` — LayerBackground v2
@concept-motion-field :: concept-motion-field.md :: `motion` field (legacy Framer-Motion)
@concept-mount-spec-runtime :: concept-mount-spec-runtime.md :: `mountSpecRuntime` — internal mount helper
@concept-mythik-renderer :: concept-mythik-renderer.md :: `MythikRenderer` - root mount
@concept-navigation :: concept-navigation.md :: Navigation config
@concept-navigation-dirty-guard :: concept-navigation-dirty-guard.md :: Navigation dirty guard
@concept-package-layout :: concept-package-layout.md :: Package layout
@concept-path-references :: concept-path-references.md :: `$path` references inside variants
@concept-pattern-primitives :: concept-pattern-primitives.md :: Pattern primitives (background `pattern` kind)
@concept-preset-dropdown-pattern :: concept-preset-dropdown-pattern.md :: Preset dropdown pattern (`$bindState` + `$state`)
@concept-presets :: concept-presets.md :: Presets — `PresetDefinition`
@concept-primitive-prop-schemas :: concept-primitive-prop-schemas.md :: `PRIMITIVE_PROP_SCHEMAS` — primitive metadata
@concept-primitives-overview :: concept-primitives-overview.md :: Primitives — overview
@concept-promote-gate :: concept-promote-gate.md :: Promote gate — cross-env validation
@concept-prop-cascade :: concept-prop-cascade.md :: `$prop` cascade — Layer 3 propagation
@concept-public-package-names :: concept-public-package-names.md :: Public package names
@concept-query-envelope :: concept-query-envelope.md :: Query response envelope
@concept-reduced-motion :: concept-reduced-motion.md :: Reduced motion — a11y policy
@concept-register-presets :: concept-register-presets.md :: `plugins.registerPresets`
@concept-render-error-visibility :: concept-render-error-visibility.md :: Render error visibility
@concept-repeat :: concept-repeat.md :: `repeat` — render an element per item
@concept-repeat-grouped :: concept-repeat-grouped.md :: `repeat.groupBy` — grouped lists
@concept-repeat-selection :: concept-repeat-selection.md :: `repeat.selection` — multi-select pattern
@concept-role-access :: concept-role-access.md :: Access control — `roleAccess` vs ScreenDefinition.roles
@concept-rollback :: concept-rollback.md :: Rollback — `executeRollback`
@concept-rules-catalog :: concept-rules-catalog.md :: Rules catalog - pointer to the 256 numbered rules
@concept-screen-definition :: concept-screen-definition.md :: ScreenDefinition — per-screen metadata
@concept-screen-outlet :: concept-screen-outlet.md :: `screen-outlet` — nested screen content slot
@concept-session-persistence :: concept-session-persistence.md :: Session persistence — local / session / memory
@concept-shape-animations :: concept-shape-animations.md :: `useShapeAnimations` — Layer 3 SVG animations
@concept-skeleton-auto :: concept-skeleton-auto.md :: Auto-skeleton — zero-config loading state
@concept-skeleton-manual :: concept-skeleton-manual.md :: Manual skeleton — `type: "skeleton"` element
@concept-source-of-truth-references :: concept-source-of-truth-references.md :: Source-of-truth references
@concept-source-reading-misleading :: concept-source-reading-misleading.md :: When source-reading is the wrong tool
@concept-spatial-map-editor :: concept-spatial-map-editor.md :: Spatial-map editor workflow
@concept-spatial-map-zones :: concept-spatial-map-zones.md :: Spatial-map zones and polygon editing
@concept-spec-engine :: concept-spec-engine.md :: `SpecEngine` - patch / validate / save flow
@concept-spec-store-interface :: concept-spec-store-interface.md :: `SpecStore` interface — 4 methods
@concept-spec-store-layering :: concept-spec-store-layering.md :: SpecStore layering - `save` vs `saveVersion` vs CLI patch
@concept-spec-stores-catalog :: concept-spec-stores-catalog.md :: Spec stores catalog
@concept-spec-structure :: concept-spec-structure.md :: Spec Structure (Flat Tree)
@concept-spec-types :: concept-spec-types.md :: Spec Types — Screen vs App vs Api
@concept-state-change-animation :: concept-state-change-animation.md :: `stateChange` — state-driven animation
@concept-state-policies :: concept-state-policies.md :: State policies — preserve / reset / reload
@concept-state-protection :: concept-state-protection.md :: State protection — protected paths
@concept-storage-adapter :: concept-storage-adapter.md :: StorageAdapter (host-app)
@concept-storage-custom-names :: concept-storage-custom-names.md :: Storage — custom table names + identifier safety
@concept-storage-evolution :: concept-storage-evolution.md :: Storage — schema evolution policy
@concept-storage-idempotency :: concept-storage-idempotency.md :: Storage — idempotency requirement
@concept-storage-overview :: concept-storage-overview.md :: Storage setup — three tables
@concept-storage-postgres-jsonb :: concept-storage-postgres-jsonb.md :: Storage — Postgres `jsonb` requirement
@concept-storage-postgres-triggers :: concept-storage-postgres-triggers.md :: Storage — Postgres triggers for `screens`
@concept-storage-table-environments :: concept-storage-table-environments.md :: Storage — Table 2 `screen_environments`
@concept-storage-table-screens :: concept-storage-table-screens.md :: Storage — Table 0 `screens`
@concept-storage-table-versions :: concept-storage-table-versions.md :: Storage — Table 1 `screen_versions`
@concept-storage-verification :: concept-storage-verification.md :: Storage — post-apply verification
@concept-template-children-marker :: concept-template-children-marker.md :: `"$children"` — template children slot
@concept-template-interpolation :: concept-template-interpolation.md :: `$template` interpolation contract
@concept-templates :: concept-templates.md :: `templates` — reusable element definitions
@concept-templates-vs-variants :: concept-templates-vs-variants.md :: Templates vs Variants — decision table
@concept-token-categories :: concept-token-categories.md :: Token categories — `$token` paths
@concept-token-system :: concept-token-system.md :: Token system — three-layer resolution
@concept-transaction-phase-timing :: concept-transaction-phase-timing.md :: Transaction phase timing
@concept-transaction-rollback :: concept-transaction-rollback.md :: Transaction rollback semantics
@concept-transaction-snapshot :: concept-transaction-snapshot.md :: Transaction snapshot — internal mechanism
@concept-transactions :: concept-transactions.md :: Transactions — optimistic CRUD with rollback
@concept-validation-checks :: concept-validation-checks.md :: Inline validation `checks`
@concept-validators-catalog :: concept-validators-catalog.md :: Validators catalog
@concept-versioned-store :: concept-versioned-store.md :: VersionedSpecStore — snapshots + patch chain
@concept-versioning-snapshots-patches :: concept-versioning-snapshots-patches.md :: Versioning — snapshots + patch chain
@concept-visibility :: concept-visibility.md :: `visible` — show/hide condition
@concept-web-only-recipes :: concept-web-only-recipes.md :: `WEB_ONLY_RECIPES`
@concept-where-to-look :: concept-where-to-look.md :: Where-to-Look — source navigation map (overview)

## Expressions (22)

@expression-and-or-not :: expression-and-or-not.md :: `$and` / `$or` / `$not` — boolean logic
@expression-array :: expression-array.md :: `$array` — array operations
@expression-auth :: expression-auth.md :: `$auth` — authenticated user data
@expression-binditem :: expression-binditem.md :: `$bindItem` — two-way binding to repeat item
@expression-bindstate :: expression-bindstate.md :: `$bindState` — two-way binding
@expression-breakpoint :: expression-breakpoint.md :: `$breakpoint` — responsive value
@expression-computed :: expression-computed.md :: `$computed` — registered function
@expression-cond :: expression-cond.md :: `$cond` / `$then` / `$else` — conditional value
@expression-date :: expression-date.md :: `$date` — date operations
@expression-format :: expression-format.md :: `$format` — value formatting
@expression-group :: expression-group.md :: `$group` — group context (inside groupBy)
@expression-i18n :: expression-i18n.md :: `$i18n` — translation key
@expression-item-index :: expression-item-index.md :: `$item` / `$index` — repeat context
@expression-let-ref :: expression-let-ref.md :: `$let` / `$ref` — named bindings
@expression-math :: expression-math.md :: `$math` — arithmetic operations
@expression-platform :: expression-platform.md :: `$platform` — cross-platform value
@expression-prop :: expression-prop.md :: `$prop` — template/element-def prop reference
@expression-selection :: expression-selection.md :: `$selection` — selection state (inside repeat.selection)
@expression-state :: expression-state.md :: `$state` — read from state
@expression-switch :: expression-switch.md :: `$switch` — multi-branch conditional
@expression-template :: expression-template.md :: `$template` — string interpolation
@expression-token :: expression-token.md :: `$token` — design system reference

## Paths (13)

@path-app-screens :: path-app-screens.md :: `/app/screens` — accessible screens
@path-data-source-paths :: path-data-source-paths.md :: DataSources auto-paths — `/{target}Loading`, `/{target}Error`, `/{target}Deferred`
@path-forms :: path-forms.md :: `/ui/forms/{id}/*` — declarative form state
@path-login :: path-login.md :: `/screens/login/*` and `/login/*`
@path-navigation :: path-navigation.md :: `/navigation/*` — navigation state
@path-presets-available :: path-presets-available.md :: `/presets/available` — registered presets
@path-tokens :: path-tokens.md :: `/tokens/raw` and `/tokens/resolved`
@path-tx-result-error :: path-tx-result-error.md :: `/tx/result` and `/tx/error` — transaction state
@path-ui-device :: path-ui-device.md :: `/ui/device/*` — auto-tracked device context
@path-ui-loading-error :: path-ui-loading-error.md :: `/ui/loading` and `/ui/lastError`
@path-ui-modals-drawers :: path-ui-modals-drawers.md :: `/ui/modals/{id}` and `/ui/drawers/{id}`
@path-ui-selected-row :: path-ui-selected-row.md :: `/ui/selectedRow` — table row magic path
@path-uploads :: path-uploads.md :: `/ui/uploads/*` — internal upload state

## Patterns (18)

@pattern-cross-screen-data-flow :: pattern-cross-screen-data-flow.md :: Pattern — Cross-screen data flow
@pattern-fetch-vs-datasources :: pattern-fetch-vs-datasources.md :: Pattern — `fetch` vs `dataSources` decision
@pattern-file-upload-auto :: pattern-file-upload-auto.md :: Pattern — Auto-upload (autoUpload: true)
@pattern-file-upload-manual :: pattern-file-upload-manual.md :: Pattern — Manual upload (autoUpload: false)
@pattern-form-validation :: pattern-form-validation.md :: Pattern — Form validation overview
@pattern-form-validation-cross-field :: pattern-form-validation-cross-field.md :: Pattern — Cross-field validation (`derive` + `requiredIf`)
@pattern-fullstack-coherence :: pattern-fullstack-coherence.md :: Pattern — Fullstack coherence (API + Frontend)
@pattern-git-vs-db-versioning :: pattern-git-vs-db-versioning.md :: Pattern — Git-backed vs DB-versioned history
@pattern-identity-aware-spec :: pattern-identity-aware-spec.md :: Pattern — Identity-aware spec
@pattern-loading-content-empty :: pattern-loading-content-empty.md :: Pattern — Loading / Content / Empty / Error
@pattern-login-body-template :: pattern-login-body-template.md :: Pattern — `loginBody` (email→username mapping)
@pattern-login-screen :: pattern-login-screen.md :: Pattern — Login screen
@pattern-push-vs-patch :: pattern-push-vs-patch.md :: Pattern - Push vs Patch (file-first vs DB-first)
@pattern-reusable-components :: pattern-reusable-components.md :: Pattern — Reusable components (templates + variants)
@pattern-tx-create :: pattern-tx-create.md :: Pattern — CREATE transaction
@pattern-tx-delete :: pattern-tx-delete.md :: Pattern — DELETE transaction
@pattern-tx-toggle :: pattern-tx-toggle.md :: Pattern — TOGGLE transaction
@pattern-tx-update :: pattern-tx-update.md :: Pattern — UPDATE transaction

## Primitives (38)

@primitive-accordion :: primitive-accordion.md :: `accordion` — collapsible section
@primitive-area-chart :: primitive-area-chart.md :: `area-chart`
@primitive-audio-player :: primitive-audio-player.md :: `audio-player`
@primitive-bar-chart :: primitive-bar-chart.md :: `bar-chart`
@primitive-box :: primitive-box.md :: `box` — generic container
@primitive-button :: primitive-button.md :: `button`
@primitive-camera :: primitive-camera.md :: `camera` — capture from camera
@primitive-checkbox :: primitive-checkbox.md :: `checkbox`
@primitive-divider :: primitive-divider.md :: `divider` — visual separator
@primitive-drawer :: primitive-drawer.md :: `drawer` — side panel overlay
@primitive-file-upload :: primitive-file-upload.md :: `file-upload`
@primitive-grid :: primitive-grid.md :: `grid` — CSS grid container
@primitive-icon :: primitive-icon.md :: `icon` — icon glyph
@primitive-image :: primitive-image.md :: `image` — image
@primitive-input :: primitive-input.md :: `input` — text input
@primitive-kanban-board :: primitive-kanban-board.md :: `kanban-board`
@primitive-line-chart :: primitive-line-chart.md :: `line-chart`
@primitive-list :: primitive-list.md :: `list` — list container
@primitive-modal :: primitive-modal.md :: `modal` — overlay dialog
@primitive-pie-chart :: primitive-pie-chart.md :: `pie-chart`
@primitive-screen :: primitive-screen.md :: `screen` — top-level screen wrapper
@primitive-screen-outlet :: primitive-screen-outlet.md :: `screen-outlet` — nested screen content slot
@primitive-scroll :: primitive-scroll.md :: `scroll` — scrollable container
@primitive-select :: primitive-select.md :: `select` — dropdown
@primitive-signature :: primitive-signature.md :: `signature` — signature pad
@primitive-skeleton :: primitive-skeleton.md :: `skeleton` — loading placeholder
@primitive-slider :: primitive-slider.md :: `slider` — numeric range
@primitive-spacer :: primitive-spacer.md :: `spacer` — empty space
@primitive-spatial-map :: primitive-spatial-map.md :: Primitive - spatial-map
@primitive-stack :: primitive-stack.md :: `stack` — flexbox container
@primitive-table :: primitive-table.md :: `table`
@primitive-tabs :: primitive-tabs.md :: `tabs`
@primitive-text :: primitive-text.md :: `text` — text content
@primitive-textarea :: primitive-textarea.md :: `textarea` — multi-line text input
@primitive-toast-container :: primitive-toast-container.md :: `toast-container` — toast positioning override
@primitive-toggle :: primitive-toggle.md :: `toggle` — boolean switch
@primitive-touchable :: primitive-touchable.md :: `touchable` — invisible tap area
@primitive-wizard :: primitive-wizard.md :: `wizard` — multi-step flow
