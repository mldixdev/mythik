import { describe, it, expect } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import type { Spec } from 'mythik';

const buildSpec = (): Spec => ({
  root: 'page',
  elements: {
    page: {
      type: 'stack',
      props: { direction: 'vertical' },
      children: ['tbl-1', 'status-text'],
    },
    'tbl-1': {
      type: 'table',
      props: {
        data: { $state: '/items' },
        columns: [
          { id: 'name', label: 'Name', field: 'name' },
          {
            id: 'actions-col',
            label: '',
            actions: [{
              icon: 'pencil-simple',
              onPress: [{
                action: 'setState',
                params: {
                  statePath: '/ui/lastClickedId',
                  value: { $state: '/ui/selectedRow/id' },
                },
              }],
            }],
          },
        ],
      },
    },
    'status-text': {
      type: 'text',
      props: {
        content: { $template: 'lastClicked: ${/ui/lastClickedId}' },
      },
    },
  },
});

const initialState = {
  items: [
    { id: 'row-a', name: 'Alpha' },
    { id: 'row-b', name: 'Beta' },
  ],
};

describe('Table column action — press-time $state resolution (v49 Item D)', () => {
  it('writes row A id at press when row A action clicked', async () => {
    render(<MythikRenderer spec={buildSpec()} config={{ initialState }} />);

    const actionButtons = await screen.findAllByRole('button');
    expect(actionButtons.length).toBeGreaterThanOrEqual(2);
    const rowAActionBtn = actionButtons[0];

    await act(async () => {
      fireEvent.click(rowAActionBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('lastClicked: row-a')).toBeTruthy();
    });
  });

  it('TWO-CLICK CRITICAL: row B click writes row B id (not stale row A)', async () => {
    render(<MythikRenderer spec={buildSpec()} config={{ initialState }} />);

    const actionButtons = await screen.findAllByRole('button');
    const rowAActionBtn = actionButtons[0];
    const rowBActionBtn = actionButtons[1];

    await act(async () => {
      fireEvent.click(rowAActionBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('lastClicked: row-a')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(rowBActionBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('lastClicked: row-b')).toBeTruthy();
    });
  });
});
