import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { createStateStore } from 'mythik';

// Mock Motion to avoid animation complexity in unit tests
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) => {
      const { children, initial, animate, exit, transition, layout, layoutId, whileHover, whileTap, whileFocus, ...rest } = props;
      return React.createElement('div', { ...rest, ref }, children as React.ReactNode);
    }),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  LayoutGroup: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

// Import after mock
import { ToastContainer } from '../src/primitives/toast-container.js';

function setup(notifications: Record<string, unknown>[] = []) {
  const store = createStateStore({ ui: { notifications } });
  const dismiss = vi.fn((id: string) => {
    const current = (store.get('/ui/notifications') as Record<string, unknown>[]) ?? [];
    store.set('/ui/notifications', current.filter(n => n.id !== id));
  });
  return { store, dismiss };
}

describe('ToastContainer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders notifications from store', () => {
    const { store, dismiss } = setup([
      { id: '1', message: 'Hello', type: 'info', timestamp: 1 },
      { id: '2', message: 'World', type: 'success', timestamp: 2 },
    ]);
    render(<ToastContainer store={store} onDismiss={dismiss} />);
    expect(screen.getByText('Hello')).toBeTruthy();
    expect(screen.getByText('World')).toBeTruthy();
  });

  it('renders correct icon per type', () => {
    const { store, dismiss } = setup([
      { id: '1', message: 'OK', type: 'success', timestamp: 1 },
      { id: '2', message: 'Bad', type: 'error', timestamp: 2 },
      { id: '3', message: 'Hmm', type: 'warning', timestamp: 3 },
      { id: '4', message: 'FYI', type: 'info', timestamp: 4 },
    ]);
    render(<ToastContainer store={store} onDismiss={dismiss} />);
    expect(document.querySelectorAll('[data-toast-icon]')).toHaveLength(4);
    expect(document.querySelector('[data-toast-icon="success"]')).toBeTruthy();
    expect(document.querySelector('[data-toast-icon="error"]')).toBeTruthy();
    expect(document.querySelector('[data-toast-icon="warning"]')).toBeTruthy();
    expect(document.querySelector('[data-toast-icon="info"]')).toBeTruthy();
  });

  it('calls onDismiss when close button clicked', () => {
    const { store, dismiss } = setup([
      { id: 'abc', message: 'Dismiss me', type: 'info', timestamp: 1 },
    ]);
    render(<ToastContainer store={store} onDismiss={dismiss} />);
    const closeBtn = document.querySelector('[data-toast-close]') as HTMLElement;
    fireEvent.click(closeBtn);
    expect(dismiss).toHaveBeenCalledWith('abc');
  });

  it('auto-dismisses after duration', () => {
    const { store, dismiss } = setup([
      { id: 'auto', message: 'Going away', type: 'info', timestamp: 1 },
    ]);
    render(<ToastContainer store={store} onDismiss={dismiss} duration={3000} />);
    expect(dismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(dismiss).toHaveBeenCalledWith('auto');
  });

  it('does not auto-dismiss when notification duration is null', () => {
    const { store, dismiss } = setup([
      { id: 'sticky', message: 'Staying', type: 'warning', duration: null, timestamp: 1 },
    ]);
    render(<ToastContainer store={store} onDismiss={dismiss} duration={4000} />);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('per-notification duration overrides container default', () => {
    const { store, dismiss } = setup([
      { id: 'quick', message: 'Fast', type: 'info', duration: 1000, timestamp: 1 },
    ]);
    render(<ToastContainer store={store} onDismiss={dismiss} duration={5000} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(dismiss).toHaveBeenCalledWith('quick');
  });

  it('respects maxVisible — only renders up to limit', () => {
    const notifications = Array.from({ length: 8 }, (_, i) => ({
      id: `n${i}`, message: `Msg ${i}`, type: 'info', timestamp: i,
    }));
    const { store, dismiss } = setup(notifications);
    render(<ToastContainer store={store} onDismiss={dismiss} maxVisible={5} />);
    const toasts = document.querySelectorAll('[data-toast]');
    expect(toasts).toHaveLength(5);
  });

  it('renders title when provided', () => {
    const { store, dismiss } = setup([
      { id: '1', title: 'Error', message: 'Something broke', type: 'error', timestamp: 1 },
    ]);
    render(<ToastContainer store={store} onDismiss={dismiss} />);
    expect(screen.getByText('Error')).toBeTruthy();
    expect(screen.getByText('Something broke')).toBeTruthy();
  });

  it('renders progress bar only for timed toasts, not persistent', () => {
    const { store, dismiss } = setup([
      { id: 'timed', message: 'Has bar', type: 'info', timestamp: 1 },
      { id: 'sticky', message: 'No bar', type: 'info', duration: null, timestamp: 2 },
    ]);
    render(<ToastContainer store={store} onDismiss={dismiss} duration={4000} />);
    const bars = document.querySelectorAll('[data-toast-progress]');
    expect(bars).toHaveLength(1);
  });

  it('applies light theme colors by default', () => {
    const { store, dismiss } = setup([
      { id: '1', message: 'Success', type: 'success', timestamp: 1 },
    ]);
    render(<ToastContainer store={store} onDismiss={dismiss} />);
    const toast = document.querySelector('[data-toast]') as HTMLElement;
    expect(toast.style.borderLeftColor).toBe('rgb(16, 185, 129)');
    // Light bg for success
    expect(toast.style.backgroundColor).toBe('rgb(236, 253, 245)');
  });

  it('applies dark theme colors when theme is dark', () => {
    const store = createStateStore({ ui: { notifications: [
      { id: '1', message: 'Error occurred', type: 'error', timestamp: 1 },
    ] }, preferences: { theme: 'dark' } });
    const dismiss = vi.fn();
    render(<ToastContainer store={store} onDismiss={dismiss} />);
    const toast = document.querySelector('[data-toast]') as HTMLElement;
    expect(toast.style.borderLeftColor).toBe('rgb(239, 68, 68)');
    // Dark bg for error
    expect(toast.style.backgroundColor).toBe('rgb(59, 17, 20)');
  });

  it('updates when store notifications change — adding', () => {
    const { store, dismiss } = setup([]);
    render(<ToastContainer store={store} onDismiss={dismiss} />);
    expect(document.querySelectorAll('[data-toast]')).toHaveLength(0);

    act(() => {
      store.set('/ui/notifications', [
        { id: 'new', message: 'New toast', type: 'info', timestamp: 1 },
      ]);
    });
    expect(screen.getByText('New toast')).toBeTruthy();
  });

  it('updates when store notifications change — removing', () => {
    const { store, dismiss } = setup([
      { id: 'a', message: 'First', type: 'info', timestamp: 1 },
      { id: 'b', message: 'Second', type: 'success', timestamp: 2 },
    ]);
    render(<ToastContainer store={store} onDismiss={dismiss} />);
    expect(document.querySelectorAll('[data-toast]')).toHaveLength(2);

    act(() => {
      store.set('/ui/notifications', [
        { id: 'a', message: 'First', type: 'info', timestamp: 1 },
      ]);
    });
    expect(document.querySelectorAll('[data-toast]')).toHaveLength(1);
    expect(screen.getByText('First')).toBeTruthy();
  });

  it('clears pending timers on unmount', () => {
    const { store, dismiss } = setup([
      { id: 'x', message: 'Temp', type: 'info', timestamp: 1 },
    ]);
    const { unmount } = render(<ToastContainer store={store} onDismiss={dismiss} duration={5000} />);
    unmount();
    act(() => { vi.advanceTimersByTime(10000); });
    expect(dismiss).not.toHaveBeenCalled();
  });
});

// --- MythikRenderer integration tests ---
import { MythikRenderer } from '../src/MythikRenderer.js';
import type { Spec } from 'mythik';

describe('MythikRenderer toast integration', () => {
  it('auto-injects ToastContainer when no toast-container in spec', () => {
    const spec: Spec = {
      root: 'main',
      elements: {
        main: { type: 'box', props: {}, children: [] },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(document.querySelector('[data-toast-container]')).toBeTruthy();
  });

  it('does NOT auto-inject when spec has toast-container element', () => {
    const spec: Spec = {
      root: 'main',
      elements: {
        main: { type: 'stack', props: { direction: 'vertical' }, children: ['content', 'toasts'] },
        content: { type: 'text', props: { content: 'Hello' }, children: [] },
        toasts: { type: 'toast-container', props: { position: 'bottom-center' }, children: [] },
      },
    };
    render(<MythikRenderer spec={spec} />);
    const containers = document.querySelectorAll('[data-toast-container]');
    expect(containers).toHaveLength(1);
  });
});
