import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Accordion } from '../src/primitives/accordion.js';

describe('Accordion', () => {
  it('renders title', () => {
    render(<Accordion title="Colors">content</Accordion>);
    expect(screen.getByText('Colors')).toBeTruthy();
  });

  it('renders badge when provided as number', () => {
    render(<Accordion title="Colors" badge={3}>content</Accordion>);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders badge when provided as string', () => {
    render(<Accordion title="Colors" badge="modified">content</Accordion>);
    expect(screen.getByText('modified')).toBeTruthy();
  });

  it('does not render badge when false', () => {
    const { container } = render(<Accordion title="Colors" badge={false}>content</Accordion>);
    expect(container.querySelector('[data-badge]')).toBeNull();
  });

  it('renders badge when true', () => {
    const { container } = render(<Accordion title="Colors" badge={true}>content</Accordion>);
    expect(container.querySelector('[data-badge]')).toBeTruthy();
  });

  it('does not render badge when 0', () => {
    const { container } = render(<Accordion title="Colors" badge={0}>content</Accordion>);
    expect(container.querySelector('[data-badge]')).toBeNull();
  });

  it('does not render badge when undefined', () => {
    const { container } = render(<Accordion title="Colors">content</Accordion>);
    expect(container.querySelector('[data-badge]')).toBeNull();
  });

  it('does not render badge when empty string', () => {
    const { container } = render(<Accordion title="Colors" badge="">content</Accordion>);
    expect(container.querySelector('[data-badge]')).toBeNull();
  });

  it('starts collapsed by default', () => {
    render(<Accordion title="Test">hidden content</Accordion>);
    expect(screen.queryByText('hidden content')).toBeNull();
  });

  it('starts open when defaultOpen is true', () => {
    render(<Accordion title="Test" defaultOpen>visible content</Accordion>);
    expect(screen.getByText('visible content')).toBeTruthy();
  });
});
