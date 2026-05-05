import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAppContext } from './app-context.js';
import { MythikRenderer } from './MythikRenderer.js';
import type { Spec } from 'mythik';

interface MythikScreenProps {
  route: { params?: { screenId?: string } };
}

/**
 * Loads a screen spec from AppEngine and renders it with MythikRenderer.
 * Used as the component for each React Navigation screen.
 */
export function MythikScreen({ route }: MythikScreenProps) {
  const { appEngine, svc, fetcher } = useAppContext();
  const screenId = route.params?.screenId;
  const [spec, setSpec] = React.useState<Spec | null>(null);

  React.useEffect(() => {
    if (!screenId) return;
    let cancelled = false;
    appEngine.getScreenSpec(screenId).then((s) => {
      if (!cancelled && s) setSpec(s);
    }).catch((err) => {
      console.error(`[Mythik] Failed to load screen "${screenId}":`, err);
    });
    return () => { cancelled = true; };
  }, [screenId, appEngine]);

  if (!spec) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <MythikRenderer
      spec={spec}
      instance={svc}
      fetcher={fetcher}
    />
  );
}
