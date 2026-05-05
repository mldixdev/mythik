import React from 'react';
import { createMythik, createAppEngine } from 'mythik';
import type { MythikInstance, Spec, PluginLoader } from 'mythik';
import type { AppSpec, AppEngine } from 'mythik';
import type { SpecStore } from 'mythik';
import type { SpecRuntime } from 'mythik';
import type { AuthProvider, AuthEngine as AuthEngineType } from 'mythik';
import { createAuthEngine } from 'mythik';
import { createFrameworkFetch } from 'mythik';
import { createAuthInterceptor } from 'mythik';
import { createLoggingInterceptor } from 'mythik';
import { createTimeoutInterceptor } from 'mythik';
import { createRetryInterceptor } from 'mythik';
import type { FetchInterceptor, ActionMiddleware, StorageAdapter, StorageAdapterConfig, ExportAdapter } from 'mythik';
import { registerReactPrimitives } from './primitives/index.js';
import { MythikRenderer } from './MythikRenderer.js';
import { AppContext } from './app-context.js';

interface AuthConfig {
  /** Auth provider instance (created during scaffolding). */
  provider: AuthProvider;
  /** Additional fetch interceptors. */
  interceptors?: FetchInterceptor[];
  /** Additional dispatcher middleware. */
  middleware?: ActionMiddleware[];
}

interface MythikAppProps {
  appSpec: AppSpec;
  specStore: SpecStore;
  onPlugins?: (plugins: PluginLoader) => void;
  security?: { allowedDomains?: string[] };
  /** Auth configuration. When provided with appSpec.navigation.auth, enables full auth system. */
  auth?: AuthConfig;
  /** Storage adapter for file uploads. */
  storage?: StorageAdapter;
  /** Global storage limits. */
  storageConfig?: StorageAdapterConfig;
  /** Export adapters keyed by format. CSV is always built-in. */
  exportAdapters?: Record<string, ExportAdapter>;
  /** Fetch implementation used by runtime actions such as editorSave when auth framework fetch is not configured. */
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
}

interface PendingAppCleanup {
  timer: ReturnType<typeof setTimeout>;
  appEngine: AppEngine;
  authEngine: AuthEngineType | undefined;
  unsubAuth: (() => void) | undefined;
  unsubTokenRef: (() => void) | undefined;
}

