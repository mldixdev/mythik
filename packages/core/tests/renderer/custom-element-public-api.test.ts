import { describe, it, expect } from 'vitest';
import { createMythik } from '../../src/factory.js';
import type { Spec, RenderNode } from '../../src/types.js';

/**
 * Public-API integration tests for Layer 3 custom elements.
 *
 * Existing v46 tests in custom-element-*.test.ts exercise the render engine
 * directly (createRenderEngine + createElementRegistry, bypassing
 * createMythik + plugins.registerElement). That coverage validates
 * internal semantics but misses the public entry point consumers use.
 *
 * These tests exercise the DOCUMENTED path end-to-end:
 *   createMythik() → svc.plugins.registerElement(def) → svc.applyPlugins()
 *   → svc.engine.render(spec)
 *
 * Added as the close-session follow-up to the v47 discovery that
 * `plugins.registerElement` was documented but did not exist before 848e1a2.
 * A single test through this path would have surfaced the gap pre-merge.
 */

function mockPrimitive(type: string) {
  return (props: Record<string, unknown>, children: RenderNode[]) => ({
    type,
    props,
    children,
  });
}

function setup() {
  const svc = createMythik();
  for (const type of ['stack', 'box', 'text', 'touchable', 'icon']) {
    svc.plugins.registerPrimitive(type, mockPrimitive(type));
  }
  return svc;
}

