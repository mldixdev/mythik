import React from 'react';
import type { AppEngine } from 'mythik';
import type { MythikInstance } from 'mythik';
import type { SpecStore } from 'mythik';
import type { SpecRuntime } from 'mythik';

export interface AppContextValue {
  appEngine: AppEngine;
  svc: MythikInstance;
  specStore: SpecStore;
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
  onSpecRuntimeMount?: (runtime: SpecRuntime | null) => void;
}

export const AppContext = React.createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <MythikApp>');
  return ctx;
}
