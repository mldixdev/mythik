import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { Box } from '../../src/primitives/box.js';
import { Stack } from '../../src/primitives/stack.js';
import { Grid } from '../../src/primitives/grid.js';
import { Scroll } from '../../src/primitives/scroll.js';
import { Divider } from '../../src/primitives/divider.js';
import { Spacer } from '../../src/primitives/spacer.js';

describe('Box', () => {
  it('renders children', () => {
    render(<Box><Text>Hello</Text></Box>);
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('applies style prop', () => {
    render(<Box style={{ padding: 16 }} testID="box" />);
    const box = screen.getByTestId('box');
    expect(box.style.padding).toBe('16px');
  });
});

describe('Stack', () => {
  it('defaults to vertical (column)', () => {
    render(<Stack testID="stack"><Box /><Box /></Stack>);
    const stack = screen.getByTestId('stack');
    expect(stack.style.flexDirection).toBe('column');
  });

  it('horizontal sets row direction', () => {
    render(<Stack direction="horizontal" testID="stack"><Box /><Box /></Stack>);
    const stack = screen.getByTestId('stack');
    expect(stack.style.flexDirection).toBe('row');
  });

  it('applies gap', () => {
    render(<Stack gap={12} testID="stack"><Box /><Box /></Stack>);
    const stack = screen.getByTestId('stack');
    expect(stack.style.gap).toBe('12px');
  });

  it('omits gap when 0 (default)', () => {
    render(<Stack testID="stack"><Box /></Stack>);
    const stack = screen.getByTestId('stack');
    expect(stack.style.gap).toBe('');
  });

  it('applies align and justify', () => {
    render(<Stack align="center" justify="space-between" testID="stack"><Box /></Stack>);
    const stack = screen.getByTestId('stack');
    expect(stack.style.alignItems).toBe('center');
    expect(stack.style.justifyContent).toBe('space-between');
  });
});

describe('Grid', () => {
  it('renders children in flex-wrap container', () => {
    render(
      <Grid columns={3} testID="grid">
        <Text>A</Text>
        <Text>B</Text>
        <Text>C</Text>
      </Grid>
    );
    const grid = screen.getByTestId('grid');
    expect(grid.style.flexDirection).toBe('row');
    expect(grid.style.flexWrap).toBe('wrap');
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();
  });

  it('defaults to 2 columns', () => {
    render(
      <Grid testID="grid">
        <Text>A</Text>
        <Text>B</Text>
      </Grid>
    );
    const grid = screen.getByTestId('grid');
    expect(grid.children).toHaveLength(2);
  });

  it('handles gap between columns with margin-based spacing', () => {
    render(
      <Grid columns={3} gap={8} testID="grid">
        <Text>A</Text>
        <Text>B</Text>
        <Text>C</Text>
        <Text>D</Text>
      </Grid>
    );
    const grid = screen.getByTestId('grid');
    // Should have 4 wrapper divs
    expect(grid.children).toHaveLength(4);
    // Last item in first row (C, index 2) should have marginRight 0
    const thirdChild = grid.children[2] as HTMLElement;
    expect(thirdChild.style.marginRight).toBe('0px');
    // First item should have marginRight = gap
    const firstChild = grid.children[0] as HTMLElement;
    expect(firstChild.style.marginRight).toBe('8px');
  });
});

describe('Scroll', () => {
  it('renders children in ScrollView', () => {
    render(<Scroll testID="scroll"><Text>Content</Text></Scroll>);
    expect(screen.getByText('Content')).toBeTruthy();
    expect(screen.getByTestId('scroll')).toBeTruthy();
  });

  it('sets horizontal prop for horizontal direction', () => {
    render(<Scroll direction="horizontal" testID="scroll"><Text>H</Text></Scroll>);
    const scroll = screen.getByTestId('scroll');
    expect(scroll.dataset.horizontal).toBe('true');
  });

  it('applies maxHeight when provided', () => {
    render(<Scroll maxHeight={300} testID="scroll"><Text>Tall</Text></Scroll>);
    const scroll = screen.getByTestId('scroll');
    expect(scroll.style.maxHeight).toBe('300px');
  });
});

describe('Divider', () => {
  it('renders with separator role', () => {
    render(<Divider />);
    expect(screen.getByRole('separator')).toBeTruthy();
  });

  it('horizontal divider has height 1', () => {
    render(<Divider testID="div" />);
    const divider = screen.getByTestId('div');
    expect(divider.style.height).toBe('1px');
  });

  it('vertical divider has width 1', () => {
    render(<Divider direction="vertical" testID="div" />);
    const divider = screen.getByTestId('div');
    expect(divider.style.width).toBe('1px');
  });
});

describe('Spacer', () => {
  it('vertical spacer has height', () => {
    render(<Spacer size={24} testID="spacer" />);
    const spacer = screen.getByTestId('spacer');
    expect(spacer.style.height).toBe('24px');
  });

  it('horizontal spacer has width', () => {
    render(<Spacer size={16} direction="horizontal" testID="spacer" />);
    const spacer = screen.getByTestId('spacer');
    expect(spacer.style.width).toBe('16px');
  });

  it('defaults to 16px vertical', () => {
    render(<Spacer testID="spacer" />);
    const spacer = screen.getByTestId('spacer');
    expect(spacer.style.height).toBe('16px');
  });

  it('has flexShrink 0 to prevent collapsing', () => {
    render(<Spacer testID="spacer" />);
    const spacer = screen.getByTestId('spacer');
    expect(spacer.style.flexShrink).toBe('0');
  });
});
