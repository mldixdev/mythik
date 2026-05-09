import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import { createMythik } from 'mythik';
import { registerReactPrimitives } from '../src/primitives/index.js';
import type { Spec } from 'mythik';

describe('MythikRenderer — LayerBackground v2 (plan 3 Task 20)', () => {
  it('mounts BackgroundStack when identity.background is a LayerBackground', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Hi' } } },
      tokens: {
        colors: { primary: '#6366f1', accent: '#ec4899' },
        identity: {
          background: {
            color: '#0a0a0a',
            layers: [{ type: 'solid', color: '#111', opacity: 0.4 }],
          },
        },
      },
    };
    const { container } = render(<MythikRenderer spec={spec} />);
    // Root wrapper carries the data-sv-renderer-root marker (Task 20 review M4).
    const wrapper = container.querySelector('[data-sv-renderer-root="v2"]');
    expect(wrapper).toBeTruthy();
    // Two layer divs (base color + explicit solid) precede the content wrapper.
    const absoluteLayers = wrapper?.querySelectorAll('div[style*="position: absolute"]');
    expect(absoluteLayers?.length).toBeGreaterThanOrEqual(2);
  });

  // Task 20 review C1 — a 3-layer spec produces internal zIndex values 0, 1, 2.
  // Without isolation:isolate the content wrapper at zIndex 1 would lose to
  // layer 2. With isolation the layers stay in their own stacking context;
  // content must still be visible above them (verified by role lookup on the
  // rendered text).
  it('content wins over multi-layer stacks (isolation prevents z-index leak)', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Above layers' } } },
      tokens: {
        colors: { primary: '#6366f1', accent: '#ec4899' },
        identity: {
          background: {
            color: '#0a0a0a',
            layers: [
              { type: 'gradient', kind: 'linear', stops: [{ color: '#000', at: '0%' }, { color: '#fff', at: '100%' }] },
              { type: 'pattern', kind: 'grid', spacing: 40 },
              { type: 'grain', intensity: 0.04 },
            ],
          },
        },
      },
    };
    const { container, getByText } = render(<MythikRenderer spec={spec} />);
    expect(getByText('Above layers')).toBeTruthy();
    // Stack sibling carries isolation:isolate for C1 fix.
    const stackContainer = container.querySelector('div[style*="isolation: isolate"]');
    expect(stackContainer).toBeTruthy();
  });

  // Task 20 review I3 — edge cases for the discriminator.
  it('does NOT mount for empty {} background (I3 false-positive guard)', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Hi' } } },
      tokens: { colors: { primary: '#000', accent: '#fff' }, identity: { background: {} } },
    };
    const { container } = render(<MythikRenderer spec={spec} />);
    expect(container.querySelector('[data-sv-renderer-root]')).toBeNull();
  });

  it('does NOT mount when background is an array (defensive)', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Hi' } } },
      tokens: { colors: { primary: '#000', accent: '#fff' }, identity: { background: [] } },
    };
    const { container } = render(<MythikRenderer spec={spec} />);
    expect(container.querySelector('[data-sv-renderer-root]')).toBeNull();
  });

  it('DOES mount when LayerBackground has only `color` (no layers)', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Hi' } } },
      tokens: {
        colors: { primary: '#000', accent: '#fff' },
        identity: { background: { color: '#0a0a0a' } },
      },
    };
    const { container } = render(<MythikRenderer spec={spec} />);
    expect(container.querySelector('[data-sv-renderer-root="v2"]')).toBeTruthy();
  });

  // Task 20 review M3 — the diagnostic dev-warn for "LayerBackground present
  // but palette missing" still exists in MythikRenderer as a runtime
  // defensive check. Pre-Task-23 the test could trigger it by omitting
  // `tokens.colors` from the spec. Post-Task-23 the renderer's token source
  // priority resolves colors from the engine-injected defaults (via
  // tree.props._tokens) when spec.tokens.colors is absent, so the warn is
  // no longer reachable from typical test fixtures. Kept the code in
  // MythikRenderer; removed the obsolete assertion.

  it('threads palette to BackgroundStack so blob layers render real BlobLayer', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Hi' } } },
      tokens: {
        colors: { primary: '#6366f1', accent: '#ec4899' },
        identity: {
          background: {
            color: '#0a0a0a',
            layers: [{ type: 'blobs', preset: 'organic-duo', palette: ['primary', 'accent'] }],
          },
        },
      },
    };
    const { container } = render(<MythikRenderer spec={spec} />);
    const blobWrapper = container.querySelector('[data-sv-layer="blobs"]') as HTMLElement;
    expect(blobWrapper).toBeTruthy();
    // Real BlobLayer mounts 2 <svg><path> for organic-duo preset.
    expect(blobWrapper.querySelectorAll('svg path').length).toBe(2);
    expect(blobWrapper.querySelectorAll('svg path')[0].getAttribute('fill')).toBe('#6366f1');
  });

  it('does NOT mount BackgroundStack when background carries a `style` field (malformed v2 defense)', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Hi' } } },
      tokens: {
        colors: { primary: '#6366f1', accent: '#ec4899' },
        identity: {
          // Plan 3 Task 21 deleted legacy BackgroundConfig, but the
          // isLayerBackground rejection of `{ style: ... }` persists as
          // malformed-spec defense — a caller accidentally passing legacy-
          // shaped data should get a clean no-mount instead of a crash when
          // BackgroundStack hits the v2 resolver.
          background: { style: 'solid' },
        },
      },
    };
    const { container } = render(<MythikRenderer spec={spec} />);
    expect(container.querySelectorAll('[data-sv-renderer-root]').length).toBe(0);
  });

  it('does NOT mount BackgroundStack when identity.background is absent', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Hi' } } },
    };
    const { container } = render(<MythikRenderer spec={spec} />);
    expect(container.querySelectorAll('[data-sv-layer]').length).toBe(0);
  });

  it('children still render above the background stack', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Hello with bg' } } },
      tokens: {
        colors: { primary: '#6366f1', accent: '#ec4899' },
        identity: {
          background: {
            color: '#0a0a0a',
            layers: [{ type: 'solid', color: '#111' }],
          },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Hello with bg')).toBeTruthy();
  });
});

