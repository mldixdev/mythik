# mythik-react-native

The React Native rendering surface for Mythik — **preview track,
not on npm**. The `v0.1.1` public release ships `mythik-react` as the
supported renderer; this package is in active development at a
verification bar below the published packages.

> See [the framework README on GitHub](https://github.com/mldixdev/mythik#readme)
> for the full Mythik architecture and design philosophy.

---

## What Mythik is, briefly

Mythik is an **AI-first, spec-driven framework**. Every UI screen
lives as a JSON spec in a database — not a `.tsx` file in a repo.
Apps grow by adding rows, not files. Specs are validated atomically,
versioned automatically, and edited by AI agents through a CLI. This
package aims to bring the same model to React Native, so a single
spec can render to web (via `mythik-react`) and to mobile.

## Why this isn't on npm yet

The published packages (`mythik`, `mythik-react`, `mythik-cli`,
`mythik-server`) clear a verification bar: type-checked,
integration-tested, and exercised against real consumers. React
Native rendering hasn't reached that bar yet — gradients, motion
entrance effects, animated blobs, and a few other primitives still
need RN-specific implementations (typically via libraries like
`expo-linear-gradient`) before the package can claim the same
guarantees.

Publishing it now would dilute what `v0.1.1` means. The preview lives
in this repository so motivated contributors and early adopters can
experiment, file issues, and feed back into the design — without the
publish step pretending readiness it doesn't have.

## What it aims to provide

When the verification bar is reached, this package will give you:

- A React Native renderer that consumes Mythik specs
- A native primitive registry covering the same surface as
  `mythik-react`
- Navigation integration for React Native navigation libraries
- CSS-to-native style translation for the web-style properties
  Mythik specs already use
- Platform-aware animation and runtime helpers

The intent: **a single spec renders to both web and mobile**. The
host file changes (different navigation, different platform APIs)
but the screens, AppSpec, validation rules, action chains, and
contract are shared.

## Recommended path for now

For production Mythik apps on `v0.1.1`, install:

```bash
npm install mythik mythik-react
```

For local experimentation with React Native, clone this repository
and work against the preview directly.

## Related packages

- [`mythik`](https://github.com/mldixdev/mythik/tree/main/packages/core#readme) — the runtime any renderer consumes
- [`mythik-react`](https://github.com/mldixdev/mythik/tree/main/packages/react#readme) — the web renderer (production-ready, on npm)
- [`mythik-cli`](https://github.com/mldixdev/mythik/tree/main/packages/cli#readme) — author and patch specs
- [`mythik-server`](https://github.com/mldixdev/mythik/tree/main/packages/server#readme) — declarative REST server from an `ApiSpec`

## Status

Preview track. Not on npm. APIs and primitive coverage will shift as
the package approaches the published verification bar.

## License

Apache-2.0.
