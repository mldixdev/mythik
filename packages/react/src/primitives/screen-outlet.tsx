import React from 'react';
import type { CSSProperties } from 'react';
import type { Spec, ActionBinding } from 'mythik';
import { createActionDispatcher } from 'mythik';
import { useAppContext } from '../app-context.js';
import { MythikRenderer } from '../MythikRenderer.js';

type ScreenState =
  | { status: 'loading' }
  | { status: 'ready'; spec: Spec; screenId: string }
  | { status: 'error'; message: string };

interface ScreenOutletProps {
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
}

export function ScreenOutlet({ style }: ScreenOutletProps): React.ReactElement {
  const { appEngine, svc, fetcher, onSpecRuntimeMount } = useAppContext();
  const [screenState, setScreenState] = React.useState<ScreenState>({ status: 'loading' });

  React.useEffect(() => {
    let cancelled = false;

    const loadScreen = async () => {
      const screenId = svc.store.get('/navigation/currentScreen') as string;
      if (!screenId) return;

      // Skip if already showing this screen
      if (screenState.status === 'ready' && screenState.screenId === screenId) return;

      setScreenState({ status: 'loading' });

      try {
        const spec = await appEngine.getScreenSpec(screenId);
        if (!cancelled) {
          setScreenState({ status: 'ready', spec, screenId });
        }
      } catch (err) {
        if (!cancelled) {
          setScreenState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to load screen',
          });
        }
      }
    };

    loadScreen();

    const unsub = svc.store.subscribePath('/navigation/currentScreen', () => {
      loadScreen();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [svc, appEngine]); // DON'T depend on screenState — would cause loops

  // Execute initialActions when a new screen loads
  const executedScreenRef = React.useRef<string>('');
  React.useEffect(() => {
    if (screenState.status !== 'ready') return;
    if (executedScreenRef.current === screenState.screenId) return;
    executedScreenRef.current = screenState.screenId;

    const spec = screenState.spec;
    if (!spec.initialActions || spec.initialActions.length === 0) return;

    const dispatcher = createActionDispatcher({
      store: svc.store,
      customActions: svc.plugins.getActions(),
      urlGuard: svc.security?.urlGuard,
      stateGuard: svc.security?.stateGuard,
      rateLimiter: svc.security?.rateLimiter,
      fetcher,
    });

    (async () => {
      for (const binding of spec.initialActions!) {
        try {
          if (!('action' in binding)) continue; // Skip transaction bindings
          await dispatcher.dispatch(binding, (expr) => svc.resolver.resolve(expr));
        } catch (err) {
          const authActions = ['login', 'logout', 'refreshSession'];
          const actionName = 'action' in binding ? (binding as { action: string }).action : '';
          if (!authActions.includes(actionName) || process.env.NODE_ENV !== 'production') {
            console.error(`Screen initialAction failed:`, err);
          }
        }
      }
    })();
  }, [screenState, svc]);

  if (screenState.status === 'loading') {
    return React.createElement('div', {
      style: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, flex: 1, ...style },
    },
      React.createElement('div', {
        style: { width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#1E40AF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
      }),
    );
  }

  if (screenState.status === 'error') {
    return React.createElement('div', {
      style: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8, flex: 1, ...style },
    },
      React.createElement('div', { style: { color: '#DC2626', fontSize: 16, fontWeight: 600 } }, 'Error'),
      React.createElement('div', { style: { color: '#64748B', fontSize: 14 } }, screenState.message),
    );
  }

  return React.createElement('div', { style: { flex: 1, ...style } },
    React.createElement(MythikRenderer, { spec: screenState.spec, instance: svc, fetcher, onSpecRuntimeMount }),
  );
}
