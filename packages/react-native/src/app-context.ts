import React from 'react';
import type { AppEngine, MythikInstance, SpecStore } from 'mythik';

interface AppContextValue {
  appEngine: AppEngine;
  svc: MythikInstance;
  specStore: SpecStore;
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
}

export const AppContext = React.createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within MythikApp');
  return ctx;
}
