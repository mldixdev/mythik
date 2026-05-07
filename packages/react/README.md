# mythik-react

The React rendering surface for Mythik. Turns JSON specs into rendered
UI: mount a multi-screen app via `MythikApp`, or embed a single spec
via `MythikRenderer`. Both consume the same spec format and resolve
expressions, actions, and primitives at render time.

> See [the framework README on GitHub](https://github.com/mldixdev/mythik#readme)
> for the full Mythik architecture and design philosophy. This file
> documents what `mythik-react` gives you and how to use it.

---

## What Mythik is, briefly

Mythik is an **AI-first, spec-driven framework**. Every UI screen
lives as a JSON spec in a database — not a `.tsx` file in a repo.
Apps grow by adding rows, not files. The framework validates every
change atomically and versions everything automatically, so your
favorite AI agent can author and patch specs through the CLI without
human supervision in the loop. This package is the React rendering
surface — it turns those specs into a real UI.

## Install

```bash
npm install mythik mythik-react
```

`mythik` is a peer dependency: it ships the spec types, validators,
and runtime engines. `mythik-react` adds the React renderer on top.

## What you get

- **`<MythikApp>`** — full multi-screen app shell. Reads an `AppSpec`
  (navigation, screens, theme, app-level layout) plus a `SpecStore`
  and renders the active screen, handles navigation, manages auth
  context, and coordinates editor sessions.

- **`<MythikRenderer>`** — single-spec renderer for embedding Mythik
  inside an existing React app. Useful for islands and demos where
  you don't need the full app shell.

- **38 built-in primitives** — form fields, layout, lists, modals,
  charts, and more. Each primitive maps a spec `type` value (e.g.
  `"button"`) to a React component with a strict prop schema. See
  `ai-context-primitives.md` (bundled in the `mythik` package) for
  the full catalog.

- **Customization hooks** — register custom primitives, expressions,
  and action handlers via `MythikApp.onPlugins`. The icon renderer is
  hookable via `plugins.setIconRenderer`.

- **Auth provider re-exports** — convenience surface sourced from
  `mythik` core, so your app can import everything auth-related from
  one place.

## Minimal example

A two-screen app, all behavior described in JSON:

```tsx
import { MemorySpecStore, type AppSpec, type Spec } from 'mythik';
import { MythikApp } from 'mythik-react';

const appSpec: AppSpec = {
  type: 'app',
  name: 'Demo App',
  navigation: { type: 'tabs', initialScreen: 'home' },
  screens: {
    home:    { label: 'Home' },
    profile: { label: 'Profile' },
  },
  layout: {
    root: 'app-shell',
    elements: {
      'app-shell': {
        type: 'box',
        props: { style: { minHeight: '100vh', padding: 24 } },
        children: ['outlet'],
      },
      outlet: { type: 'screen-outlet' },
    },
  },
};

const homeSpec: Spec = {
  root: 'root',
  elements: {
    root: {
      type: 'box',
      props: { style: { padding: 24 } },
      children: ['title', 'go-profile'],
    },
    title: {
      type: 'text',
      props: { content: 'Hello from Mythik', variant: 'heading' },
    },
    'go-profile': {
      type: 'button',
      props: { label: 'View profile' },
      on: { press: [{ action: 'navigateScreen', params: { screen: 'profile' } }] },
    },
  },
};

const profileSpec: Spec = {
  root: 'root',
  elements: {
    root: { type: 'text', props: { content: 'Profile screen' } },
  },
};

const specStore = new MemorySpecStore({
  home: homeSpec,
  profile: profileSpec,
});

export default function App() {
  return <MythikApp appSpec={appSpec} specStore={specStore} />;
}
```

Replace `MemorySpecStore` with `SupabaseSpecStore` (or
`SqlServerSpecStore` from `mythik/server`) to back the same code with
a real database. The host file does not change as the app grows from
2 screens to 200.

## How the renderer works

When `MythikApp` mounts:

1. It loads the active spec from the `SpecStore`.
2. It walks the spec's element tree starting from `root`.
3. For each element, it instantiates the React component registered
   for that element's `type` value (built-in primitive or custom).
4. It resolves `$token`, `$state`, `$template`, and other expressions
   at render time, against the current state and AppSpec tokens.
5. It wires `on` action handlers to the action dispatcher.
6. When state changes or a new spec version arrives, only affected
   subtrees re-render.

The renderer's contract: same spec + same plugins + same state =
identical render. This determinism is what lets AI agents iterate on
specs with confidence.

## Customization

Register custom primitives, expressions, and action handlers through
the plugin hook:

```tsx
<MythikApp
  appSpec={appSpec}
  specStore={specStore}
  onPlugins={(plugins) => {
    plugins.registerPrimitive('my-custom-card', MyCustomCard);
    plugins.registerExpression('uppercase', (args, ctx) => String(args[0]).toUpperCase());
    plugins.registerAction('analyticsTrack', async (params) => { /* ... */ });
    plugins.setIconRenderer(MyIconRenderer);
  }}
/>
```

Custom primitives become available as a `type` value in any spec
loaded from your store. Custom expressions and actions can be
referenced from any spec. Use these sparingly — every custom hook is
code that lives outside the spec store and outside the version-control
audit trail.

## Related packages

- [`mythik`](https://github.com/mldixdev/mythik/tree/main/packages/core#readme) — the runtime this renderer consumes (peer dependency)
- [`mythik-cli`](https://github.com/mldixdev/mythik/tree/main/packages/cli#readme) — author and patch the specs you're rendering
- [`mythik-server`](https://github.com/mldixdev/mythik/tree/main/packages/server#readme) — declarative REST server from an `ApiSpec`

## Status

`v0.1.2` public release. React Native work remains a repository
preview track and is not part of the initial npm publish surface.

## License

Apache-2.0.
