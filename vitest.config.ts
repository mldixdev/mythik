import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/tests/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      // Integration tests run via `pnpm test:integration` with vitest.integration.config.ts
      // (node environment, longer timeouts, no mythik alias).
      'packages/*/tests/**/*.integration.test.{ts,tsx}',
    ],
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      // Order: mythik/server MUST come before mythik because Vite
      // matches aliases by startsWith; the longer subpath must win.
      'mythik/server': path.resolve(__dirname, 'packages/core/src/server.ts'),
      'mythik': path.resolve(__dirname, 'packages/core/src/index.ts'),
      // React Native mocks for mythik-react-native tests
      'react-native': path.resolve(__dirname, 'packages/react-native/tests/__mocks__/react-native.ts'),
      'react-native-safe-area-context': path.resolve(__dirname, 'packages/react-native/tests/__mocks__/react-native-safe-area-context.ts'),
      'moti': path.resolve(__dirname, 'packages/react-native/tests/__mocks__/moti.ts'),
      'moti/skeleton': path.resolve(__dirname, 'packages/react-native/tests/__mocks__/moti.ts'),
      'expo-linear-gradient': path.resolve(__dirname, 'packages/react-native/tests/__mocks__/expo-linear-gradient.ts'),
      'react-native-svg': path.resolve(__dirname, 'packages/react-native/tests/__mocks__/react-native-svg.ts'),
      'react-native-reanimated': path.resolve(__dirname, 'packages/react-native/tests/__mocks__/react-native-reanimated.ts'),
      'expo-haptics': path.resolve(__dirname, 'packages/react-native/tests/__mocks__/expo-haptics.ts'),
      'expo-blur': path.resolve(__dirname, 'packages/react-native/tests/__mocks__/expo-blur.ts'),
      '@react-native-community/slider': path.resolve(__dirname, 'packages/react-native/tests/__mocks__/@react-native-community/slider.ts'),
    },
  },
});
