# Changelog

All notable public changes to Mythik are documented in this file.

## 0.1.0

Initial public release.

- Published the public npm package surface: `mythik`, `mythik-react`, `mythik-cli`, `mythik-server`, and `mythik-react-native`.
- Added the core spec runtime, state store, expression engine, action dispatcher, validation rules, spec stores, versioning, and editor session infrastructure.
- Added the React runtime with `MythikApp`, built-in primitives, app navigation, auth integration, forms, data sources, transactions, uploads, exports, and runtime diagnostics.
- Added the `spatial-map` primitive for generic SVG-based spatial editors, including selection, item and zone editing, snap/guides, resize/rotate, polygon zone editing, and JSON-first persistence hooks.
- Added the CLI write gate for safe spec workflows: manifest inspection, element inspection, push, patch, validate, lint, history, rollback, promotion, and programmatic API support.
- Added the declarative REST server package for `ApiSpec`-driven endpoints, auth policy, catalogs, CRUD, row-level scope, and server validation.
- Documented React Native as preview while the web, CLI, core, and server packages are the primary public surface.
