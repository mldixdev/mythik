import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import type { Spec } from 'mythik';

/**
 * Verifies the `emitElementIds` MythikRenderer prop wraps each rendered
 * primitive in a `<div data-mythik-id="<spec-id>" style="display:contents">`
 * sentinel. The sentinel is layout-transparent (display:contents) so it
 * doesn't disturb flex/grid/block layout of the primitive it wraps.
 *
 * The contract: opt-in only — production renders stay clean by default.
 */
describe('MythikRenderer — emitElementIds', () => {
  const spec: Spec = {
    root: 'main',
    elements: {
      main: { type: 'box', children: ['heading', 'cta'] },
      heading: { type: 'text', props: { content: 'Inspector demo' } },
      cta: { type: 'button', props: { label: 'Click me' } },
    },
  };

  it('does NOT emit data-mythik-id by default', () => {
    const { container } = render(<MythikRenderer spec={spec} />);
    expect(container.querySelectorAll('[data-mythik-id]').length).toBe(0);
  });

  it('emits data-mythik-id on every spec element when emitElementIds is true', () => {
    const { container } = render(<MythikRenderer spec={spec} emitElementIds />);
    const wrappers = container.querySelectorAll('[data-mythik-id]');
    const ids = Array.from(wrappers).map((w) => w.getAttribute('data-mythik-id'));
    // One sentinel per spec element (root + 2 children = 3).
    expect(ids).toEqual(expect.arrayContaining(['main', 'heading', 'cta']));
    expect(ids.length).toBe(3);
  });

  it('uses display:contents on the sentinel so layout is preserved', () => {
    const { container } = render(<MythikRenderer spec={spec} emitElementIds />);
    const sentinel = container.querySelector('[data-mythik-id="cta"]') as HTMLElement;
    expect(sentinel.style.display).toBe('contents');
    // Sentinel's first child is the rendered primitive itself.
    expect(sentinel.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('does not interfere with the primitive\'s rendered DOM', () => {
    // Same render with and without the flag should produce the same primitive
    // tags (button, h1, etc.) — the sentinel is purely additive.
    const a = render(<MythikRenderer spec={spec} />);
    const b = render(<MythikRenderer spec={spec} emitElementIds />);
    expect(a.container.querySelector('button')?.textContent).toBe('Click me');
    expect(b.container.querySelector('button')?.textContent).toBe('Click me');
  });
});
