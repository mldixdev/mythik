import { describe, it, expect, vi } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import React from 'react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import { registerReactPrimitives } from '../src/primitives/index.js';
import { createMythik } from 'mythik';
import type { Spec, MythikInstance } from 'mythik';

/** Build a MythikInstance with React primitives wired (mirrors what MythikRenderer
 *  does internally when no `instance` prop is passed). */
function makeInstance(initialState: Record<string, unknown> = {}): MythikInstance {
  const svc = createMythik({ initialState });
  registerReactPrimitives(svc.plugins);
  svc.applyPlugins();
  return svc;
}

describe('MythikRenderer — derive + dataSources runtime integration (v49 Item E)', () => {
  it('renders derive output reactively (initial paint + on state change)', async () => {
    const svc = makeInstance({ count: 2 });
    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'text', props: { content: { $template: 'Total: ${/computed/total}' } } },
      },
      derive: { '/computed/total': { $state: '/count' } },
    };
    const { container } = render(<MythikRenderer spec={spec} instance={svc} />);

    // Initial-paint: deriveEngine.mount() writes /computed/total=2 inside its
    // useEffect; the state subscription useEffect (declared BEFORE mountSpecRuntime
    // in MythikRenderer) captures the write and schedules a re-render.
    await waitFor(() => expect(svc.store.get('/computed/total')).toBe(2));
    await waitFor(() => expect(container.textContent).toContain('Total: 2'));

    // Reactive recompute on state change
    await act(async () => {
      svc.store.set('/count', 8);
      await new Promise((r) => setTimeout(r, 50));
    });
    await waitFor(() => expect(svc.store.get('/computed/total')).toBe(8));
    await waitFor(() => expect(container.textContent).toContain('Total: 8'));

    // Second change verifies subscription stays attached
    await act(async () => {
      svc.store.set('/count', 15);
      await new Promise((r) => setTimeout(r, 50));
    });
    await waitFor(() => expect(container.textContent).toContain('Total: 15'));
  });

  it('mounts dataSources and reflects fetched data', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => [{ id: 1, title: 'Post A' }],
    });
    const svc = makeInstance({});
    const spec: Spec = {
      root: 'r',
      elements: {
        r: { type: 'text', props: { content: { $template: 'First: ${/posts/0/title}' } } },
      },
      dataSources: { posts: { url: '/api/posts', target: '/posts' } },
    };
    const { container } = render(<MythikRenderer spec={spec} instance={svc} fetcher={fetcher as any} />);
    await waitFor(() => expect(container.textContent).toContain('First: Post A'));
  });

  it('navigation between specs (re-mount) does not throw action-already-registered', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    const svc = makeInstance({});
    const specA: Spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      dataSources: { items: { url: '/api/itemsA', target: '/items' } },
    };
    const specB: Spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      dataSources: { items: { url: '/api/itemsB', target: '/items' } },
    };
    const { rerender } = render(<MythikRenderer spec={specA} instance={svc} fetcher={fetcher as any} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    expect(() => rerender(<MythikRenderer spec={specB} instance={svc} fetcher={fetcher as any} />)).not.toThrow();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});
