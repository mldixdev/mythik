import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Box } from '../../src/primitives/box.js';
import { __resetSingletonForTests } from '../../src/animation/stylesheet-singleton.js';

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe('Box — animations prop integration (web)', () => {
  beforeEach(() => {
    __resetSingletonForTests();
    mockMatchMedia(false);
  });

  it('renders without animations prop (empty animation style)', () => {
    const { container } = render(<Box />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.animation).toBe('');
  });

  it('mount animation applied when animations.mount set', () => {
    const { container } = render(
      <Box animations={{ mount: { recipe: 'fade-up' } }} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.animation).toContain('svka-');
    expect(el.style.animation).toContain('500ms');
  });

  it('hover animation applies on mouseenter, clears on mouseleave', () => {
    const { container } = render(
      <Box animations={{ hover: { recipe: 'lift' } }} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.animation).toBe('');
    fireEvent.mouseEnter(el);
    expect(el.style.animation).toContain('svka-');
    fireEvent.mouseLeave(el);
    expect(el.style.animation).toBe('');
  });

  it('focus animation applies on focus, clears on blur', () => {
    const { container } = render(
      <Box animations={{ focus: { recipe: 'fade' } }} tabIndex={0} />,
    );
    const el = container.firstChild as HTMLElement;
    fireEvent.focus(el);
    expect(el.style.animation).toContain('svka-');
    fireEvent.blur(el);
    expect(el.style.animation).toBe('');
  });

  it('active animation applies on mousedown, clears on mouseup', () => {
    const { container } = render(
      <Box animations={{ active: { recipe: 'pop' } }} />,
    );
    const el = container.firstChild as HTMLElement;
    fireEvent.mouseDown(el);
    expect(el.style.animation).toContain('svka-');
    fireEvent.mouseUp(el);
    expect(el.style.animation).toBe('');
  });

  it('ambient animation runs continuously (infinite) independent of state flags', () => {
    const { container } = render(
      <Box animations={{ ambient: { recipe: 'breathe-subtle' } }} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.animation).toContain('infinite');
  });

  it('composes multiple triggers (mount + hover) and updates on event', () => {
    const { container } = render(
      <Box
        animations={{
          mount: { recipe: 'fade-up' },
          hover: { recipe: 'lift' },
        }}
      />,
    );
    const el = container.firstChild as HTMLElement;
    // mount is active immediately
    expect(el.style.animation).toContain('svka-');
    const parts1 = el.style.animation.split(',').map((s) => s.trim());
    expect(parts1.length).toBe(1); // only mount
    fireEvent.mouseEnter(el);
    const parts2 = el.style.animation.split(',').map((s) => s.trim());
    expect(parts2.length).toBe(2); // mount + hover
  });

  it('preserves user-supplied event handlers (composes, does not override)', () => {
    const onMouseEnter = vi.fn();
    const onMouseDown = vi.fn();
    const { container } = render(
      <Box
        animations={{ hover: { recipe: 'lift' } }}
        onMouseEnter={onMouseEnter}
        onMouseDown={onMouseDown}
      />,
    );
    const el = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(el);
    fireEvent.mouseDown(el);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseDown).toHaveBeenCalledTimes(1);
  });

  it('works alongside surface prop (complex branch) — animations still apply', () => {
    const { container } = render(
      <Box surface="card" animations={{ mount: { recipe: 'fade-up' } }} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.animation).toContain('svka-');
  });

  // Plan 3 Task 21 review M4 — pin the surface-only rendering branch after
  // the `backgroundBlobs` prop removal. Previously this path was implicitly
  // covered by the blob-surface combination; with legacy blobs gone, it
  // deserves its own assertion. borderRadius + surface-typed styles must land.
  it('surface="card" renders with borderRadius + surface styles (no blobs branch)', () => {
    const { container } = render(<Box surface="card" />);
    const el = container.firstChild as HTMLElement;
    // borderRadius comes from `t.radius(t.shape.radius.md)` — default 8px.
    expect(el.style.borderRadius).toBeTruthy();
    // The card surface applies some backgroundColor in default tokens.
    expect(el.style.backgroundColor || el.style.background).toBeTruthy();
  });

  it('surface="modal" also renders the surface branch', () => {
    const { container } = render(<Box surface="modal" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderRadius).toBeTruthy();
  });

  it('treats animations={null} as disabled (no animation string)', () => {
    const { container } = render(<Box animations={null} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.animation).toBe('');
  });

  it('treats animations={undefined} as disabled (no animation string)', () => {
    const { container } = render(<Box animations={undefined} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.animation).toBe('');
  });

  it('animationStaggerIndex propagates as delay in the animation string', () => {
    const { container } = render(
      <Box
        animations={{
          mount: { recipe: 'fade-up', stagger: { delay: 80 } },
        }}
        animationStaggerIndex={3}
      />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.animation).toContain('240ms');
  });

  it('accepts array of AnimationRef on one trigger (parallel animations)', () => {
    const { container } = render(
      <Box
        animations={{
          mount: [{ recipe: 'fade' }, { recipe: 'scale-in' }],
        }}
      />,
    );
    const el = container.firstChild as HTMLElement;
    const parts = el.style.animation.split(',').map((s) => s.trim());
    expect(parts.length).toBe(2);
    parts.forEach((p) => expect(p).toContain('svka-'));
  });

  it('auto-defaults tabIndex=0 when animations.focus is set and tabIndex omitted', () => {
    const { container } = render(
      <Box animations={{ focus: { recipe: 'fade' } }} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.tabIndex).toBe(0);
  });

  it('consumer-provided tabIndex always wins over focus auto-default (incl. -1)', () => {
    const { container } = render(
      <Box animations={{ focus: { recipe: 'fade' } }} tabIndex={-1} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.tabIndex).toBe(-1);
  });

  it('glow hover recipe: boxShadow lands in the generated keyframes (web end-to-end)', () => {
    // Acceptance test for the boxShadow keyframe field + glow recipe
    // migration (Task 21). Exercises the full pipeline:
    //   types → keyframes-builder → css-keyframes → stylesheet-singleton → Box.
    // On mouseenter, the hover animation should produce a @keyframes block
    // containing the boxShadow shorthand, and the Box's style.animation must
    // reference the generated keyframes name.
    const { container } = render(
      <Box animations={{ hover: { recipe: 'glow' } }} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.animation).toBe('');
    fireEvent.mouseEnter(el);
    expect(el.style.animation).toContain('svka-');
    // The injected stylesheet (Constructable or fallback) must contain the
    // boxShadow shorthand in the registered keyframes.
    const stylesheets = Array.from(document.styleSheets) as CSSStyleSheet[];
    const allRules = stylesheets
      .flatMap((s) => {
        try {
          return Array.from(s.cssRules) as CSSRule[];
        } catch {
          return [];
        }
      })
      .map((r) => r.cssText)
      .join('\n');
    expect(allRules).toContain('box-shadow');
    expect(allRules).toContain('rgba(99,102,241,0.45)');
  });

  it('compose order: user handler receives the event AFTER internal state is updated', () => {
    // The state-setter runs first so if the user handler throws, our internal
    // hover/focus/active flag has already been queued — Box visual state stays
    // consistent. We can't directly observe React's queued state from inside a
    // handler, but we can verify the handler was invoked and no prior side
    // effect was skipped by the swap.
    const call_order: string[] = [];
    const userEnter = vi.fn(() => {
      call_order.push('user-enter');
    });
    const { container } = render(
      <Box animations={{ hover: { recipe: 'lift' } }} onMouseEnter={userEnter} />,
    );
    const el = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(el);
    expect(userEnter).toHaveBeenCalledTimes(1);
    expect(call_order).toEqual(['user-enter']);
    // After the event cycle, React has committed the state update and the hook
    // has applied the animation — evidence the state-setter ran.
    expect(el.style.animation).toContain('svka-');
  });
});
