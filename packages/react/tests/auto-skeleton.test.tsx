import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import type { Spec } from 'mythik';

describe('auto-skeleton', () => {
  const specWithFetch: Spec = {
    root: 'page',
    initialActions: [{ action: 'fetch', params: { url: 'https://api.test/data', target: '/items' } }],
    elements: {
      page: { type: 'stack', children: ['title', 'content'] },
      title: { type: 'text', props: { content: 'Hello' }, skeleton: false },
      content: { type: 'text', props: { content: 'Data here' } },
    },
  };

  it('shows skeleton when loading is true and data is empty', () => {
    const { container } = render(
      React.createElement(MythikRenderer, {
        spec: specWithFetch,
        config: { initialState: { ui: { loading: true } } },
      }),
    );
    expect(container.querySelector('.sv-skeleton')).toBeTruthy();
  });

  it('does not show skeleton when autoSkeleton is false', () => {
    const { container } = render(
      React.createElement(MythikRenderer, {
        spec: specWithFetch,
        config: { initialState: { ui: { loading: true } } },
        autoSkeleton: false,
      }),
    );
    expect(container.querySelector('.sv-skeleton')).toBeNull();
  });

  it('respects skeleton: false on individual elements', () => {
    const { container } = render(
      React.createElement(MythikRenderer, {
        spec: specWithFetch,
        config: { initialState: { ui: { loading: true } } },
      }),
    );
    // title has skeleton: false — should render as text, not skeleton
    expect(container.textContent).toContain('Hello');
  });

  it('does not show skeleton for spec without initialActions fetch', () => {
    const specNoFetch: Spec = {
      root: 'page',
      elements: {
        page: { type: 'text', props: { content: 'Static' } },
      },
    };
    const { container } = render(
      React.createElement(MythikRenderer, {
        spec: specNoFetch,
        config: { initialState: { ui: { loading: true } } },
      }),
    );
    expect(container.querySelector('.sv-skeleton')).toBeNull();
  });

  it('does not show skeleton when data exists even if loading', () => {
    const { container } = render(
      React.createElement(MythikRenderer, {
        spec: specWithFetch,
        config: { initialState: { ui: { loading: true }, items: [{ name: 'Test' }] } },
      }),
    );
    expect(container.querySelector('.sv-skeleton')).toBeNull();
  });
});
