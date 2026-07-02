import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    setupFiles: [
      './src/test/setup.ts',
      './src/test/integration-setup.ts',
      './src/test/integration-teardown.ts',
    ],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
