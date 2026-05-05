import { describe, it, expect } from 'vitest';
import { useThemeColors } from '../src/primitives/use-theme.js';

describe('useThemeColors', () => {
  it('returns fallback when tokens is undefined', () => {
    const colors = useThemeColors(undefined);
    expect(colors.background).toBe('#f8fafc');
    expect(colors.text).toBe('#0f172a');
    expect(colors.primary).toBe('#6366f1');
  });

  it('returns fallback when tokens has no colors', () => {
    const colors = useThemeColors({ fonts: {} });
    expect(colors.background).toBe('#f8fafc');
  });

  it('extracts theme colors from tokens', () => {
    const colors = useThemeColors({
      colors: {
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f8fafc',
        textMuted: '#94a3b8',
        border: '#334155',
        primary: '#0d9488',
      },
    });
    expect(colors.background).toBe('#0f172a');
    expect(colors.surface).toBe('#1e293b');
    expect(colors.text).toBe('#f8fafc');
    expect(colors.textMuted).toBe('#94a3b8');
    expect(colors.border).toBe('#334155');
    expect(colors.primary).toBe('#0d9488');
  });

  it('fills missing colors with fallback', () => {
    const colors = useThemeColors({
      colors: { primary: '#0d9488' },
    });
    expect(colors.primary).toBe('#0d9488');
    expect(colors.background).toBe('#f8fafc');
    expect(colors.text).toBe('#0f172a');
  });

  it('returns consistent values for same undefined input', () => {
    const a = useThemeColors(undefined);
    const b = useThemeColors(undefined);
    expect(a).toEqual(b);
  });
});
