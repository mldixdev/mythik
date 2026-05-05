import type { PluginLoader } from 'mythik';
import type { RenderNode } from 'mythik';
import React from 'react';

import { Box } from './box.js';
import { Text } from './text.js';
import { Image } from './image.js';
import { Icon } from './icon.js';
import { Stack } from './stack.js';
import { Grid } from './grid.js';
import { Scroll } from './scroll.js';
import { Divider } from './divider.js';
import { Spacer } from './spacer.js';
import { Input } from './input.js';
import { Textarea } from './textarea.js';
import { Select } from './select.js';
import { Checkbox } from './checkbox.js';
import { Toggle } from './toggle.js';
import { Slider } from './slider.js';
import { Button } from './button.js';
import { Touchable } from './touchable.js';
import { List } from './list.js';
import { Modal } from './modal.js';
import { Drawer } from './drawer.js';
import { Tabs } from './tabs.js';
import { Accordion } from './accordion.js';
import { Wizard } from './wizard.js';
import { Screen } from './screen.js';
import { BarChart } from './bar-chart.js';
import { LineChart } from './line-chart.js';
import { PieChart } from './pie-chart.js';
import { AreaChart } from './area-chart.js';
import { SpatialMap } from './spatial-map.js';
import { Table } from './table.js';
import { KanbanBoard } from './kanban-board.js';
import { FileUpload } from './file-upload.js';
import { Camera } from './camera.js';
import { Signature } from './signature.js';
import { AudioPlayer } from './audio-player.js';
import { ScreenOutlet } from './screen-outlet.js';
import { ToastContainer } from './toast-container.js';
import { Skeleton } from './skeleton.js';

/** Map of primitive name → React component */
const PRIMITIVES: Record<string, React.ComponentType<Record<string, unknown>>> = {
  box: Box as React.ComponentType<Record<string, unknown>>,
  text: Text as React.ComponentType<Record<string, unknown>>,
  image: Image as React.ComponentType<Record<string, unknown>>,
  icon: Icon as React.ComponentType<Record<string, unknown>>,
  stack: Stack as React.ComponentType<Record<string, unknown>>,
  grid: Grid as React.ComponentType<Record<string, unknown>>,
  scroll: Scroll as React.ComponentType<Record<string, unknown>>,
  divider: Divider as React.ComponentType<Record<string, unknown>>,
  spacer: Spacer as React.ComponentType<Record<string, unknown>>,
  input: Input as React.ComponentType<Record<string, unknown>>,
  textarea: Textarea as React.ComponentType<Record<string, unknown>>,
  select: Select as React.ComponentType<Record<string, unknown>>,
  checkbox: Checkbox as React.ComponentType<Record<string, unknown>>,
  toggle: Toggle as React.ComponentType<Record<string, unknown>>,
  slider: Slider as React.ComponentType<Record<string, unknown>>,
  button: Button as React.ComponentType<Record<string, unknown>>,
  touchable: Touchable as React.ComponentType<Record<string, unknown>>,
  list: List as React.ComponentType<Record<string, unknown>>,
  modal: Modal as React.ComponentType<Record<string, unknown>>,
  drawer: Drawer as React.ComponentType<Record<string, unknown>>,
  tabs: Tabs as React.ComponentType<Record<string, unknown>>,
  accordion: Accordion as React.ComponentType<Record<string, unknown>>,
  wizard: Wizard as React.ComponentType<Record<string, unknown>>,
  screen: Screen as React.ComponentType<Record<string, unknown>>,
  'bar-chart': BarChart as React.ComponentType<Record<string, unknown>>,
  'line-chart': LineChart as React.ComponentType<Record<string, unknown>>,
  'pie-chart': PieChart as React.ComponentType<Record<string, unknown>>,
  'area-chart': AreaChart as React.ComponentType<Record<string, unknown>>,
  'spatial-map': SpatialMap as unknown as React.ComponentType<Record<string, unknown>>,
  table: Table as React.ComponentType<Record<string, unknown>>,
  'kanban-board': KanbanBoard as React.ComponentType<Record<string, unknown>>,
  'file-upload': FileUpload as React.ComponentType<Record<string, unknown>>,
  camera: Camera as React.ComponentType<Record<string, unknown>>,
  signature: Signature as React.ComponentType<Record<string, unknown>>,
  'audio-player': AudioPlayer as React.ComponentType<Record<string, unknown>>,
  'screen-outlet': ScreenOutlet as React.ComponentType<Record<string, unknown>>,
  'toast-container': ToastContainer as unknown as React.ComponentType<Record<string, unknown>>,
  skeleton: Skeleton as React.ComponentType<Record<string, unknown>>,
};

/**
 * Register all built-in React primitives with the plugin loader.
 * Each primitive converts (props, children: RenderNode[]) → RenderNode
 * where the RenderNode carries the React component reference.
 */
export function registerReactPrimitives(plugins: PluginLoader): void {
  for (const [name, Component] of Object.entries(PRIMITIVES)) {
    plugins.registerPrimitive(name, (props: Record<string, unknown>, children: RenderNode[]) => ({
      type: name,
      props: { ...props, _component: Component },
      children,
    }));
  }
}

/** Primitives that accept a `className` prop for CSS-based hover/active/focus. */
export const CSS_HOVER_SUPPORTED = new Set([
  'box', 'text', 'stack', 'grid', 'scroll', 'button', 'touchable', 'table',
]);

export { PRIMITIVES };
export { Box, Text, Image, Icon, Stack, Grid, Scroll, Divider, Spacer };
export { Input, Textarea, Select, Checkbox, Toggle, Slider };
export { Button, Touchable, List };
export { Modal, Drawer, Tabs, Accordion, Wizard, Screen };
export { BarChart, LineChart, PieChart, AreaChart, SpatialMap, Table, KanbanBoard };
export { FileUpload, Camera, Signature, AudioPlayer };
export { ToastContainer };