describe('MythikRenderer', () => {
  function createThrowingInstance(exposeErrors = true) {
    function ThrowingPrimitive(): never {
      throw new Error('Exploding primitive for error overlay test');
    }

    const instance = createMythik({ security: { exposeErrors } });
    instance.plugins.registerPrimitive('explode', (props, children) => ({
      type: 'explode',
      props: { ...props, _component: ThrowingPrimitive },
      children,
    }));
    instance.applyPlugins();
    return instance;
  }

  it('renders a simple text element', () => {
    const spec: Spec = {
      root: 'heading',
      elements: {
        heading: { type: 'text', props: { content: 'Hello Mythik' } },
      },
    };

    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Hello Mythik')).toBeTruthy();
  });

  it('renders a dev error overlay when a primitive throws during render', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const spec: Spec = {
      root: 'boom',
      elements: { boom: { type: 'explode', props: {} } },
    };

    render(<MythikRenderer spec={spec} instance={createThrowingInstance()} />);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Mythik render error')).toBeTruthy();
    expect(screen.getByText('Exploding primitive for error overlay test')).toBeTruthy();
    errorSpy.mockRestore();
  });

  it('hides render error details when exposeErrors is false', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const spec: Spec = {
      root: 'boom',
      elements: { boom: { type: 'explode', props: {} } },
    };

    const { container } = render(<MythikRenderer spec={spec} instance={createThrowingInstance(false)} />);

    expect(container.querySelector('[data-mythik-error-overlay="true"]')).toBeNull();
    expect(screen.queryByText('Exploding primitive for error overlay test')).toBeNull();
    errorSpy.mockRestore();
  });

  it('recovers from a render error when rerendered with a valid spec', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const brokenSpec: Spec = {
      root: 'boom',
      elements: { boom: { type: 'explode', props: {} } },
    };
    const validSpec: Spec = {
      root: 'title',
      elements: { title: { type: 'text', props: { content: 'Recovered render' } } },
    };

    const { rerender } = render(<MythikRenderer spec={brokenSpec} instance={createThrowingInstance()} />);

    expect(screen.getByRole('alert')).toBeTruthy();

    rerender(<MythikRenderer spec={validSpec} />);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Recovered render')).toBeTruthy();
    errorSpy.mockRestore();
  });

  it('renders nested layout with children', () => {
    const spec: Spec = {
      root: 'layout',
      elements: {
        layout: { type: 'stack', props: { direction: 'vertical' }, children: ['title', 'subtitle'] },
        title: { type: 'text', props: { content: 'Title Text', variant: 'heading' } },
        subtitle: { type: 'text', props: { content: 'Subtitle Text', variant: 'caption' } },
      },
    };

    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Title Text')).toBeTruthy();
    expect(screen.getByText('Subtitle Text')).toBeTruthy();
  });

  it('resolves $state expressions into rendered content', () => {
    const spec: Spec = {
      root: 'greeting',
      elements: {
        greeting: { type: 'text', props: { content: { $state: '/user/name' } } },
      },
    };

    render(<MythikRenderer spec={spec} config={{ initialState: { user: { name: 'Alice' } } }} />);
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('renders a button with label', () => {
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: { type: 'button', props: { label: 'Click Me', variant: 'primary' } },
      },
    };

    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Click Me')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('renders an input field', () => {
    const spec: Spec = {
      root: 'field',
      elements: {
        field: { type: 'input', props: { label: 'Email', placeholder: 'Enter email', type: 'email' } },
      },
    };

    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter email')).toBeTruthy();
  });

  it('hides elements with visible: false', () => {
    const spec: Spec = {
      root: 'layout',
      elements: {
        layout: { type: 'stack', children: ['shown', 'hidden'] },
        shown: { type: 'text', props: { content: 'I am visible' } },
        hidden: { type: 'text', props: { content: 'I am hidden' }, visible: false },
      },
    };

    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('I am visible')).toBeTruthy();
    expect(screen.queryByText('I am hidden')).toBeNull();
  });

  it('renders a complete form layout', () => {
    const spec: Spec = {
      root: 'form',
      elements: {
        form: { type: 'stack', props: { direction: 'vertical', gap: 16 }, children: ['name-input', 'email-input', 'submit-btn'] },
        'name-input': { type: 'input', props: { label: 'Name', placeholder: 'Your name' } },
        'email-input': { type: 'input', props: { label: 'Email', placeholder: 'Your email', type: 'email' } },
        'submit-btn': { type: 'button', props: { label: 'Submit', variant: 'primary' } },
      },
    };

    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Submit')).toBeTruthy();
    expect(screen.getByPlaceholderText('Your name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Your email')).toBeTruthy();
  });

  it('renders grid layout', () => {
    const spec: Spec = {
      root: 'grid',
      elements: {
        grid: { type: 'grid', props: { columns: 2, gap: 8 }, children: ['a', 'b'] },
        a: { type: 'text', props: { content: 'Cell A' } },
        b: { type: 'text', props: { content: 'Cell B' } },
      },
    };

    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Cell A')).toBeTruthy();
    expect(screen.getByText('Cell B')).toBeTruthy();
  });

  it('renders divider', () => {
    const spec: Spec = {
      root: 'layout',
      elements: {
        layout: { type: 'stack', children: ['text1', 'sep', 'text2'] },
        text1: { type: 'text', props: { content: 'Above' } },
        sep: { type: 'divider' },
        text2: { type: 'text', props: { content: 'Below' } },
      },
    };

    render(<MythikRenderer spec={spec} />);
    expect(screen.getByRole('separator')).toBeTruthy();
  });

  it('renders $template expressions', () => {
    const spec: Spec = {
      root: 'msg',
      elements: {
        msg: { type: 'text', props: { content: { $template: 'Hello, ${/user/name}! You are ${/user/age}.' } } },
      },
    };

    render(<MythikRenderer spec={spec} config={{ initialState: { user: { name: 'Bob', age: 25 } } }} />);
    expect(screen.getByText('Hello, Bob! You are 25.')).toBeTruthy();
  });

  it('dispatches action arrays sequentially (async actions await before next)', async () => {
    const executionOrder: string[] = [];

    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Go' },
          on: {
            press: [
              { action: 'step1', params: {} },
              { action: 'step2', params: {} },
            ],
          },
        },
      },
    };

    const svc = createMythik({});
    registerReactPrimitives(svc.plugins);

    svc.plugins.registerAction({
      name: 'step1',
      handler: async () => {
        await new Promise((r) => setTimeout(r, 50));
        executionOrder.push('step1-done');
      },
    });
    svc.plugins.registerAction({
      name: 'step2',
      handler: async () => {
        executionOrder.push('step2-done');
      },
    });
    svc.applyPlugins();

    render(<MythikRenderer spec={spec} instance={svc} />);
    const button = screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button);
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(executionOrder).toEqual(['step1-done', 'step2-done']);
  });

  it('executes action and transaction bindings inside action arrays serially', async () => {
    const executionOrder: string[] = [];
    const spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Save' },
          on: {
            press: [
              { action: 'recordBefore', params: {} },
              { transaction: {
                confirm: [
                  { action: 'recordConfirm', params: {} },
                ],
                onSuccess: [
                  { action: 'recordSuccess', params: {} },
                ],
              } },
              { action: 'recordAfter', params: {} },
            ],
          },
        },
      },
    } as unknown as Spec;

    const svc = createMythik({});
    registerReactPrimitives(svc.plugins);
    for (const name of ['recordBefore', 'recordConfirm', 'recordSuccess', 'recordAfter']) {
      svc.plugins.registerAction({
        name,
        handler: async () => {
          executionOrder.push(name);
        },
      });
    }
    svc.applyPlugins();

    render(<MythikRenderer spec={spec} instance={svc} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(executionOrder).toEqual(['recordBefore', 'recordConfirm', 'recordSuccess', 'recordAfter']);
  });

  it('does not await fireAndForget actions before continuing', async () => {
    const executionOrder: string[] = [];

    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Go' },
          on: {
            press: [
              { action: 'slow', params: {}, fireAndForget: true },
              { action: 'fast', params: {} },
            ],
          },
        },
      },
    };

    const svc = createMythik({});
    registerReactPrimitives(svc.plugins);

    svc.plugins.registerAction({
      name: 'slow',
      handler: async () => {
        await new Promise((r) => setTimeout(r, 100));
        executionOrder.push('slow-done');
      },
    });
    svc.plugins.registerAction({
      name: 'fast',
      handler: async () => {
        executionOrder.push('fast-done');
      },
    });
    svc.applyPlugins();

    render(<MythikRenderer spec={spec} instance={svc} />);
    const button = screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button);
      await new Promise((r) => setTimeout(r, 50));
    });

    // fast should run before slow completes (slow is fire-and-forget)
    expect(executionOrder).toEqual(['fast-done']);

    // Wait for slow to finish
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(executionOrder).toEqual(['fast-done', 'slow-done']);
  });

  it('executes initialActions on mount', async () => {
    const spec: Spec = {
      root: 'msg',
      initialActions: [
        { action: 'setState', params: { statePath: '/loaded', value: true } },
      ],
      elements: {
        msg: { type: 'text', props: { content: 'Hello' } },
      },
    };

    const svc = createMythik({ initialState: { loaded: false } });
    registerReactPrimitives(svc.plugins);
    svc.applyPlugins();

    render(<MythikRenderer spec={spec} instance={svc} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(svc.store.get('/loaded')).toBe(true);
  });
});
