import type { StateStore } from '../state/store.js';
import type { Spec, TemplateDefinition } from '../types.js';
import type { SpecStore } from '../spec-engine/types.js';
import type { EditorSessionEngine } from '../editor-session/types.js';

// ─── AppSpec types ───

export interface ScreenDefinition {
  label: string;
  icon?: string;
  description?: string;
  roles?: string[];
  statePolicy?: 'preserve' | 'reset' | 'reload';
  parent?: string;
}

export interface AppAuthConfig {
  loginScreen: string;
  protectedScreens: string[];
  roleAccess: Record<string, string[]>;
  /** Auth provider name. Used by MythikApp to select the provider instance. */
  provider?: string;
  /** Persistence strategy: "local" (default, survives browser close), "session" (tab-scoped), "memory" (no persistence). */
  persistence?: 'local' | 'session' | 'memory';
  /** Enable proactive token refresh before expiry. Default: true. */
  tokenRefresh?: boolean;
  /** Domains where Bearer token is auto-injected into fetch requests. */
  authDomains?: string[];
  /** Message shown as toast when session expires. */
  sessionExpiredMessage?: string;
  /** Declarative interceptors config for framework fetch. */
  interceptors?: {
    logging?: boolean;
    timeout?: { ms: number };
    retryOnError?: { maxRetries?: number; statuses?: number[] };
  };
}

export interface AppNavigationConfig {
  type: 'sidebar' | 'tabs' | 'drawer';
  initialScreen: string;
  breadcrumb?: 'history' | 'hierarchy' | 'none';
  /** Which screens appear in the sidebar/menu, in order. Screens not listed are still navigable but hidden from the menu. If omitted, all screens are shown. */
  menu?: string[];
  auth?: AppAuthConfig;
  editorSessionGuard?: AppEditorSessionGuardConfig;
}

export interface AppEditorSessionGuardConfig {
  enabled?: boolean;
  sessions?: string[];
  blockNavigation?: boolean;
  blockGoBack?: boolean;
  blockBrowserUnload?: boolean;
  pendingPath?: string;
}

export interface NavigationGuardDirtySession {
  id: string;
  label: string | null;
  status: string;
  saveStatus: string;
  lastSavedAt: string | null;
}

export interface NavigationGuardPending {
  kind: 'editor-session-dirty';
  action: 'navigateScreen' | 'goBackScreen';
  screen?: string;
  params?: Record<string, unknown>;
  dirtySessions: NavigationGuardDirtySession[];
  createdAt: number;
}

export interface AppSpec {
  type: 'app';
  name?: string;
  navigation: AppNavigationConfig;
  screens: Record<string, ScreenDefinition>;
  sharedState?: Record<string, unknown>;
  tokens?: Record<string, unknown>;
  translations?: Record<string, Record<string, string>>;
  templates?: Record<string, TemplateDefinition>;
  layout: {
    root: string;
    elements: Record<string, unknown>;
  };
}

// ─── AppEngine ───

export interface AppEngineConfig {
  appSpec: AppSpec;
  store: StateStore;
  specStore: SpecStore;
}

export interface AppEngine {
  mount: () => void;
  navigate: (screenId: string, params?: Record<string, unknown>) => Promise<void>;
  goBack: () => void;
  navigationGuardCancel: () => void;
  navigationGuardProceed: () => Promise<void>;
  navigationGuardSaveAndProceed: () => Promise<void>;
  navigationGuardDiscardAndProceed: () => Promise<void>;
  hasGuardedDirtySessions: () => boolean;
  attachEditorSessionEngine: (engine: EditorSessionEngine | null) => void;
  getScreenSpec: (screenId: string) => Promise<Spec>;
  canAccess: (screenId: string, role: string) => boolean;
  refreshScreenList: () => void;
  unmount: () => void;
}

