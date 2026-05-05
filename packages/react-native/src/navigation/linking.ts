import type { AppSpec } from 'mythik';

export interface LinkingConfig {
  prefixes: string[];
  config: { screens: Record<string, string> };
}

/**
 * Auto-generate deep linking config from AppSpec screens.
 * Each screen gets a route path — defaults to the screen ID if no explicit route is defined.
 */
export function createLinkingConfig(appSpec: AppSpec, prefixes: string[] = []): LinkingConfig {
  const screens: Record<string, string> = {};

  for (const [id, def] of Object.entries(appSpec.screens ?? {})) {
    screens[id] = (def as Record<string, unknown>).route as string ?? id;
  }

  return { prefixes, config: { screens } };
}
