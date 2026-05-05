import { describe, it, expect } from 'vitest';
import { createMythik } from '../src/factory.js';
import type { Spec } from '../src/types.js';

function mockPrimitive(type: string) {
  return (props: Record<string, unknown>, children: unknown[]) => ({ type, props, children });
}

describe('createMythik (integration)', () => {
  it('creates a working instance with default config', () => {
    const svc = createMythik();
    expect(svc.store).toBeDefined();
    expect(svc.resolver).toBeDefined();
    expect(svc.engine).toBeDefined();
    expect(svc.plugins).toBeDefined();
  });

  it('renders a simple spec end-to-end', () => {
    const svc = createMythik({ initialState: { user: { name: 'Alice' } } });
    svc.plugins.registerPrimitive('text', mockPrimitive('text'));
    svc.applyPlugins();

    const spec: Spec = { root: 'greeting', elements: { greeting: { type: 'text', props: { content: { $state: '/user/name' } } } } };
    const tree = svc.engine.render(spec);
    expect(tree.type).toBe('text');
    expect(tree.props.content).toBe('Alice');
  });

  it('renders with computed functions', () => {
    const svc = createMythik({
      initialState: { a: 5, b: 3 },
      computedFunctions: { sum: (args: Record<string, unknown>) => (args.x as number) + (args.y as number) },
    });
    svc.plugins.registerPrimitive('text', mockPrimitive('text'));
    svc.applyPlugins();

    const spec: Spec = {
      root: 'result',
      elements: { result: { type: 'text', props: { content: { $computed: 'sum', args: { x: { $state: '/a' }, y: { $state: '/b' } } } } } },
    };
    expect(svc.engine.render(spec).props.content).toBe(8);
  });

  it('supports registering custom expression handlers via plugins', () => {
    const svc = createMythik();
    svc.plugins.registerExpression({ key: '$double', resolve: (expr: Record<string, unknown>) => ((expr.$double as number) * 2) });
    svc.plugins.registerPrimitive('text', mockPrimitive('text'));
    svc.applyPlugins();

    const spec: Spec = { root: 'main', elements: { main: { type: 'text', props: { value: { $double: 21 } } } } };
    expect(svc.engine.render(spec).props.value).toBe(42);
  });

  it('state changes reflect in next render', () => {
    const svc = createMythik({ initialState: { count: 0 } });
    svc.plugins.registerPrimitive('text', mockPrimitive('text'));
    svc.applyPlugins();

    const spec: Spec = { root: 'counter', elements: { counter: { type: 'text', props: { content: { $state: '/count' } } } } };
    expect(svc.engine.render(spec).props.content).toBe(0);

    svc.store.set('/count', 42);
    expect(svc.engine.render(spec).props.content).toBe(42);
  });

  it('registers custom elements via plugins.registerElement at applyPlugins time', () => {
    const svc = createMythik();
    svc.plugins.registerPrimitive('stack', mockPrimitive('stack'));
    svc.plugins.registerPrimitive('text', mockPrimitive('text'));
    svc.plugins.registerElement({
      type: 'greeting-card',
      props: { name: { type: 'string' } },
      render: {
        type: 'stack',
        props: {},
        children: [
          { type: 'text', props: { content: { $prop: 'name' } } },
        ],
      },
    });
    svc.applyPlugins();

    // Verify the element is now in the registry — consumer specs can use it
    expect(svc.elements.has('greeting-card')).toBe(true);

    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'greeting-card', props: { name: 'Alice' } } },
    };
    const tree = svc.engine.render(spec);
    // Outer primitive is 'stack' (the render-tree root), inner text expands to 'Alice' via $prop resolution
    expect(tree.type).toBe('stack');
    const innerText = (tree.children as Array<{ type: string; props: Record<string, unknown> }>)[0];
    expect(innerText.type).toBe('text');
    expect(innerText.props.content).toBe('Alice');
  });

  it('threads plugin icon renderer into resolved tokens at applyPlugins time', () => {
    const svc = createMythik();
    const IconRenderer = () => null;

    svc.plugins.registerPrimitive('box', mockPrimitive('box'));
    svc.plugins.setIconRenderer(IconRenderer);
    svc.applyPlugins();

    const storedTokens = svc.store.get('/tokens/resolved') as Record<string, unknown>;
    expect(storedTokens._iconRenderer).toBe(IconRenderer);

    const spec: Spec = { root: 'root', elements: { root: { type: 'box', props: {} } } };
    const tree = svc.engine.render(spec);
    expect((tree.props._tokens as Record<string, unknown>)._iconRenderer).toBe(IconRenderer);
  });
});

describe('factory — protectionRegistry integration (v49 Item E)', () => {
  it('exposes protectionRegistry on MythikInstance', () => {
    const instance = createMythik({});
    // @ts-expect-error — internal property accessed in test
    expect(instance.protectionRegistry).toBeDefined();
    // @ts-expect-error — internal property accessed in test
    expect(typeof instance.protectionRegistry.contribute).toBe('function');
    // @ts-expect-error — internal property accessed in test
    expect(typeof instance.protectionRegistry.allPaths).toBe('function');
  });

  it('default protected paths are present in the registry', () => {
    const instance = createMythik({});
    // @ts-expect-error — internal property
    const paths = instance.protectionRegistry.allPaths();
    expect(paths).toContain('/tx/*');
    expect(paths).toContain('/ui/forms/*');
    expect(paths).toContain('/auth/*');
  });

  it('user-provided protected paths via secConfig are added to registry', () => {
    const instance = createMythik({
      security: { protectedPaths: ['/custom/*'] },
    });
    // @ts-expect-error — internal property
    const paths = instance.protectionRegistry.allPaths();
    expect(paths).toContain('/custom/*');
    expect(paths).toContain('/auth/*');
  });

  it('stateGuard reads from registry (dynamic — adding a contribution affects guard)', () => {
    const instance = createMythik({});
    expect(instance.security.stateGuard.canWrite('/derived')).toBe(true);

    // @ts-expect-error — internal property
    const release = instance.protectionRegistry.contribute(['/derived']);
    expect(instance.security.stateGuard.canWrite('/derived')).toBe(false);

    release();
    expect(instance.security.stateGuard.canWrite('/derived')).toBe(true);
  });
});
