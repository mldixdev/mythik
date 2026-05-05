/**
 * DeviceContext — platform-agnostic device information contract.
 * Each renderer (React web, React Native, SSR) implements a provider
 * that writes these values to /ui/device/* in the state store.
 */
export interface DeviceContext {
  viewportWidth: number;
  viewportHeight: number;
  platform: 'web' | 'ios' | 'android';
  orientation: 'portrait' | 'landscape';
  colorScheme: 'light' | 'dark';
}