export function createAppEngine(config: AppEngineConfig): AppEngine {
  const { appSpec, store, specStore } = config;
  const specCache = new Map<string, Spec>();
  let mounted = false;
  let bypassNavigationGuard = false;
  let currentEditorSessionEngine: EditorSessionEngine | null = null;
  const navigationGuard = appSpec.navigation.editorSessionGuard;
  const navigationGuardPendingPath = navigationGuard?.pendingPath ?? '/ui/navigationGuard/pending';
  const navigationGuardErrorPath = '/ui/navigationGuard/error';

  // ─── Mount ───

  function mount(): void {
    if (mounted) return;
    mounted = true;

    // Initialize shared state
    if (appSpec.sharedState) {
      for (const [key, value] of Object.entries(appSpec.sharedState)) {
        store.set(`/${key}`, value);
      }
    }

    // Set app metadata
    if (appSpec.name) {
      store.set('/app/name', appSpec.name);
    }

    // Populate /app/screens (for sidebar repeat)
    refreshScreenList();

    // Determine initial screen — respect auth if configured
    let initialScreen = appSpec.navigation.initialScreen;
    if (appSpec.navigation.auth) {
      const auth = appSpec.navigation.auth;
      const protected_ = auth.protectedScreens ?? [];
      const isProtected = protected_.includes('*') || protected_.includes(initialScreen);
      if (isProtected) {
        const isAuthenticated = store.get('/auth/isAuthenticated');
        if (!isAuthenticated) {
          initialScreen = auth.loginScreen;
        }
      }
    }

    // Initialize navigation
    store.set('/navigation/currentScreen', initialScreen);
    store.set('/navigation/params', {});
    store.set('/navigation/history', [initialScreen]);

    // Compute initial breadcrumb
    computeBreadcrumb();
  }

  // ─── Navigation ───

  async function navigate(screenId: string, params?: Record<string, unknown>): Promise<void> {
    if (!appSpec.screens[screenId]) {
      throw new Error(`Unknown screen: "${screenId}"`);
    }

    if (shouldBlockNavigation('navigateScreen', { screen: screenId, params })) {
      return;
    }

    // Auth check
    if (appSpec.navigation.auth) {
      const auth = appSpec.navigation.auth;

      // loginScreen is always accessible — prevents infinite redirect
      if (screenId === auth.loginScreen) {
        // Skip protection check, allow navigation
      } else {
        const navProtected = auth.protectedScreens ?? [];
        const isProtected = navProtected.includes('*') || navProtected.includes(screenId);

        if (isProtected) {
          const userRoles = store.get('/auth/user/roles') as string[] | undefined;
          const userRole = (store.get('/auth/user/role') ?? store.get('/user/role')) as string | undefined;
          const hasAccess = userRoles
            ? userRoles.some((r) => canAccess(screenId, r))
            : (userRole ? canAccess(screenId, userRole) : false);

          if (!hasAccess) {
            const isAuthenticated = store.get('/auth/isAuthenticated');
            if (isAuthenticated) {
              // Logged in but unauthorized → don't navigate, set error
              store.set('/auth/error', `Access denied: screen "${screenId}"`);
              return;
            }
            // Not authenticated → redirect to login
            store.set('/navigation/currentScreen', auth.loginScreen);
            const history = (store.get('/navigation/history') as string[]) ?? [];
            store.set('/navigation/history', [...history, auth.loginScreen]);
            computeBreadcrumb();
            return;
          }
        }
      }
    }

    // Apply state policy for the target screen
    const targetDef = appSpec.screens[screenId];
    const policy = targetDef.statePolicy ?? 'preserve';

    if (policy === 'reset') {
      clearScreenState(screenId);
    } else if (policy === 'reload') {
      clearScreenState(screenId);
      store.set(`/screens/${screenId}/_reload`, true);
    }

    // Update navigation state
    store.set('/navigation/currentScreen', screenId);
    store.set('/navigation/params', params ?? {});
    const history = (store.get('/navigation/history') as string[]) ?? [];
    store.set('/navigation/history', [...history, screenId]);

    // Compute breadcrumb
    computeBreadcrumb();
  }

  function goBack(): void {
    const history = (store.get('/navigation/history') as string[]) ?? [];
    if (history.length <= 1) return;

    if (shouldBlockNavigation('goBackScreen')) {
      return;
    }

    const newHistory = history.slice(0, -1);
    const previousScreen = newHistory[newHistory.length - 1];
    store.set('/navigation/currentScreen', previousScreen);
    store.set('/navigation/history', newHistory);
    store.set('/navigation/params', {});

    computeBreadcrumb();
  }

  // ─── State policies ───

  function clearScreenState(screenId: string): void {
    store.set(`/screens/${screenId}`, undefined);
  }

  // ─── Breadcrumb ───

  function computeBreadcrumb(): void {
    const mode = appSpec.navigation.breadcrumb ?? 'history';
    if (mode === 'none') return;

    const currentScreen = store.get('/navigation/currentScreen') as string;

    if (mode === 'history') {
      const history = (store.get('/navigation/history') as string[]) ?? [];
      // Deduplicate while preserving order (last occurrence wins)
      const seen = new Set<string>();
      const unique: string[] = [];
      for (const id of history) {
        if (!seen.has(id)) {
          seen.add(id);
          unique.push(id);
        }
      }
      const breadcrumb = unique.map((id) => enrichBreadcrumbEntry(id));
      store.set('/navigation/breadcrumb', breadcrumb);
    } else if (mode === 'hierarchy') {
      // Walk parent chain from current screen to root
      const chain: string[] = [];
      let current: string | undefined = currentScreen;
      const visited = new Set<string>();

      while (current && !visited.has(current)) {
        visited.add(current);
        chain.unshift(current);
        current = appSpec.screens[current]?.parent;
      }

      const breadcrumb = chain.map((id) => enrichBreadcrumbEntry(id));
      store.set('/navigation/breadcrumb', breadcrumb);
    }
  }

  function enrichBreadcrumbEntry(screenId: string): { id: string; label: string; icon?: string } {
    const def = appSpec.screens[screenId];
    if (!def) return { id: screenId, label: screenId };
    return {
      id: screenId,
      label: typeof def.label === 'string' ? def.label : screenId,
      ...(def.icon ? { icon: def.icon } : {}),
    };
  }

  // ─── Screen Spec Loading ───

  async function getScreenSpec(screenId: string): Promise<Spec> {
    // Return from cache if available
    if (specCache.has(screenId)) {
      return specCache.get(screenId)!;
    }

    // Load from store
    const spec = await specStore.load(screenId) as Spec;

    // Merge app-level templates (screen templates override app templates)
    if (appSpec.templates) {
      spec.templates = {
        ...appSpec.templates,
        ...(spec.templates ?? {}),
      };
    }

    // Cache the merged spec
    specCache.set(screenId, spec);

    return spec;
  }

  // ─── Role access ───

  function canAccess(screenId: string, role: string): boolean {
    const def = appSpec.screens[screenId];
    if (!def) return false;

    // Priority 1: roleAccess map (global override, source of truth when present)
    const auth = appSpec.navigation.auth;
    if (auth?.roleAccess) {
      const allowedScreens = auth.roleAccess[role];
      if (allowedScreens) {
        return allowedScreens.includes('*') || allowedScreens.includes(screenId);
      }
      // Role not in roleAccess → no access
      return false;
    }

    // Priority 2: per-screen roles (backward compat when no roleAccess)
    const roles = def.roles ?? ['*'];
    if (roles.includes('*')) return true;
    return roles.includes(role);
  }

  // ─── Sidebar screen list ───

  function refreshScreenList(): void {
    const menuIds = appSpec.navigation.menu ?? Object.keys(appSpec.screens);
    const screensArray = menuIds
      .filter((id) => appSpec.screens[id])
      .filter((id) => {
        if (!appSpec.navigation.auth) return true;
        // Exclude loginScreen from sidebar
        if (id === appSpec.navigation.auth.loginScreen) return false;
        const userRoles = store.get('/auth/user/roles') as string[] | undefined;
        const userRole = (store.get('/auth/user/role') ?? store.get('/user/role')) as string | undefined;
        if (userRoles) return userRoles.some((r) => canAccess(id, r));
        if (userRole) return canAccess(id, userRole);
        return true; // Pre-login → show all
      })
      .map((id) => ({ id, ...appSpec.screens[id] }));
    store.set('/app/screens', screensArray);
  }

  // ─── Editor session navigation guard ───

  function attachEditorSessionEngine(engine: EditorSessionEngine | null): void {
    currentEditorSessionEngine = engine;
  }

  function isNavigationGuardEnabled(): boolean {
    return navigationGuard?.enabled === true;
  }

  function shouldBlockNavigation(
    action: NavigationGuardPending['action'],
    details: { screen?: string; params?: Record<string, unknown> } = {},
  ): boolean {
    if (bypassNavigationGuard || !isNavigationGuardEnabled()) return false;
    if (action === 'navigateScreen' && navigationGuard?.blockNavigation === false) return false;
    if (action === 'goBackScreen' && navigationGuard?.blockGoBack === false) return false;

    const dirtySessions = getGuardedDirtySessions();
    if (dirtySessions.length === 0) return false;

    const pending: NavigationGuardPending = {
      kind: 'editor-session-dirty',
      action,
      ...(details.screen ? { screen: details.screen } : {}),
      ...(details.params ? { params: details.params } : {}),
      dirtySessions,
      createdAt: Date.now(),
    };
    store.set(navigationGuardPendingPath, pending);
    store.set(navigationGuardErrorPath, undefined);
    return true;
  }

  function getGuardedDirtySessions(sessionIds = navigationGuard?.sessions): NavigationGuardDirtySession[] {
    if (!isNavigationGuardEnabled()) return [];

    if (sessionIds && sessionIds.length > 0) {
      return sessionIds
        .map((id) => toDirtySession(id, store.get(`/ui/editorSessions/${id}`)))
        .filter((session): session is NavigationGuardDirtySession => session !== null);
    }

    const sessions = store.get('/ui/editorSessions');
    if (!isRecord(sessions)) return [];

    return Object.entries(sessions)
      .map(([id, value]) => toDirtySession(id, value))
      .filter((session): session is NavigationGuardDirtySession => session !== null);
  }

  function toDirtySession(id: string, value: unknown): NavigationGuardDirtySession | null {
    if (!isRecord(value) || value.dirty !== true) return null;
    return {
      id: typeof value.id === 'string' && value.id ? value.id : id,
      label: typeof value.label === 'string' ? value.label : null,
      status: typeof value.status === 'string' ? value.status : 'dirty',
      saveStatus: typeof value.saveStatus === 'string' ? value.saveStatus : 'idle',
      lastSavedAt: typeof value.lastSavedAt === 'string' ? value.lastSavedAt : null,
    };
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function hasGuardedDirtySessions(): boolean {
    return getGuardedDirtySessions().length > 0;
  }

  function navigationGuardCancel(): void {
    store.set(navigationGuardPendingPath, undefined);
    store.set(navigationGuardErrorPath, undefined);
  }

  async function navigationGuardProceed(): Promise<void> {
    const pending = getPendingNavigation();
    if (!pending) return;

    const dirtySessionIds = pending.dirtySessions.map((session) => session.id);
    const stillDirty = getGuardedDirtySessions(dirtySessionIds);
    if (stillDirty.length > 0) {
      store.set(navigationGuardErrorPath, {
        message: 'Navigation guard pending sessions are still dirty. Save or discard changes before proceeding.',
        dirtySessions: stillDirty,
      });
      return;
    }

    await runPendingNavigation(pending);
  }

  async function navigationGuardSaveAndProceed(): Promise<void> {
    const pending = getPendingNavigation();
    if (!pending) return;

    if (!currentEditorSessionEngine) {
      store.set(navigationGuardErrorPath, {
        message: 'No editor session engine is attached; cannot save guarded changes.',
      });
      return;
    }

    try {
      for (const session of pending.dirtySessions) {
        await currentEditorSessionEngine.save({ session: session.id });
      }
    } catch (error) {
      store.set(navigationGuardErrorPath, {
        message: error instanceof Error ? error.message : 'Failed to save guarded editor session changes.',
      });
      return;
    }

    const dirtySessionIds = pending.dirtySessions.map((session) => session.id);
    const stillDirty = getGuardedDirtySessions(dirtySessionIds);
    if (stillDirty.length > 0) {
      store.set(navigationGuardErrorPath, {
        message: 'Navigation guard pending sessions are still dirty. Save or discard changes before proceeding.',
        dirtySessions: stillDirty,
      });
      return;
    }

    await runPendingNavigation(pending);
  }

  async function navigationGuardDiscardAndProceed(): Promise<void> {
    const pending = getPendingNavigation();
    if (!pending) return;

    if (!currentEditorSessionEngine) {
      store.set(navigationGuardErrorPath, {
        message: 'No editor session engine is attached; cannot discard guarded changes.',
      });
      return;
    }

    try {
      for (const session of pending.dirtySessions) {
        currentEditorSessionEngine.discard(session.id);
      }
    } catch (error) {
      store.set(navigationGuardErrorPath, {
        message: error instanceof Error ? error.message : 'Failed to discard guarded editor session changes.',
      });
      return;
    }

    await runPendingNavigation(pending);
  }

  function getPendingNavigation(): NavigationGuardPending | null {
    const pending = store.get(navigationGuardPendingPath);
    if (!isRecord(pending) || pending.kind !== 'editor-session-dirty') return null;
    if (pending.action !== 'navigateScreen' && pending.action !== 'goBackScreen') return null;
    if (!Array.isArray(pending.dirtySessions)) return null;
    return pending as unknown as NavigationGuardPending;
  }

  async function runPendingNavigation(pending: NavigationGuardPending): Promise<void> {
    store.set(navigationGuardPendingPath, undefined);
    store.set(navigationGuardErrorPath, undefined);

    bypassNavigationGuard = true;
    try {
      if (pending.action === 'goBackScreen') {
        goBack();
      } else if (pending.screen) {
        await navigate(pending.screen, pending.params);
      }
    } finally {
      bypassNavigationGuard = false;
    }
  }

  // ─── Unmount ───

  function unmount(): void {
    mounted = false;
    specCache.clear();
    currentEditorSessionEngine = null;
  }

  return {
    mount,
    navigate,
    goBack,
    navigationGuardCancel,
    navigationGuardProceed,
    navigationGuardSaveAndProceed,
    navigationGuardDiscardAndProceed,
    hasGuardedDirtySessions,
    attachEditorSessionEngine,
    getScreenSpec,
    canAccess,
    refreshScreenList,
    unmount,
  };
}
