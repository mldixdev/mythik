import React from 'react';

export const SafeAreaProvider = ({ children }: Record<string, unknown>) => React.createElement('div', null, children);
export const SafeAreaView = ({ children, style }: Record<string, unknown>) => React.createElement('div', { style }, children);
export const useSafeAreaInsets = () => ({ top: 47, bottom: 34, left: 0, right: 0 });
