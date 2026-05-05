import { describe, it, expect } from 'vitest';
import { createNavigatorConfig } from '../../src/navigation/create-navigator.js';
import { createLinkingConfig } from '../../src/navigation/linking.js';
import type { AppSpec } from 'mythik';

function makeAppSpec(overrides: Partial<AppSpec> = {}): AppSpec {
  return {
    type: 'app',
    name: 'Test App',
    navigation: {
      type: 'tabs',
      initialScreen: 'home',
      ...overrides.navigation,
    },
    screens: {
      home: { label: 'Home', icon: 'house' },
      settings: { label: 'Settings', icon: 'gear' },
      ...overrides.screens,
    },
    layout: { root: 'main', elements: {} },
    ...overrides,
  } as AppSpec;
}

describe('createNavigatorConfig', () => {
  it('converts tabs AppSpec to tab config', () => {
    const appSpec = makeAppSpec();
    const config = createNavigatorConfig(appSpec);
    expect(config.type).toBe('tabs');
    expect(config.screens).toHaveLength(2);
    expect(config.screens[0].id).toBe('home');
    expect(config.screens[0].title).toBe('Home');
    expect(config.screens[1].id).toBe('settings');
  });

  it('converts sidebar to drawer', () => {
    const appSpec = makeAppSpec({
      navigation: { type: 'sidebar', initialScreen: 'dashboard' },
      screens: { dashboard: { label: 'Dashboard' } },
    } as Partial<AppSpec>);
    const config = createNavigatorConfig(appSpec);
    expect(config.type).toBe('drawer');
  });

  it('uses menu order when specified', () => {
    const appSpec = makeAppSpec({
      navigation: { type: 'tabs', initialScreen: 'home', menu: ['settings', 'home'] },
    } as Partial<AppSpec>);
    const config = createNavigatorConfig(appSpec);
    expect(config.screens[0].id).toBe('settings');
    expect(config.screens[1].id).toBe('home');
  });

  it('includes icon from screen definition', () => {
    const appSpec = makeAppSpec();
    const config = createNavigatorConfig(appSpec);
    expect(config.screens[0].icon).toBe('house');
  });

  it('defaults headerShown to true', () => {
    const appSpec = makeAppSpec();
    const config = createNavigatorConfig(appSpec);
    expect(config.screens[0].headerShown).toBe(true);
  });
});

describe('createLinkingConfig', () => {
  it('generates screen routes from AppSpec', () => {
    const appSpec = makeAppSpec({
      screens: {
        home: { label: 'Home', route: 'home' } as any,
        detail: { label: 'Detail', route: 'tasks/:id' } as any,
      },
    });
    const linking = createLinkingConfig(appSpec, ['myapp://']);
    expect(linking.prefixes).toEqual(['myapp://']);
    expect(linking.config.screens.home).toBe('home');
    expect(linking.config.screens.detail).toBe('tasks/:id');
  });

  it('defaults route to screen id', () => {
    const appSpec = makeAppSpec();
    const linking = createLinkingConfig(appSpec);
    expect(linking.config.screens.home).toBe('home');
    expect(linking.config.screens.settings).toBe('settings');
  });

  it('handles empty prefixes', () => {
    const appSpec = makeAppSpec();
    const linking = createLinkingConfig(appSpec);
    expect(linking.prefixes).toEqual([]);
  });
});
