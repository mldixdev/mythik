import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemorySpecStore } from 'mythik';
import type { AppSpec, Spec } from 'mythik';
import { MythikApp } from '../src/MythikApp.js';

const itemsPath = '/layout/items';

function makeDashboardSpec(options: { persistence?: boolean } = {}): Spec {
  return {
    root: 'dashboard',
    editorSessions: {
      'floor-layout': {
        paths: [itemsPath],
        ...(options.persistence
          ? {
              persistence: {
                url: '/api/floor-layout',
                method: 'PUT',
                body: 'trackedPaths',
              },
            }
          : {}),
      },
    },
    elements: {
      dashboard: {
        type: 'stack',
        children: ['title', 'makeDirty', 'markSaved', 'openReports', 'pendingPanel'],
      },
      title: { type: 'text', props: { content: 'Dashboard Content' } },
      makeDirty: {
        type: 'button',
        props: { label: 'Make dirty' },
        on: {
          press: {
            action: 'editorCommit',
            params: {
              session: 'floor-layout',
              label: 'Dirty edit',
              changes: [{ path: itemsPath, value: [{ id: 'item-1', label: 'Dirty' }] }],
            },
          },
        },
      },
      markSaved: {
        type: 'button',
        props: { label: 'Mark saved' },
        on: { press: { action: 'editorMarkSaved', params: { session: 'floor-layout' } } },
      },
      openReports: {
        type: 'button',
        props: { label: 'Open reports' },
        on: { press: { action: 'navigateScreen', params: { screen: 'reports' } } },
      },
      pendingPanel: {
        type: 'box',
        visible: { $state: '/ui/navigationGuard/pending' },
        children: ['pendingTitle', 'continueButton', 'saveContinueButton', 'discardButton', 'cancelButton'],
      },
      pendingTitle: { type: 'text', props: { content: 'Unsaved changes' } },
      continueButton: {
        type: 'button',
        props: { label: 'Continue' },
        on: { press: { action: 'navigationGuardProceed', params: {} } },
      },
      saveContinueButton: {
        type: 'button',
        props: { label: 'Save and continue' },
        on: { press: { action: 'navigationGuardSaveAndProceed', params: {} } },
      },
      discardButton: {
        type: 'button',
        props: { label: 'Discard and continue' },
        on: { press: { action: 'navigationGuardDiscardAndProceed', params: {} } },
      },
      cancelButton: {
        type: 'button',
        props: { label: 'Cancel' },
        on: { press: { action: 'navigationGuardCancel', params: {} } },
      },
    },
  };
}

function makeReportsSpec(): Spec {
  return {
    root: 'reports',
    elements: {
      reports: { type: 'text', props: { content: 'Reports Content' } },
    },
  };
}

function makeAppSpec(): AppSpec {
  return {
    type: 'app',
    name: 'guard-test',
    navigation: {
      type: 'sidebar',
      initialScreen: 'dashboard',
      editorSessionGuard: {
        enabled: true,
        sessions: ['floor-layout'],
      },
    },
    screens: {
      dashboard: { label: 'Dashboard' },
      reports: { label: 'Reports' },
    },
    sharedState: {
      layout: {
        items: [{ id: 'item-1', label: 'Clean' }],
      },
    },
    layout: {
      root: 'shell',
      elements: {
        shell: { type: 'box', children: ['outlet'] },
        outlet: { type: 'screen-outlet' },
      },
    },
  };
}

function renderGuardedApp(options: {
  dashboardSpec?: Spec;
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
} = {}) {
  const specStore = new MemorySpecStore({
    dashboard: options.dashboardSpec ?? makeDashboardSpec(),
    reports: makeReportsSpec(),
  });
  return render(<MythikApp appSpec={makeAppSpec()} specStore={specStore} fetcher={options.fetcher} />);
}

describe('editor session navigation guard in MythikApp', () => {
  it('blocks app navigation and shows pending JSON modal when the mounted editor session is dirty', async () => {
    const user = userEvent.setup();
    renderGuardedApp();

    await screen.findByText('Dashboard Content');
    await user.click(screen.getByText('Make dirty'));
    await user.click(screen.getByText('Open reports'));

    expect(await screen.findByText('Unsaved changes')).toBeTruthy();
    expect(screen.queryByText('Reports Content')).toBeNull();
  });

  it('does not continue a blocked navigation through navigationGuardProceed while dirty', async () => {
    const user = userEvent.setup();
    renderGuardedApp();

    await screen.findByText('Dashboard Content');
    await user.click(screen.getByText('Make dirty'));
    await user.click(screen.getByText('Open reports'));
    await user.click(await screen.findByText('Continue'));

    expect(await screen.findByText('Unsaved changes')).toBeTruthy();
    expect(screen.queryByText('Reports Content')).toBeNull();
  });

  it('continues a blocked navigation through navigationGuardProceed after save clears dirty state', async () => {
    const user = userEvent.setup();
    renderGuardedApp();

    await screen.findByText('Dashboard Content');
    await user.click(screen.getByText('Make dirty'));
    await user.click(screen.getByText('Open reports'));
    await user.click(await screen.findByText('Mark saved'));
    await user.click(await screen.findByText('Continue'));

    expect(await screen.findByText('Reports Content')).toBeTruthy();
  });

  it('discards the mounted editor session before continuing', async () => {
    const user = userEvent.setup();
    renderGuardedApp();

    await screen.findByText('Dashboard Content');
    await user.click(screen.getByText('Make dirty'));
    await user.click(screen.getByText('Open reports'));
    await user.click(await screen.findByText('Discard and continue'));

    expect(await screen.findByText('Reports Content')).toBeTruthy();
  });

  it('saves the mounted editor session before continuing', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    renderGuardedApp({
      dashboardSpec: makeDashboardSpec({ persistence: true }),
      fetcher,
    });

    await screen.findByText('Dashboard Content');
    await user.click(screen.getByText('Make dirty'));
    await user.click(screen.getByText('Open reports'));
    await user.click(await screen.findByText('Save and continue'));

    expect(await screen.findByText('Reports Content')).toBeTruthy();
    expect(fetcher).toHaveBeenCalledWith('/api/floor-layout', expect.objectContaining({ method: 'PUT' }));
  });

  it('prevents browser unload only while a guarded session is dirty', async () => {
    const user = userEvent.setup();
    const { unmount } = renderGuardedApp();

    await screen.findByText('Dashboard Content');
    const cleanEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    await user.click(screen.getByText('Make dirty'));
    await waitFor(() => {
      const dirtyEvent = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(dirtyEvent);
      expect(dirtyEvent.defaultPrevented).toBe(true);
    });

    unmount();
    const afterUnmountEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(afterUnmountEvent);
    expect(afterUnmountEvent.defaultPrevented).toBe(false);
  });
});
