import type { PluginLoader, RenderNode } from 'mythik';
import React from 'react';

// Layout
import { Box } from './box.js';
import { Stack } from './stack.js';
import { Grid } from './grid.js';
import { Scroll } from './scroll.js';
import { Divider } from './divider.js';
import { Spacer } from './spacer.js';

// Text/Media
import { Text } from './text.js';
import { Image } from './image.js';
import { Icon } from './icon.js';

// Form
import { Input } from './input.js';
import { Textarea } from './textarea.js';
import { Select } from './select.js';
import { Checkbox } from './checkbox.js';
import { Toggle } from './toggle.js';
import { Slider } from './slider.js';
import { Button } from './button.js';

// Interactive
import { Touchable } from './touchable.js';
import { List } from './list.js';
import { Modal } from './modal.js';
import { Drawer } from './drawer.js';
import { Tabs } from './tabs.js';
import { Accordion } from './accordion.js';
import { Wizard } from './wizard.js';

// App structure
import { Screen } from './screen.js';
import { ScreenOutlet } from './screen-outlet.js';
import { ToastContainer } from './toast-container.js';
import { Skeleton } from './skeleton.js';

/** Map of primitive name → React Native component (27 primitives) */
const PRIMITIVES: Record<string, React.ComponentType<Record<string, unknown>>> = {
  // Layout
  box: Box as React.ComponentType<Record<string, unknown>>,
  stack: Stack as React.ComponentType<Record<string, unknown>>,
  grid: Grid as React.ComponentType<Record<string, unknown>>,
  scroll: Scroll as React.ComponentType<Record<string, unknown>>,
  divider: Divider as React.ComponentType<Record<string, unknown>>,
  spacer: Spacer as React.ComponentType<Record<string, unknown>>,
  // Text/Media
  text: Text as React.ComponentType<Record<string, unknown>>,
  image: Image as React.ComponentType<Record<string, unknown>>,
  icon: Icon as React.ComponentType<Record<string, unknown>>,
  // Form
  input: Input as React.ComponentType<Record<string, unknown>>,
  textarea: Textarea as React.ComponentType<Record<string, unknown>>,
  select: Select as React.ComponentType<Record<string, unknown>>,
  checkbox: Checkbox as React.ComponentType<Record<string, unknown>>,
  toggle: Toggle as React.ComponentType<Record<string, unknown>>,
  slider: Slider as React.ComponentType<Record<string, unknown>>,
  button: Button as React.ComponentType<Record<string, unknown>>,
  // Interactive
  touchable: Touchable as React.ComponentType<Record<string, unknown>>,
  list: List as React.ComponentType<Record<string, unknown>>,
  modal: Modal as React.ComponentType<Record<string, unknown>>,
  drawer: Drawer as React.ComponentType<Record<string, unknown>>,
  tabs: Tabs as React.ComponentType<Record<string, unknown>>,
  accordion: Accordion as React.ComponentType<Record<string, unknown>>,
  wizard: Wizard as React.ComponentType<Record<string, unknown>>,
  // App structure
  screen: Screen as React.ComponentType<Record<string, unknown>>,
  'screen-outlet': ScreenOutlet as React.ComponentType<Record<string, unknown>>,
  'toast-container': ToastContainer as unknown as React.ComponentType<Record<string, unknown>>,
  skeleton: Skeleton as React.ComponentType<Record<string, unknown>>,
};

/**
 * Register all built-in React Native primitives with the plugin loader.
 * Each primitive converts (props, children: RenderNode[]) → RenderNode
 * where the RenderNode carries the React component reference.
 *
 * Same pattern as mythik-react's registerReactPrimitives.
 */
export function registerReactNativePrimitives(plugins: PluginLoader): void {
  for (const [name, Component] of Object.entries(PRIMITIVES)) {
    plugins.registerPrimitive(name, (props: Record<string, unknown>, children: RenderNode[]) => ({
      type: name,
      props: { ...props, _component: Component },
      children,
    }));
  }
}

export { PRIMITIVES };

// Re-export all primitives for direct import
export { Box, Stack, Grid, Scroll, Divider, Spacer };
export { Text, Image, Icon };
export { Input, Textarea, Select, Checkbox, Toggle, Slider, Button };
export { Touchable, List, Modal, Drawer, Tabs, Accordion, Wizard };
export { Screen, ScreenOutlet, ToastContainer, Skeleton };