/** Renders the login screen fullscreen (no app layout) while user is not authenticated */
function LoginScreenLoader({ screenId, specStore, svc, fetcherFn, storage, storageConfig, exportAdapters }: {
  screenId: string;
  specStore: SpecStore;
  svc: MythikInstance;
  fetcherFn?: ((url: string, options?: RequestInit) => Promise<Response>);
  storage?: StorageAdapter;
  storageConfig?: StorageAdapterConfig;
  exportAdapters?: Record<string, ExportAdapter>;
}) {
  const [spec, setSpec] = React.useState<Spec | null>(null);

  React.useEffect(() => {
    specStore.load(screenId).then((s) => setSpec(s as Spec)).catch((err) => {
      console.error(`[Mythik Auth] Failed to load login screen "${screenId}":`, err);
    });
  }, [screenId]);

  if (!spec) {
    return React.createElement('div', {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
    },
      React.createElement('div', {
        style: { width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#0D9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
      }),
    );
  }

  return React.createElement(MythikRenderer, { spec, instance: svc, fetcher: fetcherFn, storage, storageConfig, exportAdapters });
}

/**
 * Creates a SpecStore that injects Bearer tokens into screen load requests.
 * Use with mythik-server when auth is configured.
 * MythikApp automatically syncs the token from AuthEngine after login/refresh.
 *
 * @param apiUrl — Base URL of the Mythik server (e.g., 'http://localhost:3010')
 * @param options.screenPath — URL path pattern for screens. Default: '/api/screens'
 *
 * @example
 * const specStore = createAuthSpecStore('http://localhost:3010');
 * <MythikApp specStore={specStore} auth={{ provider: authProvider }} ... />
 */
export function createAuthSpecStore(
  apiUrl: string,
  options?: { screenPath?: string },
): SpecStore & { _tokenRef: { current: string | null } } {
  const screenPath = options?.screenPath ?? '/api/screens';
  const tokenRef = { current: null as string | null };

  return {
    _tokenRef: tokenRef,
    load: async (id: string) => {
      const headers: Record<string, string> = {};
      if (tokenRef.current) headers['Authorization'] = `Bearer ${tokenRef.current}`;
      const res = await fetch(`${apiUrl}${screenPath}/${id}`, { headers });
      if (!res.ok) throw new Error(`Screen "${id}" not found`);
      return res.json();
    },
    save: async () => {},
    list: async () => [],
    delete: async () => {},
  };
}

export function MythikApp({ appSpec, specStore, onPlugins, security, auth, storage, storageConfig, exportAdapters, fetcher }: MythikAppProps) {
  const { svc, appEngine, authEngine, fetcherFn, unsubAuth, unsubTokenRef } = React.useMemo(() => {
    // 1. Create MythikInstance with tokens/state from AppSpec
    const instance = createMythik({
      initialState: appSpec.sharedState ?? {},
      tokens: appSpec.tokens,
      translations: appSpec.translations,
      security,
    });

    // 2. Register React primitives (including screen-outlet)
    registerReactPrimitives(instance.plugins);
    if (onPlugins) onPlugins(instance.plugins);

    // 3. Create AppEngine
    const engine = createAppEngine({ appSpec, store: instance.store, specStore });

    // 4. Register navigation actions BEFORE applyPlugins
    instance.plugins.registerAction({
      name: 'navigateScreen',
      handler: async (params) => {
        const screen = params.screen as string;
        if (!screen) throw new Error('navigateScreen requires "screen" param');
        await engine.navigate(screen, params);
      },
    });

    instance.plugins.registerAction({
      name: 'goBackScreen',
      handler: async () => {
        engine.goBack();
      },
    });

    instance.plugins.registerAction({
      name: 'navigationGuardCancel',
      handler: async () => {
        engine.navigationGuardCancel();
      },
    });

    instance.plugins.registerAction({
      name: 'navigationGuardProceed',
      handler: async () => {
        await engine.navigationGuardProceed();
      },
    });

    instance.plugins.registerAction({
      name: 'navigationGuardSaveAndProceed',
      handler: async () => {
        await engine.navigationGuardSaveAndProceed();
      },
    });

    instance.plugins.registerAction({
      name: 'navigationGuardDiscardAndProceed',
      handler: async () => {
        await engine.navigationGuardDiscardAndProceed();
      },
    });

    // 5. Auth setup (when both auth prop and appSpec.navigation.auth are present)
    let authEng: AuthEngineType | undefined;
    let frameworkFetch: ReturnType<typeof createFrameworkFetch> | undefined;
    const authConfig = appSpec.navigation.auth;

    if (auth && authConfig) {
      // Create AuthEngine
      authEng = createAuthEngine({
        provider: auth.provider,
        store: instance.store,
        config: {
          loginScreen: authConfig.loginScreen,
          protectedScreens: authConfig.protectedScreens,
          roleAccess: authConfig.roleAccess,
          persistence: authConfig.persistence ?? 'local',
          tokenRefresh: authConfig.tokenRefresh !== false,
          authDomains: authConfig.authDomains ?? [],
          sessionExpiredMessage: authConfig.sessionExpiredMessage,
        },
      });

      // Build framework fetch interceptor chain
      const interceptors: FetchInterceptor[] = [];

      // Auth interceptor (always first — injects Bearer headers)
      interceptors.push(createAuthInterceptor({
        getToken: () => authEng!.getAccessToken(),
        authDomains: authConfig.authDomains ?? [],
        onUnauthorized: async (url, options) => {
          // 401 reactive refresh: attempt refresh then retry through framework fetch
          try {
            await authEng!.refreshSession();
            const newToken = authEng!.getAccessToken();
            if (newToken) {
              const headers = { ...(options.headers as Record<string, string> ?? {}) };
              headers['Authorization'] = `Bearer ${newToken}`;
              // Use raw globalThis.fetch for the retry to avoid re-triggering auth interceptor
              // (the token is already manually injected above)
              return await globalThis.fetch(url, { ...options, headers });
            }
          } catch {
            // Refresh failed — session expired flow handled by AuthEngine
          }
          return null;
        },
      }));

      // Built-in declarative interceptors
      if (authConfig.interceptors?.logging) {
        interceptors.push(createLoggingInterceptor());
      }
      if (authConfig.interceptors?.timeout) {
        interceptors.push(createTimeoutInterceptor(authConfig.interceptors.timeout.ms));
      }

      // Custom interceptors from auth config prop
      if (auth.interceptors) {
        interceptors.push(...auth.interceptors);
      }

      frameworkFetch = createFrameworkFetch({
        interceptors,
      });

      // Retry interceptor needs the fetch function for retrying
      if (authConfig.interceptors?.retryOnError) {
        frameworkFetch!.addInterceptor(createRetryInterceptor(
          authConfig.interceptors.retryOnError,
          (url, opts) => frameworkFetch!.fetch(url, opts),
        ));
      }

      // Register auth actions
      instance.plugins.registerAction({
        name: 'login',
        handler: async (params) => {
          await authEng!.login(params);
          // Navigate away from login screen after successful auth
          const currentScreen = instance.store.get('/navigation/currentScreen') as string;
          if (currentScreen === authConfig.loginScreen) {
            // Try initialScreen first, fall back to first accessible screen
            if (engine.canAccess(appSpec.navigation.initialScreen, instance.store.get('/auth/user/role') as string)) {
              await engine.navigate(appSpec.navigation.initialScreen);
            } else {
              // Find first accessible screen from /app/screens
              const screens = instance.store.get('/app/screens') as Array<{ id: string }> | undefined;
              const firstAccessible = screens?.[0]?.id;
              if (firstAccessible) {
                await engine.navigate(firstAccessible);
              }
            }
          }
        },
      });

      instance.plugins.registerAction({
        name: 'logout',
        handler: async () => {
          await authEng!.logout();
          // Clear login form state so credentials don't persist after logout
          instance.store.set('/login', undefined);
          await engine.navigate(authConfig.loginScreen);
        },
      });

      instance.plugins.registerAction({
        name: 'refreshSession',
        handler: async () => {
          await authEng!.refreshSession();
        },
      });
    }

    // 6. Apply all plugins (primitives + actions including auth)
    instance.applyPlugins();

    // 7. Mount engines
    engine.mount();

    // 8. Subscribe to auth state changes to refresh sidebar
    let unsubAuth: (() => void) | undefined;
    if (auth && authConfig) {
      unsubAuth = instance.store.subscribe((_state, changedPath) => {
        if (changedPath.startsWith('/auth/user') || changedPath === '/auth/isAuthenticated') {
          engine.refreshScreenList();

          // Cross-tab logout: if isAuthenticated flipped to false, navigate to login
          if (changedPath === '/auth/isAuthenticated') {
            const isAuthenticated = instance.store.get('/auth/isAuthenticated');
            const currentScreen = instance.store.get('/navigation/currentScreen') as string;
            if (!isAuthenticated && currentScreen !== authConfig.loginScreen) {
              engine.navigate(authConfig.loginScreen).catch(() => {});
            }
          }
        }
      });
    }

    // Sync token to authSpecStore if used (keeps specStore.load authenticated)
    let unsubTokenRef: (() => void) | undefined;
    if (authEng && '_tokenRef' in specStore) {
      const tokenRef = (specStore as ReturnType<typeof createAuthSpecStore>)._tokenRef;
      unsubTokenRef = instance.store.subscribe((_s, path) => {
        if (path === '/auth/isAuthenticated') {
          tokenRef.current = authEng!.getAccessToken();
        }
      });
    }

    return { svc: instance, appEngine: engine, authEngine: authEng, fetcherFn: frameworkFetch?.fetch ?? fetcher, unsubAuth, unsubTokenRef };
  }, [appSpec, specStore, fetcher]);

  // Auth readiness gate — don't render until session restore attempt completes
  const [authReady, setAuthReady] = React.useState(!authEngine); // true if no auth configured

  // Mount AuthEngine (restore session from persistence)
  React.useEffect(() => {
    if (authEngine) {
      authEngine.mount().then(() => {
        // If session was restored and we're on the login screen, navigate away
        const isAuthenticated = svc.store.get('/auth/isAuthenticated');
        const currentScreen = svc.store.get('/navigation/currentScreen') as string;
        const authConfig = appSpec.navigation.auth;
        if (isAuthenticated && authConfig && currentScreen === authConfig.loginScreen) {
          const role = svc.store.get('/auth/user/role') as string;
          if (appEngine.canAccess(appSpec.navigation.initialScreen, role)) {
            appEngine.navigate(appSpec.navigation.initialScreen).catch(() => {});
          } else {
            const screens = svc.store.get('/app/screens') as Array<{ id: string }> | undefined;
            const firstAccessible = screens?.[0]?.id;
            if (firstAccessible) {
              appEngine.navigate(firstAccessible).catch(() => {});
            }
          }
        }
      }).catch((err) => {
        console.warn('[Mythik Auth] Mount failed:', err);
      }).finally(() => {
        setAuthReady(true);
      });
    }
  }, [authEngine]);

  // Tab focus revalidation — refresh token when user returns to tab (throttled)
  React.useEffect(() => {
    if (!authEngine) return;

    let lastRefresh = Date.now();
    const MIN_REFRESH_INTERVAL = 30_000; // Don't refresh more than once per 30s

    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && authEngine!.isAuthenticated()) {
        const now = Date.now();
        if (now - lastRefresh < MIN_REFRESH_INTERVAL) return; // Throttle
        lastRefresh = now;
        authEngine!.refreshSession().catch(() => {
          // Refresh failed silently — proactive refresh or next 401 will handle it
        });
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [authEngine]);

  const pendingCleanupsRef = React.useRef<PendingAppCleanup[]>([]);

  // Cleanup on unmount. React.StrictMode runs a dev-only cleanup/setup cycle;
  // defer destructive cleanup and cancel it only when the same engine remounts.
  React.useEffect(() => {
    const matchingCleanups = pendingCleanupsRef.current.filter((cleanup) =>
      cleanup.appEngine === appEngine &&
      cleanup.authEngine === authEngine &&
      cleanup.unsubAuth === unsubAuth &&
      cleanup.unsubTokenRef === unsubTokenRef
    );

    if (matchingCleanups.length > 0) {
      for (const cleanup of matchingCleanups) {
        clearTimeout(cleanup.timer);
      }
      pendingCleanupsRef.current = pendingCleanupsRef.current.filter((cleanup) => !matchingCleanups.includes(cleanup));
    }

    return () => {
      const cleanup: PendingAppCleanup = {
        appEngine,
        authEngine,
        unsubAuth,
        unsubTokenRef,
        timer: setTimeout(() => {
          unsubAuth?.();
          unsubTokenRef?.();
          authEngine?.destroy();
          appEngine.unmount();
          pendingCleanupsRef.current = pendingCleanupsRef.current.filter((entry) => entry !== cleanup);
        }, 0),
      };
      pendingCleanupsRef.current.push(cleanup);
    };
  }, [appEngine, authEngine, unsubAuth, unsubTokenRef]);

  React.useEffect(() => {
    const guard = appSpec.navigation.editorSessionGuard;
    if (guard?.enabled !== true || guard.blockBrowserUnload === false) return;

    const handler = (event: BeforeUnloadEvent) => {
      if (!appEngine.hasGuardedDirtySessions()) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [appEngine, appSpec.navigation.editorSessionGuard]);

  // Track auth state reactively for login/layout switching
  // (Must be before any conditional returns — React Rules of Hooks)
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(
    authEngine ? !!svc.store.get('/auth/isAuthenticated') : true,
  );
  React.useEffect(() => {
    if (!authEngine) return;
    return svc.store.subscribe((_state, changedPath) => {
      if (changedPath === '/auth/isAuthenticated') {
        setIsAuthenticated(!!svc.store.get('/auth/isAuthenticated'));
      }
    });
  }, [svc, authEngine]);

  // Convert AppSpec layout to a renderable Spec
  const layoutSpec = React.useMemo<Spec>(() => ({
    root: appSpec.layout.root,
    elements: appSpec.layout.elements as Spec['elements'],
    templates: appSpec.templates,
  }), [appSpec]);

  const onSpecRuntimeMount = React.useCallback((runtime: SpecRuntime | null) => {
    appEngine.attachEditorSessionEngine(runtime?.editorSessionEngine ?? null);
  }, [appEngine]);

  // Provide context and render layout
  const contextValue = React.useMemo(
    () => ({ appEngine, svc, specStore, fetcher: fetcherFn, onSpecRuntimeMount }),
    [appEngine, svc, specStore, fetcherFn, onSpecRuntimeMount],
  );

  // Show loading spinner while auth session is being restored
  if (!authReady) {
    return React.createElement('div', {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
    },
      React.createElement('div', {
        style: { width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#0D9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
      }),
    );
  }

  // Auth configured + not authenticated → render login screen directly (no app layout)
  const loginScreenId = appSpec.navigation.auth?.loginScreen;
  if (authEngine && !isAuthenticated && loginScreenId) {
    return React.createElement(
      AppContext.Provider,
      { value: contextValue },
      React.createElement(LoginScreenLoader, { screenId: loginScreenId, specStore, svc, fetcherFn, storage, storageConfig, exportAdapters }),
    );
  }

  return React.createElement(
    AppContext.Provider,
    { value: contextValue },
    React.createElement(MythikRenderer, { spec: layoutSpec, instance: svc, fetcher: fetcherFn, storage, storageConfig, exportAdapters }),
  );
}
