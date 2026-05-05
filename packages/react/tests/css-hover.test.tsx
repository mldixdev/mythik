import { describe, it, expect } from 'vitest';
import { needsMotionWrapper, generateHoverCSS, hashId } from '../src/css-hover.js';

describe('needsMotionWrapper', () => {
  it('returns false for CSS-only hover (backgroundColor, color, opacity)', () => {
    expect(needsMotionWrapper({ backgroundColor: '#f00' })).toBe(false);
    expect(needsMotionWrapper({ color: '#fff' })).toBe(false);
    expect(needsMotionWrapper({ opacity: 0.8 })).toBe(false);
    expect(needsMotionWrapper({ backgroundColor: '#f00', color: '#fff', opacity: 0.8 })).toBe(false);
  });

  it('returns true when hover contains scale, rotate, x, y', () => {
    expect(needsMotionWrapper({ scale: 1.05 })).toBe(true);
    expect(needsMotionWrapper({ scaleX: 1.1 })).toBe(true);
    expect(needsMotionWrapper({ scaleY: 0.9 })).toBe(true);
    expect(needsMotionWrapper({ rotate: 5 })).toBe(true);
    expect(needsMotionWrapper({ x: 10 })).toBe(true);
    expect(needsMotionWrapper({ y: -5 })).toBe(true);
  });

  it('returns true when any field contains motion props', () => {
    // hover is CSS-only but active has scale
    expect(needsMotionWrapper({ backgroundColor: '#f00' }, { scale: 1.05 })).toBe(true);
  });

  it('returns false for empty/undefined hover', () => {
    expect(needsMotionWrapper()).toBe(false);
    expect(needsMotionWrapper(undefined)).toBe(false);
    expect(needsMotionWrapper({})).toBe(false);
    expect(needsMotionWrapper(undefined, undefined)).toBe(false);
  });
});

describe('generateHoverCSS', () => {
  it('generates :hover, :active, :focus-visible rules', () => {
    const css = generateHoverCSS('sv-abc', {
      hover: { backgroundColor: '#f00' },
      active: { backgroundColor: '#0f0' },
      focus: { outline: '2px solid blue' },
    });
    expect(css).toContain('.sv-abc:hover');
    expect(css).toContain('background-color: #f00');
    expect(css).toContain('.sv-abc:active');
    expect(css).toContain('background-color: #0f0');
    expect(css).toContain('.sv-abc:focus-visible');
    expect(css).toContain('outline: 2px solid blue');
  });

  it('maps transition config (duration, ease) to CSS', () => {
    const css = generateHoverCSS('sv-abc', {
      hover: { opacity: 0.8 },
      transition: { duration: 300, ease: 'easeInOut' },
    });
    expect(css).toContain('all 300ms ease-in-out');
  });

  it('defaults transition to 150ms ease-out', () => {
    const css = generateHoverCSS('sv-abc', {
      hover: { opacity: 0.8 },
    });
    expect(css).toContain('all 150ms ease-out');
  });

  it('includes delay when specified', () => {
    const css = generateHoverCSS('sv-abc', {
      hover: { opacity: 0.8 },
      transition: { duration: 200, delay: 50 },
    });
    expect(css).toContain('200ms ease-out 50ms');
  });

  it('converts camelCase to kebab-case', () => {
    const css = generateHoverCSS('sv-abc', {
      hover: { backgroundColor: '#f00', borderColor: '#0f0', boxShadow: '0 0 5px black' },
    });
    expect(css).toContain('background-color: #f00');
    expect(css).toContain('border-color: #0f0');
    expect(css).toContain('box-shadow: 0 0 5px black');
  });

  it('only generates rules for provided pseudo-classes', () => {
    const css = generateHoverCSS('sv-abc', {
      hover: { opacity: 0.8 },
    });
    expect(css).toContain('.sv-abc:hover');
    expect(css).not.toContain(':active');
    expect(css).not.toContain(':focus-visible');
  });
});

describe('hashId', () => {
  it('returns a stable hash for the same input', () => {
    expect(hashId('my-element')).toBe(hashId('my-element'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashId('element-a')).not.toBe(hashId('element-b'));
  });

  it('produces unique classNames for typical spec element IDs', () => {
    // Simulate a real app: sidebar nav items + stat cards + form fields + buttons
    const elementIds = [
      // Sidebar
      'nav-item', 'nav-label', 'nav-icon', 'collapse-btn',
      // Stat cards
      'stat-budget', 'stat-spentAmount', 'stat-pct', 'stat-balance',
      // Form
      'form-title', 'form-email', 'form-submit', 'form-cancel',
      // Table
      'table-header', 'table-row', 'edit-btn', 'delete-btn',
      // Misc
      'theme-toggle', 'search-input', 'pagination-next', 'pagination-prev',
    ];
    const hashes = elementIds.map(id => hashId(id));
    const unique = new Set(hashes);
    expect(unique.size).toBe(elementIds.length);
  });

  it('produces unique classNames for short positional keys', () => {
    // Repeat items use keys like "0", "1", "2" or item IDs
    const keys = Array.from({ length: 50 }, (_, i) => String(i));
    const hashes = keys.map(k => hashId(k));
    const unique = new Set(hashes);
    expect(unique.size).toBe(keys.length);
  });
});
