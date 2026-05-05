import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MythikRenderer } from '../src/MythikRenderer.js';
import type { Spec } from 'mythik';

describe('Motion & Interactions in Renderer', () => {
  it('renders element without interactions as normal (no motion wrapper)', () => {
    const spec: Spec = {
      root: 'txt',
      elements: {
        txt: { type: 'text', props: { content: 'No motion' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('No motion')).toBeTruthy();
  });

  it('renders element with hover (wrapped in motion)', () => {
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Hover me' },
          hover: { scale: 1.03 },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Hover me')).toBeTruthy();
  });

  it('renders element with motion.initial/animate', () => {
    const spec: Spec = {
      root: 'card',
      elements: {
        card: {
          type: 'box',
          props: {},
          motion: {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.3 },
          },
          children: ['txt'],
        },
        txt: { type: 'text', props: { content: 'Animated' } },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Animated')).toBeTruthy();
  });

  it('renders element with hover + active + focus', () => {
    const spec: Spec = {
      root: 'btn',
      elements: {
        btn: {
          type: 'button',
          props: { label: 'Full interaction' },
          hover: { scale: 1.03 },
          active: { scale: 0.97 },
          focus: { boxShadow: '0 0 0 3px blue' },
          transition: { duration: 200 },
        },
      },
    };
    render(<MythikRenderer spec={spec} />);
    expect(screen.getByText('Full interaction')).toBeTruthy();
  });
});
