import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createMythik, createAppEngine } from 'mythik';
import type { MythikInstance, PluginLoader, AppSpec, SpecStore } from 'mythik';
import { registerReactNativePrimitives } from './primitives/index.js';
import { MythikRenderer } from './MythikRenderer.js';
import { AppContext } from './app-context.js';
import { createNavigatorConfig } from './navigation/create-navigator.js';
import { useDeviceContext } from './use-device-context.js';
import type { Spec } from 'mythik';

interface MythikAppProps {
  appSpec: AppSpec;
  specStore: SpecStore;
  onPlugins?: (plugins: PluginLoader) => void;
  security?: { allowedDomains?: string[] };
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
}

/**
 * MythikApp for React Native.
 *
 * Creates the core engine, app engine, and navigation structure from AppSpec.
 * Renders each screen by loading its spec from the SpecStore and passing it
 * to MythikRenderer.
 *
 * Navigation is driven by the AppEngine — it manages /navigation/currentScreen
 * in the store. The renderer subscribes to state changes and re-renders when
 * the screen changes.
 *
 * In V1, navigation uses a simple screen-switching model (no React Navigation
 * container). The AppEngine's navigate/goBack actions update the store, and
 * the app re-renders the current screen. React Navigation integration with
 * native tab/drawer navigators is planned for V2.
 */
export function MythikApp({ appSpec, specStore, onPlugins, security, fetcher }: MythikAppProps) {
  // Create core instance
  const svc = React.useMemo(() => {
    const s = createMythik({
      security: security ? { allowedDomains: security.allowedDomains } : undefined,
    });
    registerReactNativePrimitives(s.plugins);
    onPlugins?.(s.plugins);
    s.applyPlugins();
    return s;
  }, []);

  // Create app engine
  const appEngine = React.useMemo(() => {
    const engine = createAppEngine({
      appSpec,
      store: svc.store,
      specStore,
    });
    engine.mount();

    // Register navigation actions so specs can use action: "navigateScreen" / "goBackScreen"
    svc.plugins.registerAction({
      name: 'navigateScreen',
      handler: async (params) => {
        const screen = params.screen as string;
        if (!screen) throw new Error('navigateScreen requires "screen" param');
        await engine.navigate(screen, params);
      },
    });

    svc.plugins.registerAction({
      name: 'goBackScreen',
      handler: async () => {
        engine.goBack();
      },
    });

    return engine;
  }, [appSpec, svc, specStore]);

  // Track device context
  useDeviceContext(svc.store);

  // Current screen tracking
  const [currentScreenId, setCurrentScreenId] = React.useState<string | null>(
    () => svc.store.get('/navigation/currentScreen') as string | null
  );
  const [currentSpec, setCurrentSpec] = React.useState<Spec | null>(null);

  // Subscribe to navigation changes
  React.useEffect(() => {
    const unsub = svc.store.subscribePath('/navigation/currentScreen', (value) => {
      const screenId = value as string;
      if (screenId) setCurrentScreenId(screenId);
    });
    return unsub;
  }, [svc]);

  // Load screen spec when currentScreenId changes
  React.useEffect(() => {
    if (!currentScreenId) return;
    let cancelled = false;
    setCurrentSpec(null); // Show loading while fetching
    appEngine.getScreenSpec(currentScreenId).then((spec) => {
      if (!cancelled) setCurrentSpec(spec);
    }).catch((err) => {
      console.error(`[MythikApp] Failed to load screen "${currentScreenId}":`, err);
    });
    return () => { cancelled = true; };
  }, [currentScreenId, appEngine]);

  // Cleanup
  React.useEffect(() => {
    return () => { appEngine.unmount(); };
  }, [appEngine]);

  // Context value
  const contextValue = React.useMemo(() => ({
    appEngine,
    svc,
    specStore,
    fetcher,
  }), [appEngine, svc, specStore, fetcher]);

  // Loading state
  if (!currentSpec) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <MythikRenderer
        spec={currentSpec}
        instance={svc}
        fetcher={fetcher}
      />
    </AppContext.Provider>
  );
}
