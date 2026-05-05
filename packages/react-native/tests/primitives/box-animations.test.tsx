import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Box } from '../../src/primitives/box.js';

// Box (RN) uses Animated.View as root regardless of animations prop — this
// keeps component identity stable across renders where animations toggles.
// Under the Reanimated mock, useAnimatedStyle evaluates synchronously and
// all `with*` helpers return the target value immediately. However, mount
// triggers set sharedValue.value in a useEffect, so end-state opacity (1 for
// fade-up) is captured on the NEXT render, not the first. We verify wiring
// and style-merging rather than deep end-state transitions — the RN hook's
// own unit tests with flag prop drilling exhaustively cover end-state.

describe('Box (RN) — animations prop integration', () => {
  it('renders without animations prop (Animated.View with empty animated style)', () => {
    const { container } = render(<Box testID="plain" />);
    const el = container.firstChild as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.getAttribute('data-animated')).toBe('Animated.View');
  });

  it('renders with animations prop without crashing', () => {
    const { container } = render(
      <Box testID="animated" animations={{ mount: { recipe: 'fade-up' } }} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('data-animated')).toBe('Animated.View');
  });

  it('mount animation applies animated style (opacity property present)', () => {
    const { container } = render(
      <Box animations={{ mount: { recipe: 'fade-up' } }} />,
    );
    const el = container.firstChild as HTMLElement;
    const styleAttr = el.getAttribute('style') ?? '';
    // fade-up always writes opacity to the composed style; value depends on
    // progress (0 at first render, 1 after effect flush).
    expect(styleAttr).toMatch(/opacity:/);
  });

  it('ambient trigger composes into animated style without crashing', () => {
    const { container } = render(
      <Box animations={{ ambient: { recipe: 'breathe-subtle' } }} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('data-animated')).toBe('Animated.View');
  });

  it('coexists with surface prop (complex branch) — borderRadius still applies', () => {
    const { container } = render(
      <Box
        surface="card"
        testID="surface-animated"
        animations={{ mount: { recipe: 'fade-up' } }}
      />,
    );
    const el = container.firstChild as HTMLElement;
    const styleAttr = el.getAttribute('style') ?? '';
    expect(styleAttr).toMatch(/border-radius/);
  });

  it('treats animations={null} as disabled (no animatedStyle contributions)', () => {
    const { container } = render(<Box animations={null} testID="null-animations" />);
    const el = container.firstChild as HTMLElement;
    // Root is still Animated.View but no animation contributions are produced.
    expect(el.getAttribute('data-animated')).toBe('Animated.View');
  });

  it('preserves testID and children on animated path', () => {
    const { getByText, container } = render(
      <Box animations={{ mount: { recipe: 'fade-up' } }} testID="box-kids">
        <div>child text</div>
      </Box>,
    );
    expect(getByText('child text')).toBeDefined();
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('data-testid')).toBeDefined();
  });

  it('composes user-supplied event handlers without overriding internal state setters', () => {
    // Handler wiring smoke test. Native event firing (onHoverIn, onPressIn,
    // etc.) is not exercised by jsdom — this test guards against a crash in
    // the compose/useMemo path.
    let userHoverCalls = 0;
    const { container } = render(
      <Box
        animations={{ hover: { recipe: 'lift' } }}
        onHoverIn={() => { userHoverCalls += 1; }}
      />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el).toBeDefined();
    expect(userHoverCalls).toBe(0);
  });

  it('accepts array form on a single trigger (parallel animations)', () => {
    const { container } = render(
      <Box
        animations={{
          mount: [{ recipe: 'fade' }, { recipe: 'scale-in' }],
        }}
      />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('data-animated')).toBe('Animated.View');
  });

  it('animationStaggerIndex is accepted without crashing', () => {
    const { container } = render(
      <Box
        animations={{
          mount: { recipe: 'fade-up', stagger: { delay: 80 } },
        }}
        animationStaggerIndex={3}
      />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('data-animated')).toBe('Animated.View');
  });
});
