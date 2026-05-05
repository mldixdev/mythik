import { describe, it, expect } from 'vitest';
import { generateManifest } from '../../src/spec-engine/manifest.js';
import type { Spec } from '../../src/types.js';

const simpleSpec: Spec = {
  root: 'page',
  elements: {
    page: {
      type: 'stack',
      props: { direction: 'vertical' },
      children: ['title', 'btn'],
    },
    title: {
      type: 'text',
      props: { content: 'Hello' },
    },
    btn: {
      type: 'button',
      props: { label: 'Click' },
      on: { press: { action: 'navigate', params: { screen: 'next' } } },
    },
  },
};

const specWithRepeatAndVisibility: Spec = {
  root: 'page',
  initialActions: [
    { action: 'fetch', params: { url: 'https://api.test/items', method: 'GET', target: '/items' } },
  ],
  elements: {
    page: {
      type: 'stack',
      props: {},
      children: ['list', 'empty'],
    },
    list: {
      type: 'stack',
      props: {},
      repeat: { statePath: '/items', key: 'id' },
      children: ['row'],
    },
    row: {
      type: 'box',
      props: {},
      children: ['label', 'delete-btn'],
    },
    label: {
      type: 'text',
      props: { content: { $item: 'name' } },
    },
    'delete-btn': {
      type: 'button',
      props: { label: 'Delete' },
      on: { press: { action: 'setState', params: { statePath: '/deleteId', value: { $item: 'id' } } } },
    },
    empty: {
      type: 'text',
      props: { content: 'No items' },
      visible: { $not: { $array: 'count', source: { $state: '/items' } } },
    },
  },
};

describe('generateManifest', () => {
  it('generates tree with element count and root', () => {
    const manifest = generateManifest(simpleSpec);
    expect(manifest).toContain('screen: page (3 elements)');
    expect(manifest).toContain('root: page (stack)');
  });

  it('shows parent-child relationships with tree characters', () => {
    const manifest = generateManifest(simpleSpec);
    expect(manifest).toContain('├── title (text)');
    expect(manifest).toContain('└── btn (button)');
  });

  it('annotates elements with on events', () => {
    const manifest = generateManifest(simpleSpec);
    expect(manifest).toContain('btn (button) → on:press');
  });

  it('annotates repeat with statePath', () => {
    const manifest = generateManifest(specWithRepeatAndVisibility);
    expect(manifest).toContain('list (stack) → repeat:/items');
  });

  it('annotates visible:conditional', () => {
    const manifest = generateManifest(specWithRepeatAndVisibility);
    expect(manifest).toContain('empty (text) → visible:conditional');
  });

  it('includes initialActions summary', () => {
    const manifest = generateManifest(specWithRepeatAndVisibility);
    expect(manifest).toContain('initialActions: fetch GET → /items');
  });

  it('omits initialActions line when none exist', () => {
    const manifest = generateManifest(simpleSpec);
    expect(manifest).not.toContain('initialActions');
  });

  it('shows nested children with correct indentation', () => {
    const manifest = generateManifest(specWithRepeatAndVisibility);
    expect(manifest).toContain('│   └── row (box)');
    expect(manifest).toContain('│       ├── label (text)');
    expect(manifest).toContain('│       └── delete-btn (button)');
  });

  it('handles spec with single element (root only, no children)', () => {
    const minimal: Spec = {
      root: 'solo',
      elements: {
        solo: { type: 'box', props: {} },
      },
    };
    const manifest = generateManifest(minimal);
    expect(manifest).toContain('screen: solo (1 elements)');
    expect(manifest).toContain('root: solo (box)');
  });

  it('annotates repeat with source expression as repeat:expression', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: {
          type: 'stack',
          props: {},
          children: ['filtered-list'],
        },
        'filtered-list': {
          type: 'stack',
          props: {},
          repeat: { source: { $array: 'filter', source: { $state: '/items' }, where: { field: 'active', eq: true } }, key: 'id' },
        },
      },
    };
    const manifest = generateManifest(spec);
    expect(manifest).toContain('filtered-list (stack) → repeat:expression');
  });

  it('annotates multiple events', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: {
          type: 'stack',
          props: {},
          children: ['field'],
        },
        field: {
          type: 'input',
          props: {},
          on: {
            change: { action: 'setState', params: { statePath: '/val', value: '' } },
            press: { action: 'navigate', params: { screen: 'x' } },
          },
        },
      },
    };
    const manifest = generateManifest(spec);
    expect(manifest).toContain('field (input) → on:change,press');
  });
});
