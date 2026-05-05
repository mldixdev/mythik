/**
 * @deprecated Use useDesignTokens instead.
 * Kept for backward compatibility — wraps useDesignTokens and returns only colors.
 */
import { useDesignTokens } from './use-design-tokens.js';

interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
}

export function useThemeColors(tokens: Record<string, unknown> | undefined): ThemeColors {
  const t = useDesignTokens(tokens);
  return {
    background: t.colors.background,
    surface: t.colors.surface,
    text: t.colors.text,
    textMuted: t.colors.textMuted,
    border: t.colors.border,
    primary: t.colors.primary,
  };
}
