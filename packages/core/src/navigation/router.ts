import type { StateStore } from '../state/store.js';

export interface ScreenConfig {
  config: string; // Path to screen JSON
  params?: string[]; // Expected route params
}

export interface MenuItemConfig {
  label: string;
  icon?: string;
  screen: string;
  visible?: unknown; // Visibility expression
}

export interface NavigationConfig {
  type: 'stack' | 'tabs' | 'drawer';
  initialScreen: string;
  screens: Record<string, ScreenConfig>;
  menu?: {
    type: 'drawer' | 'tabs' | 'bottom-tabs';
    items: MenuItemConfig[];
  };
}

export interface AuthConfig {
  loginScreen: string;
  protectedScreens: string[];
  roleAccess: Record<string, string[]>; // role → screens (["*"] = all)
}

export interface RouterInstance {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  getCurrentScreen: () => string;
  getParams: () => Record<string, unknown>;
  getHistory: () => string[];
  canAccess: (screen: string, role: string) => boolean;
  isProtected: (screen: string) => boolean;
}

export function createRouter(
  config: NavigationConfig,
  store: StateStore,
  auth?: AuthConfig,
): RouterInstance {
  // Use state store to persist navigation state
  store.set('/navigation/currentScreen', config.initialScreen);
  store.set('/navigation/params', {});
  store.set('/navigation/history', [config.initialScreen]);

  function navigate(screen: string, params?: Record<string, unknown>): void {
    if (!config.screens[screen]) {
      throw new Error(`Screen "${screen}" is not defined in navigation config`);
    }

    const history = (store.get('/navigation/history') as string[]) ?? [];
    store.set('/navigation/currentScreen', screen);
    store.set('/navigation/params', params ?? {});
    store.set('/navigation/history', [...history, screen]);
  }

  function goBack(): void {
    const history = (store.get('/navigation/history') as string[]) ?? [];
    if (history.length <= 1) return; // Can't go back from first screen

    const newHistory = history.slice(0, -1);
    const previousScreen = newHistory[newHistory.length - 1];
    store.set('/navigation/currentScreen', previousScreen);
    store.set('/navigation/history', newHistory);
    store.set('/navigation/params', {});
  }

  function getCurrentScreen(): string {
    return store.get('/navigation/currentScreen') as string;
  }

  function getParams(): Record<string, unknown> {
    return (store.get('/navigation/params') as Record<string, unknown>) ?? {};
  }

  function getHistory(): string[] {
    return (store.get('/navigation/history') as string[]) ?? [];
  }

  function canAccess(screen: string, role: string): boolean {
    if (!auth) return true;
    const allowedScreens = auth.roleAccess[role];
    if (!allowedScreens) return false;
    if (allowedScreens.includes('*')) return true;
    return allowedScreens.includes(screen);
  }

  function isProtected(screen: string): boolean {
    if (!auth) return false;
    return auth.protectedScreens.includes(screen);
  }

  return { navigate, goBack, getCurrentScreen, getParams, getHistory, canAccess, isProtected };
}
