import { describe, it, expect } from 'vitest';
import { resolveRadiusPattern, resolveBorderStyle } from '../../src/design/identity/index.js';

describe('resolveRadiusPattern', () => {
  it('all: applies same radius to all 4 corners', () => {
    expect(resolveRadiusPattern('all', 8)).toBe('8px');
  });
  it('top: only top corners', () => {
    expect(resolveRadiusPattern('top', 8)).toBe('8px 8px 0px 0px');
  });
  it('bottom: only bottom corners', () => {
    expect(resolveRadiusPattern('bottom', 8)).toBe('0px 0px 8px 8px');
  });
  it('diagonal: top-left + bottom-right', () => {
    expect(resolveRadiusPattern('diagonal', 8)).toBe('8px 0px 8px 0px');
  });
  it('inverse-diagonal: top-right + bottom-left', () => {
    expect(resolveRadiusPattern('inverse-diagonal', 8)).toBe('0px 8px 0px 8px');
  });
  it('left: top-left + bottom-left', () => {
    expect(resolveRadiusPattern('left', 8)).toBe('8px 0px 0px 8px');
  });
  it('right: top-right + bottom-right', () => {
    expect(resolveRadiusPattern('right', 8)).toBe('0px 8px 8px 0px');
  });
  it('single: only top-left', () => {
    expect(resolveRadiusPattern('single', 8)).toBe('8px 0px 0px 0px');
  });
  it('single-tr: only top-right', () => {
    expect(resolveRadiusPattern('single-tr', 8)).toBe('0px 8px 0px 0px');
  });
  it('single-bl: only bottom-left', () => {
    expect(resolveRadiusPattern('single-bl', 8)).toBe('0px 0px 0px 8px');
  });
  it('single-br: only bottom-right', () => {
    expect(resolveRadiusPattern('single-br', 8)).toBe('0px 0px 8px 0px');
  });
  it('handles 0 radius', () => {
    expect(resolveRadiusPattern('top', 0)).toBe('0px 0px 0px 0px');
  });
  it('handles large radius', () => {
    expect(resolveRadiusPattern('all', 9999)).toBe('9999px');
  });
});

describe('resolveBorderStyle', () => {
  it('returns CSS border string', () => {
    expect(resolveBorderStyle(2, 'dashed', '#ff0000')).toBe('2px dashed #ff0000');
  });
  it('returns undefined for width 0', () => {
    expect(resolveBorderStyle(0, 'solid', '#000')).toBeUndefined();
  });
  it('returns undefined for style none', () => {
    expect(resolveBorderStyle(2, 'none', '#000')).toBeUndefined();
  });
  it('supports dotted style', () => {
    expect(resolveBorderStyle(1, 'dotted', '#333')).toBe('1px dotted #333');
  });
  it('supports double style', () => {
    expect(resolveBorderStyle(3, 'double', '#000')).toBe('3px double #000');
  });
});
