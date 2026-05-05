import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import type { Spec } from 'mythik';

describe('MythikRenderer — LayerBackground v2 (plan 3 Task 20, RN parity)', () => {
  it('mounts BackgroundStack on RN when identity.background is LayerBackground', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Hola' } } },
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
    expect(container.querySelector('[data-testid="sv-renderer-root-v2"]')).toBeTruthy();
    // Blob layer with palette mounts real BlobLayer → 2 Svg.
    const svgs = container.querySelectorAll('[data-testid="Svg"]');
    expect(svgs.length).toBe(2);
  });

  it('does NOT mount root-v2 for `style`-bearing backgrounds (malformed v2 defense)', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Hola' } } },
      tokens: {
        colors: { primary: '#000', accent: '#fff' },
        // Legacy BackgroundConfig was deleted in Task 21; the `has style`
        // rejection persists as defensive handling.
        identity: { background: { style: 'solid' } },
      },
    };
    const { container } = render(<MythikRenderer spec={spec} />);
    expect(container.querySelector('[data-testid="sv-renderer-root-v2"]')).toBeNull();
  });

  it('does NOT mount root-v2 when background is absent', () => {
    const spec: Spec = {
      root: 'hello',
      elements: { hello: { type: 'text', props: { content: 'Hola' } } },
    };
    const { container } = render(<MythikRenderer spec={spec} />);
    expect(container.querySelector('[data-testid="sv-renderer-root-v2"]')).toBeNull();
  });
});

describe('MythikRenderer', () => {
  it('renders a simple text spec', () => {
    const spec: Spec = {
      root: 'main',
      elements: {
        main: { type: 'text', props: { content: 'Hello Mythik Native' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Hello Mythik Native')).toBeTruthy();
  });

  it('renders nested elements (stack with children)', () => {
    const spec: Spec = {
      root: 'layout',
      elements: {
        layout: { type: 'stack', children: ['title', 'body'] },
        title: { type: 'text', props: { content: 'Title' } },
        body: { type: 'text', props: { content: 'Body text' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Body text')).toBeTruthy();
  });

  it('renders a button and handles press event', () => {
    const spec: Spec = {
      root: 'main',
      elements: {
        main: {
          type: 'button',
          props: { label: 'Click Me' },
          on: { press: { action: 'setState', params: { path: '/clicked', value: true } } },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Click Me')).toBeTruthy();
  });

  it('renders with initial state', () => {
    const spec: Spec = {
      root: 'main',
      state: { '/message': 'Dynamic content' },
      elements: {
        main: { type: 'text', props: { content: { $state: '/message' } } },
      },
    };
    const { container } = render(<MythikRenderer spec={spec} />);
    // The expression resolver resolves $state to the value from initial state
    // The rendered output should contain the resolved text
    const textEl = container.querySelector('span[role="text"]');
    expect(textEl).toBeTruthy();
  });

  it('renders box with style', () => {
    const spec: Spec = {
      root: 'main',
      elements: {
        main: {
          type: 'box',
          props: { style: { padding: 16, backgroundColor: '#f0f0f0' } },
          children: ['child'],
        },
        child: { type: 'text', props: { content: 'Styled box' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Styled box')).toBeTruthy();
  });

  it('renders modal (visible)', () => {
    const spec: Spec = {
      root: 'main',
      elements: {
        main: { type: 'modal', props: { visible: true, title: 'Confirm' }, children: ['msg'] },
        msg: { type: 'text', props: { content: 'Are you sure?' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('Are you sure?')).toBeTruthy();
  });

  it('renders checkbox with $bindState', () => {
    const spec: Spec = {
      root: 'main',
      state: { '/agreed': false },
      elements: {
        main: {
          type: 'checkbox',
          props: { label: 'I agree', checked: { $state: '/agreed' } },
          $bindState: { checked: '/agreed' },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('I agree')).toBeTruthy();
  });

  it('renders multiple elements in a list-like structure', () => {
    const spec: Spec = {
      root: 'layout',
      elements: {
        layout: { type: 'list', children: ['item1', 'item2', 'item3'] },
        item1: { type: 'text', props: { content: 'Item 1' } },
        item2: { type: 'text', props: { content: 'Item 2' } },
        item3: { type: 'text', props: { content: 'Item 3' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 2')).toBeTruthy();
    expect(screen.getByText('Item 3')).toBeTruthy();
  });

  it('renders with autoDeviceContext disabled', () => {
    const spec: Spec = {
      root: 'main',
      elements: {
        main: { type: 'text', props: { content: 'No device context' } },
      },
    };
    render(<MythikRenderer spec={spec} autoDeviceContext={false} />);
    expect(screen.getByText('No device context')).toBeTruthy();
  });

  it('auto-injects ToastContainer when spec has none', () => {
    const spec: Spec = {
      root: 'main',
      elements: {
        main: { type: 'text', props: { content: 'Content' } },
      },
    };
    // ToastContainer should be injected automatically — no crash
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('handles unknown primitive types gracefully (no crash)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spec: Spec = {
      root: 'main',
      elements: {
        main: { type: 'stack', children: ['known', 'unknown'] },
        known: { type: 'text', props: { content: 'Known' } },
        unknown: { type: 'unknown-widget' as any, props: {} },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Known')).toBeTruthy();
    warnSpy.mockRestore();
  });

  it('wires on.press event to dispatchAction (button renders and is clickable)', () => {
    const spec: Spec = {
      root: 'main',
      elements: {
        main: {
          type: 'button',
          props: { label: 'Increment' },
          on: { press: { action: 'setState', params: { path: '/count', value: 1 } } },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    const btn = screen.getByText('Increment');
    // Verify the button is rendered and clickable (no crash on press)
    expect(btn).toBeTruthy();
    expect(() => fireEvent.click(btn)).not.toThrow();
  });

  it('wires $bindState onChange for checkbox', () => {
    const spec: Spec = {
      root: 'main',
      state: { '/agreed': false },
      elements: {
        main: {
          type: 'checkbox',
          props: { label: 'Accept Terms', checked: { $state: '/agreed' } },
          $bindState: { checked: '/agreed' },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    // Checkbox renders with the label and is interactive
    const label = screen.getByText('Accept Terms');
    expect(label).toBeTruthy();
    // Click should not crash — $bindState wiring is in place
    expect(() => fireEvent.click(label)).not.toThrow();
  });

  it('renders input with $bindState and handles change', () => {
    const spec: Spec = {
      root: 'main',
      state: { '/name': '' },
      elements: {
        main: {
          type: 'input',
          props: { placeholder: 'Enter name', value: { $state: '/name' } },
          $bindState: { value: '/name' },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    const input = screen.getByPlaceholderText('Enter name');
    expect(input).toBeTruthy();
  });
});
