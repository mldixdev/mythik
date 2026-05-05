import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Text } from 'react-native';
import { Modal } from '../../src/primitives/modal.js';
import { Drawer } from '../../src/primitives/drawer.js';
import { Touchable } from '../../src/primitives/touchable.js';
import { Tabs } from '../../src/primitives/tabs.js';
import { Accordion } from '../../src/primitives/accordion.js';
import { Wizard } from '../../src/primitives/wizard.js';
import { List } from '../../src/primitives/list.js';
import { Screen } from '../../src/primitives/screen.js';
import { Skeleton } from '../../src/primitives/skeleton.js';
import { ToastContainer } from '../../src/primitives/toast-container.js';

describe('Modal', () => {
  it('renders children when visible', () => {
    render(<Modal visible><Text>Modal content</Text></Modal>);
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    render(<Modal visible={false}><Text>Hidden</Text></Modal>);
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('renders title', () => {
    render(<Modal visible title="Confirm" />);
    expect(screen.getByText('Confirm')).toBeTruthy();
  });

  it('calls onClose when backdrop pressed', () => {
    const onClose = vi.fn();
    render(<Modal visible onClose={onClose}><Text>Content</Text></Modal>);
    // The outer Pressable is the backdrop — it renders as a button
    const buttons = document.querySelectorAll('button');
    // First button is backdrop
    if (buttons[0]) fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Drawer', () => {
  it('renders children when visible', () => {
    render(<Drawer visible><Text>Drawer content</Text></Drawer>);
    expect(screen.getByText('Drawer content')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    render(<Drawer visible={false}><Text>Hidden</Text></Drawer>);
    expect(screen.queryByText('Hidden')).toBeNull();
  });
});

describe('Touchable', () => {
  it('renders children', () => {
    render(<Touchable><Text>Tap me</Text></Touchable>);
    expect(screen.getByText('Tap me')).toBeTruthy();
  });

  it('calls onClick on press', () => {
    const onClick = vi.fn();
    render(<Touchable onClick={onClick}><Text>Tap</Text></Touchable>);
    fireEvent.click(screen.getByText('Tap'));
    expect(onClick).toHaveBeenCalled();
  });

  it('has button role', () => {
    render(<Touchable testID="touch"><Text>X</Text></Touchable>);
    const el = screen.getByTestId('touch');
    expect(el.getAttribute('role')).toBe('button');
  });
});

describe('Tabs', () => {
  const items = [
    { key: 'tab1', label: 'Tab 1' },
    { key: 'tab2', label: 'Tab 2' },
  ];

  it('renders tab items', () => {
    render(<Tabs items={items} value="tab1" />);
    expect(screen.getByText('Tab 1')).toBeTruthy();
    expect(screen.getByText('Tab 2')).toBeTruthy();
  });

  it('calls onChange when tab pressed', () => {
    const onChange = vi.fn();
    render(<Tabs items={items} value="tab1" onChange={onChange} />);
    fireEvent.click(screen.getByText('Tab 2'));
    expect(onChange).toHaveBeenCalledWith('tab2');
  });

  it('renders children in tabpanel', () => {
    render(<Tabs items={items} value="tab1"><Text>Panel content</Text></Tabs>);
    expect(screen.getByText('Panel content')).toBeTruthy();
  });
});

describe('Accordion', () => {
  it('renders title', () => {
    render(<Accordion title="Details"><Text>Body</Text></Accordion>);
    expect(screen.getByText('Details')).toBeTruthy();
  });

  it('hides content by default', () => {
    render(<Accordion title="Info"><Text>Hidden body</Text></Accordion>);
    expect(screen.queryByText('Hidden body')).toBeNull();
  });

  it('shows content when defaultOpen', () => {
    render(<Accordion title="Info" defaultOpen><Text>Visible body</Text></Accordion>);
    expect(screen.getByText('Visible body')).toBeTruthy();
  });

  it('toggles content on header press', () => {
    render(<Accordion title="Toggle me"><Text>Body text</Text></Accordion>);
    expect(screen.queryByText('Body text')).toBeNull();
    fireEvent.click(screen.getByText('Toggle me'));
    expect(screen.getByText('Body text')).toBeTruthy();
  });
});

describe('Wizard', () => {
  it('renders step counter', () => {
    render(<Wizard currentStep={1} totalSteps={3} />);
    expect(screen.getByText('Step 2 of 3')).toBeTruthy();
  });

  it('renders children', () => {
    render(<Wizard currentStep={0} totalSteps={2}><Text>Step content</Text></Wizard>);
    expect(screen.getByText('Step content')).toBeTruthy();
  });
});

describe('List', () => {
  it('renders children with list role', () => {
    render(<List testID="list"><Text>Item 1</Text><Text>Item 2</Text></List>);
    const list = screen.getByTestId('list');
    expect(list.getAttribute('role')).toBe('list');
    expect(screen.getByText('Item 1')).toBeTruthy();
    expect(screen.getByText('Item 2')).toBeTruthy();
  });
});

describe('Screen', () => {
  it('renders title in header', () => {
    render(<Screen title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('renders children in content area', () => {
    render(<Screen><Text>Page content</Text></Screen>);
    expect(screen.getByText('Page content')).toBeTruthy();
  });

  it('renders without title', () => {
    render(<Screen testID="scr"><Text>No header</Text></Screen>);
    expect(screen.getByTestId('scr')).toBeTruthy();
    expect(screen.getByText('No header')).toBeTruthy();
  });
});

describe('Skeleton', () => {
  it('renders specified count of skeleton items', () => {
    render(<Skeleton count={3} testID="skel" />);
    const container = screen.getByTestId('skel');
    expect(container.children).toHaveLength(3);
  });

  it('defaults to 1 item', () => {
    render(<Skeleton testID="skel" />);
    const container = screen.getByTestId('skel');
    expect(container.children).toHaveLength(1);
  });
});

describe('ToastContainer', () => {
  function createMockStore(notifications: unknown[] = []) {
    const listeners = new Map<string, ((value: unknown) => void)[]>();
    return {
      get: (path: string) => path === '/ui/notifications' ? notifications : undefined,
      set: vi.fn(),
      subscribe: vi.fn(() => () => {}),
      subscribePath: vi.fn((path: string, cb: (value: unknown) => void) => {
        if (!listeners.has(path)) listeners.set(path, []);
        listeners.get(path)!.push(cb);
        // Fire immediately with current value
        if (path === '/ui/notifications') cb(notifications);
        return () => { listeners.set(path, (listeners.get(path) ?? []).filter(l => l !== cb)); };
      }),
      getSnapshot: () => ({}),
    };
  }

  it('renders nothing when no notifications', () => {
    const store = createMockStore([]);
    const { container } = render(<ToastContainer store={store} onDismiss={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders notifications from store', () => {
    const notifications = [
      { id: '1', message: 'Saved', type: 'success', timestamp: Date.now() },
      { id: '2', message: 'Error occurred', type: 'error', timestamp: Date.now() },
    ];
    const store = createMockStore(notifications);
    render(<ToastContainer store={store} onDismiss={() => {}} testID="toasts" />);
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Error occurred')).toBeTruthy();
  });

  it('renders notification title when present', () => {
    const notifications = [
      { id: '1', message: 'Details here', type: 'info', title: 'Alert', timestamp: Date.now() },
    ];
    const store = createMockStore(notifications);
    render(<ToastContainer store={store} onDismiss={() => {}} />);
    expect(screen.getByText('Alert')).toBeTruthy();
    expect(screen.getByText('Details here')).toBeTruthy();
  });

  it('calls onDismiss when notification pressed', () => {
    const onDismiss = vi.fn();
    const notifications = [
      { id: '1', message: 'Click me', type: 'info', timestamp: Date.now() },
    ];
    const store = createMockStore(notifications);
    render(<ToastContainer store={store} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Click me'));
    expect(onDismiss).toHaveBeenCalledWith('1');
  });
});
