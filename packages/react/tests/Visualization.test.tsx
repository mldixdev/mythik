import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import type { Spec } from 'mythik';

describe('Visualization Primitives', () => {
  it('renders bar chart', () => {
    const spec: Spec = {
      root: 'chart',
      elements: {
        chart: {
          type: 'bar-chart',
          props: {
            data: [
              { label: 'Jan', value: 100 },
              { label: 'Feb', value: 200 },
              { label: 'Mar', value: 150 },
            ],
            height: 200,
          },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByLabelText('Bar chart')).toBeTruthy();
    expect(screen.getByText('Jan')).toBeTruthy();
    expect(screen.getByText('Feb')).toBeTruthy();
  });

  it('renders line chart', () => {
    const spec: Spec = {
      root: 'chart',
      elements: {
        chart: {
          type: 'line-chart',
          props: {
            data: [{ label: 'Q1', value: 10 }, { label: 'Q2', value: 20 }],
          },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByLabelText('Line chart')).toBeTruthy();
  });

  it('renders pie chart', () => {
    const spec: Spec = {
      root: 'chart',
      elements: {
        chart: {
          type: 'pie-chart',
          props: {
            data: [
              { label: 'A', value: 30 },
              { label: 'B', value: 70 },
            ],
            size: 150,
          },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByLabelText('Pie chart')).toBeTruthy();
  });

  it('renders area chart', () => {
    const spec: Spec = {
      root: 'chart',
      elements: {
        chart: {
          type: 'area-chart',
          props: {
            data: [{ label: 'Mon', value: 5 }, { label: 'Tue', value: 12 }],
          },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByLabelText('Area chart')).toBeTruthy();
  });

  it('renders table with data', () => {
    const spec: Spec = {
      root: 'tbl',
      elements: {
        tbl: {
          type: 'table',
          props: {
            data: [
              { name: 'Alice', age: 30 },
              { name: 'Bob', age: 25 },
            ],
            columns: [
              { field: 'name', label: 'Name' },
              { field: 'age', label: 'Age' },
            ],
          },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('renders kanban board', () => {
    const spec: Spec = {
      root: 'board',
      elements: {
        board: {
          type: 'kanban-board',
          props: {
            columns: [
              { id: 'todo', title: 'To Do' },
              { id: 'done', title: 'Done' },
            ],
          },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByLabelText('Kanban board')).toBeTruthy();
    expect(screen.getByText('To Do')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
  });

  it('renders spatial map', () => {
    const spec: Spec = {
      root: 'map',
      elements: {
        map: {
          type: 'spatial-map',
          props: {
            viewBox: { x: 0, y: 0, width: 400, height: 240 },
            zones: [
              {
                id: 'floor',
                label: 'Floor',
                shape: { type: 'path', d: 'M0 0 L320 0 L320 80 L400 80 L400 240 L0 240 Z' },
              },
            ],
            items: [
              {
                id: 'item-1',
                label: 'A1',
                position: { x: 120, y: 100 },
                shape: { type: 'circle', radius: 36 },
                status: 'available',
              },
            ],
            statusStyles: {
              available: { fill: '#dcfce7', stroke: '#22c55e', text: '#14532d' },
            },
            ariaLabel: 'Test spatial map',
          },
        },
      },
    };

    render(<MythikRenderer spec={spec} />);

    expect(screen.getByLabelText('Test spatial map')).toBeTruthy();
    expect(screen.getByTestId('spatial-item-item-1')).toBeTruthy();
  });

  it('renders file upload', () => {
    const spec: Spec = {
      root: 'upload',
      elements: {
        upload: { type: 'file-upload', props: { label: 'Upload document' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Upload document')).toBeTruthy();
  });

  it('renders audio player', () => {
    const spec: Spec = {
      root: 'audio',
      elements: {
        audio: { type: 'audio-player', props: { label: 'Recording', src: 'test.mp3' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Recording')).toBeTruthy();
  });
});