describe('Custom elements via plugins.registerElement (public API)', () => {
  it('registers + renders a basic custom element end-to-end', () => {
    const svc = setup();
    svc.plugins.registerElement({
      type: 'greeting',
      props: { name: { type: 'string', default: 'world' } },
      render: {
        type: 'text',
        props: { content: { $prop: 'name' } },
      },
    });
    svc.applyPlugins();

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'greeting', props: { name: 'Alice' } } },
    };
    const tree = svc.engine.render(spec);
    expect(tree.type).toBe('text');
    expect(tree.props.content).toBe('Alice');
  });

  it('resolves consumer variant via props.variant (NOT top-level)', () => {
    const svc = setup();
    svc.plugins.registerElement({
      type: 'card',
      props: {
        bg: { type: 'string' },
      },
      variants: {
        primary: { props: { bg: 'blue' } },
        danger: { props: { bg: 'red' } },
      },
      render: {
        type: 'box',
        props: { style: { background: { $prop: 'bg' } } },
      },
    });
    svc.applyPlugins();

    const primary: Spec = {
      root: 'r',
      elements: { r: { type: 'card', props: { variant: 'primary' } } },
    };
    const danger: Spec = {
      root: 'r',
      elements: { r: { type: 'card', props: { variant: 'danger' } } },
    };
    const topLevelBroken: Spec = {
      root: 'r',
      elements: {
        // `variant` at top-level is silently ignored per rule 240 — consumer
        // must place it inside props. This spec exercises that behavior so
        // regressions would fail loud.
        r: { type: 'card', variant: 'primary', props: {} } as unknown as Spec['elements'][string],
      },
    };

    expect(svc.engine.render(primary).props.style).toMatchObject({ background: 'blue' });
    expect(svc.engine.render(danger).props.style).toMatchObject({ background: 'red' });
    // No variant resolved → bg prop is undefined because no default + no consumer supplied
    expect(svc.engine.render(topLevelBroken).props.style).toMatchObject({ background: undefined });
  });

  it('$prop inside style resolves with consumer + variant props', () => {
    const svc = setup();
    svc.plugins.registerElement({
      type: 'bar',
      props: {
        height: { type: 'number', default: 4 },
        bg: { type: 'string' },
      },
      variants: {
        gradient: { props: { bg: 'linear-gradient(90deg, red, blue)' } },
      },
      render: {
        type: 'box',
        props: {
          style: {
            height: { $prop: 'height' },
            background: { $prop: 'bg' },
          },
        },
      },
    });
    svc.applyPlugins();

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'bar', props: { variant: 'gradient', height: 8 } } },
    };
    const tree = svc.engine.render(spec);
    expect(tree.props.style).toMatchObject({
      height: 8, // consumer overrides default
      background: 'linear-gradient(90deg, red, blue)', // variant provides
    });
  });

  it('$children marker slots consumer children at author-specified position', () => {
    const svc = setup();
    svc.plugins.registerElement({
      type: 'framed',
      props: {},
      render: {
        type: 'stack',
        props: { direction: 'vertical' },
        children: [
          { type: 'text', props: { content: '--- top ---' } },
          '$children',
          { type: 'text', props: { content: '--- bottom ---' } },
        ],
      },
    });
    svc.applyPlugins();

    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'framed', props: {}, children: ['c1'] },
        c1: { type: 'text', props: { content: 'slotted' } },
      },
    };
    const tree = svc.engine.render(spec);
    const children = tree.children as Array<{ type: string; props: Record<string, unknown> }>;
    expect(children).toHaveLength(3);
    expect(children[0].props.content).toBe('--- top ---');
    expect(children[1].props.content).toBe('slotted');
    expect(children[2].props.content).toBe('--- bottom ---');
  });

  it('$prop at on.<event> resolves to consumer-supplied action chain', () => {
    const svc = setup();
    svc.plugins.registerElement({
      type: 'tab',
      props: {
        label: { type: 'string' },
        onSelect: { type: 'array' },
      },
      render: {
        type: 'touchable',
        props: {},
        on: { press: { $prop: 'onSelect' } },
        children: [{ type: 'text', props: { content: { $prop: 'label' } } }],
      },
    });
    svc.applyPlugins();

    const actions = [
      { action: 'setState', params: { statePath: '/tab', value: 'active' } },
      { action: 'fetch', params: { url: 'http://x', method: 'GET', target: '/data' } },
    ];
    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'tab', props: { label: 'Click', onSelect: actions } },
      },
    };
    const tree = svc.engine.render(spec);
    const bindings = tree.props._eventBindings as Record<string, unknown>;
    expect(bindings).toBeDefined();
    // press should contain the consumer's action array, NOT the { $prop } expression
    expect(bindings.press).toEqual(actions);
  });

  it('multiple instances share one ElementDefinition with isolated props', () => {
    const svc = setup();
    svc.plugins.registerElement({
      type: 'chip',
      props: { label: { type: 'string' } },
      render: {
        type: 'text',
        props: { content: { $prop: 'label' } },
      },
    });
    svc.applyPlugins();

    const spec: Spec = {
      root: 'row',
      elements: {
        row: { type: 'stack', props: { direction: 'horizontal' }, children: ['a', 'b', 'c'] },
        a: { type: 'chip', props: { label: 'Alpha' } },
        b: { type: 'chip', props: { label: 'Bravo' } },
        c: { type: 'chip', props: { label: 'Charlie' } },
      },
    };
    const tree = svc.engine.render(spec);
    const chips = tree.children as Array<{ type: string; props: Record<string, unknown> }>;
    expect(chips).toHaveLength(3);
    expect(chips[0].props.content).toBe('Alpha');
    expect(chips[1].props.content).toBe('Bravo');
    expect(chips[2].props.content).toBe('Charlie');
  });

  it('config.elements array is equivalent to plugins.registerElement', () => {
    // Alternative entry point — pass elements at construction time.
    const svc = createMythik({
      elements: [
        {
          type: 'badge',
          props: { text: { type: 'string', default: 'NEW' } },
          render: { type: 'text', props: { content: { $prop: 'text' } } },
        },
      ],
    });
    for (const type of ['text', 'stack']) {
      svc.plugins.registerPrimitive(type, mockPrimitive(type));
    }
    svc.applyPlugins();

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'badge', props: { text: 'HOT' } } },
    };
    const tree = svc.engine.render(spec);
    expect(tree.props.content).toBe('HOT');
  });

  it('count() on PluginLoader includes staged element definitions', () => {
    const svc = setup();
    const before = svc.plugins.count();
    svc.plugins.registerElement({
      type: 'tiny',
      props: {},
      render: { type: 'text', props: { content: 'x' } },
    });
    expect(svc.plugins.count()).toBe(before + 1);
  });

  it('duplicate element registration throws', () => {
    const svc = setup();
    svc.plugins.registerElement({
      type: 'widget',
      props: {},
      render: { type: 'text', props: { content: 'a' } },
    });
    expect(() =>
      svc.plugins.registerElement({
        type: 'widget',
        props: {},
        render: { type: 'text', props: { content: 'b' } },
      }),
    ).toThrow('Element "widget" is already registered');
  });
});
