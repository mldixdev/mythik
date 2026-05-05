# mythik-react

React renderer and app shell for Mythik specs.

## Install

```bash
npm install mythik mythik-react
```

## What It Provides

- `MythikRenderer` for rendering a single screen spec.
- `MythikApp` for AppSpec-driven multi-screen apps.
- React context helpers for app integrations.
- Built-in React primitive registry with 38 primitives.
- `spatial-map`, a generic SVG/data-first primitive for spatial editors.
- Icon renderer hookup through `MythikApp.onPlugins` and `plugins.setIconRenderer`.
- Auth provider convenience re-exports sourced from core.

## Basic Usage

```tsx
import { MemorySpecStore, type AppSpec, type Spec } from 'mythik';
import { MythikApp } from 'mythik-react';

const appSpec: AppSpec = {
  type: 'app',
  name: 'Demo',
  navigation: {
    type: 'tabs',
    initialScreen: 'home',
  },
  screens: {
    home: { label: 'Home' },
  },
  layout: {
    root: 'app-shell',
    elements: {
      'app-shell': {
        type: 'box',
        props: { style: { minHeight: '100vh', padding: 24 } },
        children: ['outlet'],
      },
      outlet: {
        type: 'screen-outlet',
      },
    },
  },
};

const homeSpec: Spec = {
  root: 'root',
  elements: {
    root: {
      type: 'text',
      props: { content: 'Hello from Mythik' },
    },
  },
};

const specStore = new MemorySpecStore({
  home: homeSpec,
});

export function App() {
  return <MythikApp appSpec={appSpec} specStore={specStore} />;
}
```

## Spatial Editors

The `spatial-map` primitive supports generic map-like authoring surfaces: floor plans, seating charts, warehouse layouts, hospital beds, parking maps, and similar workflows.

It provides SVG rendering, item and zone selection, canvas press context, drag and keyboard editing, snap/guides, resize/rotate, polygon zone editing, and JSON-first persistence hooks. Domain-specific UI such as inspectors and menus is composed with normal Mythik primitives outside the map.

## License

Apache-2.0.

## Status

v0.1.1 public release. React Native work remains a repository preview track and is not part of the initial npm publish surface.
