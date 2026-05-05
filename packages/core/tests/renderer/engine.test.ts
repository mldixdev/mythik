import { describe, it, expect } from 'vitest';
import { createRenderEngine } from '../../src/renderer/engine.js';
import { createPrimitiveRegistry } from '../../src/renderer/registry.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import type { Spec } from '../../src/types.js';

describe('RenderEngine', () => {
  function setup(spec: Spec, initialState: Record<string, unknown> = {}) {
    const store = createStateStore(initialState);
    const resolver = createResolver({ store });
    const primitiveRegistry = createPrimitiveRegistry();

    for (const type of ['stack', 'text', 'box', 'button', 'modal', 'drawer']) {
      primitiveRegistry.register(type, (props, children) => ({ type, props, children }));
    }

    const engine = createRenderEngine({ resolver, primitiveRegistry });
    return { engine, store };
  }

  it('renders a single root element', () => {
    const { engine } = setup({
      root: 'heading',
      elements: { heading: { type: 'text', props: { content: 'Hello World' } } },
    });
    const tree = engine.render({ root: 'heading', elements: { heading: { type: 'text', props: { content: 'Hello World' } } } });
    expect(tree.type).toBe('text');
    expect(tree.props.content).toBe('Hello World');
    expect(tree.children).toEqual([]);
  });

  it('renders nested children by ID', () => {
    const spec: Spec = {
      root: 'layout',
      elements: {
        layout: { type: 'stack', props: { direction: 'vertical' }, children: ['title', 'subtitle'] },
        title: { type: 'text', props: { content: 'Title' } },
        subtitle: { type: 'text', props: { content: 'Subtitle' } },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    expect(tree.type).toBe('stack');
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].props.content).toBe('Title');
    expect(tree.children[1].props.content).toBe('Subtitle');
  });

  it('resolves expressions in props', () => {
    const spec: Spec = {
      root: 'greeting',
      elements: { greeting: { type: 'text', props: { content: { $state: '/user/name' } } } },
    };
    const { engine } = setup(spec, { user: { name: 'Alice' } });
    const tree = engine.render(spec);
    expect(tree.props.content).toBe('Alice');
  });

  it('hides elements with visible: false', () => {
    const spec: Spec = {
      root: 'layout',
      elements: {
        layout: { type: 'stack', children: ['shown', 'hidden'] },
        shown: { type: 'text', props: { content: 'Visible' }, visible: true },
        hidden: { type: 'text', props: { content: 'Hidden' }, visible: false },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].props.content).toBe('Visible');
  });

  it('evaluates visibility conditions', () => {
    const spec: Spec = {
      root: 'layout',
      elements: {
        layout: { type: 'stack', children: ['admin-panel'] },
        'admin-panel': { type: 'box', props: {}, visible: { $state: '/user/role', eq: 'admin' } as unknown as boolean },
      },
    };

    const { engine: e1 } = setup(spec, { user: { role: 'admin' } });
    expect(e1.render(spec).children).toHaveLength(1);

    const { engine: e2 } = setup(spec, { user: { role: 'viewer' } });
    expect(e2.render(spec).children).toHaveLength(0);
  });

  it('throws for missing root element', () => {
    const { engine } = setup({ root: 'nonexistent', elements: {} });
    expect(() => engine.render({ root: 'nonexistent', elements: {} })).toThrow('Root element "nonexistent" not found');
  });

  it('skips missing child element silently', () => {
    const spec: Spec = { root: 'layout', elements: { layout: { type: 'stack', children: ['missing'] } } };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    expect(tree.type).toBe('stack');
    expect(tree.children).toHaveLength(0); // Missing child skipped
  });

  it('returns _error node for unregistered primitive', () => {
    const spec: Spec = { root: 'main', elements: { main: { type: 'unknown-primitive', props: {} } } };
    const store = createStateStore({});
    const resolver = createResolver({ store });
    const primitiveRegistry = createPrimitiveRegistry();
    const engine = createRenderEngine({ resolver, primitiveRegistry });
    const tree = engine.render(spec);
    expect(tree.type).toBe('_error');
    expect(tree.props.elementId).toBe('main');
    expect(tree.props.error).toContain('unknown-primitive');
  });

  it('isolates errors — siblings render normally when one element fails', () => {
    const spec: Spec = {
      root: 'layout',
      elements: {
        layout: { type: 'stack', children: ['good', 'bad', 'also-good'] },
        good: { type: 'text', props: { content: 'hello' } },
        bad: { type: 'nonexistent_type', props: {} },
        'also-good': { type: 'text', props: { content: 'world' } },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    expect(tree.type).toBe('stack');
    expect(tree.children).toHaveLength(3);
    expect(tree.children[0].type).toBe('text');
    expect(tree.children[1].type).toBe('_error');
    expect(tree.children[1].props.elementId).toBe('bad');
    expect(tree.children[2].type).toBe('text');
  });

  // --- Auto-visibility for modals and drawers ---

  it('hides modal when /ui/modals/{id} is falsy (auto-visibility)', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', props: {}, children: ['content', 'my-modal'] },
        content: { type: 'text', props: { content: 'Main' } },
        'my-modal': { type: 'modal', props: { title: 'Dialog' }, children: ['msg'] },
        msg: { type: 'text', props: { content: 'Modal body' } },
      },
    };
    const { engine } = setup(spec, { ui: { modals: {} } });
    const tree = engine.render(spec);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe('text');
  });

  it('shows modal when /ui/modals/{id} is truthy (auto-visibility)', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', props: {}, children: ['content', 'my-modal'] },
        content: { type: 'text', props: { content: 'Main' } },
        'my-modal': { type: 'modal', props: { title: 'Dialog' }, children: ['msg'] },
        msg: { type: 'text', props: { content: 'Modal body' } },
      },
    };
    const { engine } = setup(spec, { ui: { modals: { 'my-modal': true } } });
    const tree = engine.render(spec);
    expect(tree.children).toHaveLength(2);
    expect(tree.children[1].type).toBe('modal');
  });

  it('hides drawer when /ui/drawers/{id} is falsy (auto-visibility)', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', props: {}, children: ['content', 'side-drawer'] },
        content: { type: 'text', props: { content: 'Main' } },
        'side-drawer': { type: 'drawer', props: { side: 'right' }, children: ['nav'] },
        nav: { type: 'text', props: { content: 'Drawer content' } },
      },
    };
    const { engine } = setup(spec, { ui: { drawers: {} } });
    const tree = engine.render(spec);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe('text');
  });

  it('shows drawer when /ui/drawers/{id} is truthy (auto-visibility)', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', props: {}, children: ['content', 'side-drawer'] },
        content: { type: 'text', props: { content: 'Main' } },
        'side-drawer': { type: 'drawer', props: { side: 'right' }, children: ['nav'] },
        nav: { type: 'text', props: { content: 'Drawer content' } },
      },
    };
    const { engine } = setup(spec, { ui: { drawers: { 'side-drawer': true } } });
    const tree = engine.render(spec);
    expect(tree.children).toHaveLength(2);
    expect(tree.children[1].type).toBe('drawer');
  });

  it('drawer appears after state change from hidden to visible (selective re-render)', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', props: {}, children: ['content', 'detail-drawer'] },
        content: { type: 'text', props: { content: 'Main' } },
        'detail-drawer': { type: 'drawer', props: { side: 'right' }, children: ['info'] },
        info: { type: 'text', props: { content: 'Detail' } },
      },
    };
    const { engine, store } = setup(spec, { ui: { drawers: {} } });

    // First render: drawer is hidden
    const tree1 = engine.render(spec);
    expect(tree1.children).toHaveLength(1);

    // Change state to show drawer
    store.set('/ui/drawers/detail-drawer', true);

    // Selective re-render with changedPaths
    const changedPaths = new Set(['/ui/drawers/detail-drawer']);
    const tree2 = engine.render(spec, changedPaths);
    expect(tree2.children).toHaveLength(2);
    expect(tree2.children[1].type).toBe('drawer');
  });

  it('modal appears after state change from hidden to visible (selective re-render)', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', props: {}, children: ['content', 'confirm-modal'] },
        content: { type: 'text', props: { content: 'Main' } },
        'confirm-modal': { type: 'modal', props: { title: 'Confirm' }, children: ['msg'] },
        msg: { type: 'text', props: { content: 'Are you sure?' } },
      },
    };
    const { engine, store } = setup(spec, { ui: { modals: {} } });

    // First render: modal is hidden
    const tree1 = engine.render(spec);
    expect(tree1.children).toHaveLength(1);

    // Change state to show modal
    store.set('/ui/modals/confirm-modal', true);

    // Selective re-render
    const changedPaths = new Set(['/ui/modals/confirm-modal']);
    const tree2 = engine.render(spec, changedPaths);
    expect(tree2.children).toHaveLength(2);
    expect(tree2.children[1].type).toBe('modal');
  });

  it('drawer invalidates cached props when re-opened after state changed while hidden', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', props: {}, children: ['content', 'detail-drawer'] },
        content: { type: 'text', props: { content: 'Main' } },
        'detail-drawer': {
          type: 'drawer',
          props: { style: { backgroundColor: { $state: '/theme/bg' } } },
          children: ['info'],
        },
        info: { type: 'text', props: { content: 'Detail' } },
      },
    };
    const { engine, store } = setup(spec, { ui: { drawers: {} }, theme: { bg: 'white' } });

    // 1. Open drawer in "white" mode
    store.set('/ui/drawers/detail-drawer', true);
    const tree1 = engine.render(spec);
    expect(tree1.children).toHaveLength(2);
    expect(tree1.children[1].props.style.backgroundColor).toBe('white');

    // 2. Close drawer
    store.set('/ui/drawers/detail-drawer', false);
    engine.render(spec, new Set(['/ui/drawers/detail-drawer']));

    // 3. Change theme while drawer is hidden
    store.set('/theme/bg', 'dark');
    engine.render(spec, new Set(['/theme/bg']));

    // 4. Re-open drawer — should have NEW theme, not cached "white"
    store.set('/ui/drawers/detail-drawer', true);
    const tree4 = engine.render(spec, new Set(['/ui/drawers/detail-drawer']));
    expect(tree4.children).toHaveLength(2);
    expect(tree4.children[1].props.style.backgroundColor).toBe('dark');
  });

  it('modal invalidates cached props when re-opened after state changed while hidden', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', props: {}, children: ['content', 'my-modal'] },
        content: { type: 'text', props: { content: 'Main' } },
        'my-modal': {
          type: 'modal',
          props: { title: { $state: '/settings/title' } },
          children: ['msg'],
        },
        msg: { type: 'text', props: { content: 'Body' } },
      },
    };
    const { engine, store } = setup(spec, { ui: { modals: {} }, settings: { title: 'Old Title' } });

    // 1. Open modal
    store.set('/ui/modals/my-modal', true);
    const tree1 = engine.render(spec);
    expect(tree1.children[1].props.title).toBe('Old Title');

    // 2. Close modal
    store.set('/ui/modals/my-modal', false);
    engine.render(spec, new Set(['/ui/modals/my-modal']));

    // 3. Change title while modal is hidden
    store.set('/settings/title', 'New Title');
    engine.render(spec, new Set(['/settings/title']));

    // 4. Re-open modal — should have new title
    store.set('/ui/modals/my-modal', true);
    const tree4 = engine.render(spec, new Set(['/ui/modals/my-modal']));
    expect(tree4.children[1].props.title).toBe('New Title');
  });

  // ─── Exit animations (_exiting RenderNodes) ───

  it('returns _exiting node for invisible element with motion.exit', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', children: ['panel'] },
        panel: {
          type: 'box',
          visible: { $state: '/showPanel' },
          motion: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
          props: { style: { padding: 20 } },
        },
      },
    };
    const { engine } = setup(spec, { showPanel: false });
    const tree = engine.render(spec);
    expect(tree.children.length).toBe(1);
    expect(tree.children[0].props._exiting).toBe(true);
  });

  it('returns null for invisible element WITHOUT motion.exit', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', children: ['panel'] },
        panel: { type: 'box', visible: false, props: {} },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    expect(tree.children.length).toBe(0);
  });

  it('returns _exiting node for invisible element with motion.layoutId', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', children: ['check'] },
        check: {
          type: 'box',
          visible: false,
          motion: { layoutId: 'shared', animate: { scale: 1 } },
          props: {},
        },
      },
    };
    const { engine } = setup(spec);
    const tree = engine.render(spec);
    expect(tree.children.length).toBe(1);
    expect(tree.children[0].props._exiting).toBe(true);
    expect(tree.children[0].props._motion.layoutId).toBe('shared');
  });
});
