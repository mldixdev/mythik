import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import type { Spec } from 'mythik';

describe('Structural Container Primitives', () => {
  it('renders a modal', () => {
    const spec: Spec = {
      root: 'dialog',
      elements: {
        dialog: { type: 'modal', props: { visible: true }, children: ['msg'] },
        msg: { type: 'text', props: { content: 'Are you sure?' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Are you sure?')).toBeTruthy();
  });

  it('hides modal when visible is false', () => {
    const spec: Spec = {
      root: 'layout',
      elements: {
        layout: { type: 'stack', children: ['text', 'dialog'] },
        text: { type: 'text', props: { content: 'Main content' } },
        dialog: { type: 'modal', props: { visible: false }, children: ['msg'] },
        msg: { type: 'text', props: { content: 'Hidden modal' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Main content')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders tabs with items', () => {
    const spec: Spec = {
      root: 'tabview',
      elements: {
        tabview: {
          type: 'tabs',
          props: {
            value: 'general',
            items: [
              { key: 'general', label: 'General' },
              { key: 'vitals', label: 'Vitals' },
            ],
          },
          children: ['content'],
        },
        content: { type: 'text', props: { content: 'Tab content here' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByRole('tablist')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByText('General')).toBeTruthy();
    expect(screen.getByText('Vitals')).toBeTruthy();
  });

  it('renders accordion', () => {
    const spec: Spec = {
      root: 'acc',
      elements: {
        acc: { type: 'accordion', props: { title: 'Details', defaultOpen: true }, children: ['inner'] },
        inner: { type: 'text', props: { content: 'Accordion content' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText('Accordion content')).toBeTruthy();
  });

  it('renders wizard with progress', () => {
    const spec: Spec = {
      root: 'wiz',
      elements: {
        wiz: { type: 'wizard', props: { currentStep: 1, totalSteps: 3 }, children: ['step'] },
        step: { type: 'text', props: { content: 'Step content' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.getByText('Step 2 of 3')).toBeTruthy();
    expect(screen.getByText('Step content')).toBeTruthy();
  });

  it('renders screen with title', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'screen', props: { title: 'Patient List' }, children: ['content'] },
        content: { type: 'text', props: { content: 'Page body' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByText('Patient List')).toBeTruthy();
    expect(screen.getByText('Page body')).toBeTruthy();
  });

  it('renders drawer', () => {
    const spec: Spec = {
      root: 'nav',
      elements: {
        nav: { type: 'drawer', props: { visible: true, side: 'left' }, children: ['menu'] },
        menu: { type: 'text', props: { content: 'Menu items' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByRole('navigation')).toBeTruthy();
    expect(screen.getByText('Menu items')).toBeTruthy();
  });

  it('hides drawer when visible is false', () => {
    const spec: Spec = {
      root: 'layout',
      elements: {
        layout: { type: 'stack', children: ['text', 'nav'] },
        text: { type: 'text', props: { content: 'Main content' } },
        nav: { type: 'drawer', props: { visible: false, side: 'left' }, children: ['menu'] },
        menu: { type: 'text', props: { content: 'Hidden drawer' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Main content')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('drawer renders with auto-visibility (no explicit visible prop)', () => {
    // When engine includes drawer in tree (auto-visibility passed),
    // the component should render — visible defaults to true
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', children: ['content', 'side-drawer'] },
        content: { type: 'text', props: { content: 'Page content' } },
        'side-drawer': { type: 'drawer', props: { side: 'right' }, children: ['detail'] },
        detail: { type: 'text', props: { content: 'Drawer detail' } },
      },
    };
    // Using auto-visibility: set state so drawer IS visible
    render(<MythikRenderer spec={spec} config={{ initialState: { ui: { drawers: { 'side-drawer': true } } } }} />);
    expect(screen.getByRole('navigation')).toBeTruthy();
    expect(screen.getByText('Drawer detail')).toBeTruthy();
  });

  it('drawer hidden by auto-visibility does not render', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', children: ['content', 'side-drawer'] },
        content: { type: 'text', props: { content: 'Page content' } },
        'side-drawer': { type: 'drawer', props: { side: 'right' }, children: ['detail'] },
        detail: { type: 'text', props: { content: 'Drawer detail' } },
      },
    };
    // Auto-visibility: drawers state is empty, so drawer should be hidden
    render(<MythikRenderer spec={spec} config={{ initialState: { ui: { drawers: {} } } }} />);
    expect(screen.getByText('Page content')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('modal renders with auto-visibility (no explicit visible prop)', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', children: ['content', 'confirm-modal'] },
        content: { type: 'text', props: { content: 'Page content' } },
        'confirm-modal': { type: 'modal', props: { title: 'Confirm' }, children: ['msg'] },
        msg: { type: 'text', props: { content: 'Are you sure?' } },
      },
    };
    render(<MythikRenderer spec={spec} config={{ initialState: { ui: { modals: { 'confirm-modal': true } } } }} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Are you sure?')).toBeTruthy();
  });

  it('modal hidden by auto-visibility does not render', () => {
    const spec: Spec = {
      root: 'page',
      elements: {
        page: { type: 'stack', children: ['content', 'confirm-modal'] },
        content: { type: 'text', props: { content: 'Page content' } },
        'confirm-modal': { type: 'modal', props: { title: 'Confirm' }, children: ['msg'] },
        msg: { type: 'text', props: { content: 'Are you sure?' } },
      },
    };
    render(<MythikRenderer spec={spec} config={{ initialState: { ui: { modals: {} } } }} />);
    expect(screen.getByText('Page content')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
