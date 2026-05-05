import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Skeleton } from '../src/primitives/skeleton.js';

describe('Skeleton primitive', () => {
  it('renders a rect skeleton by default', () => {
    const { container } = render(React.createElement(Skeleton, {}));
    const el = container.firstChild as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.style.width).toBe('100%');
    expect(el.style.borderRadius).toBe('6px');
  });

  it('renders text variant with 4px border-radius', () => {
    const { container } = render(React.createElement(Skeleton, { variant: 'text' }));
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderRadius).toBe('4px');
  });

  it('renders circle variant', () => {
    const { container } = render(React.createElement(Skeleton, { variant: 'circle', height: 40 }));
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderRadius).toBe('50%');
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('40px');
  });

  it('renders multiple items with count', () => {
    const { container } = render(React.createElement(Skeleton, { count: 3, height: 16 }));
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.children.length).toBe(3);
  });

  it('applies custom width and height', () => {
    const { container } = render(React.createElement(Skeleton, { width: '80%', height: 24 }));
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('80%');
    expect(el.style.height).toBe('24px');
  });

  it('applies custom gap between multiple items', () => {
    const { container } = render(React.createElement(Skeleton, { count: 2, gap: 12 }));
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.gap).toBe('12px');
  });

  it('applies dark class when _tokens surface is dark', () => {
    const { container } = render(React.createElement(Skeleton, { _tokens: { colors: { surface: '#1F2937' } } }));
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('sv-skeleton-dark');
  });

  it('applies light class when _tokens surface is light', () => {
    const { container } = render(React.createElement(Skeleton, { _tokens: { colors: { surface: '#FFFFFF' } } }));
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('sv-skeleton');
    expect(el.className).not.toContain('sv-skeleton-dark');
  });
});
