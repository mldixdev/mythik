import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/tests/**/*.integration.test.{ts,tsx}'],
    environment: 'node',
    testTimeout: 120000, // 2 min — tarball pack + install + vite build can take ~60s
    hookTimeout: 120000,
  },
  resolve: {
    alias: {
      // Integration tests do NOT alias mythik — they exercise the real
      // tarball. This config intentionally omits the alias block that the
      // default vitest config uses for source-aliased unit tests.
    },
  },
});
