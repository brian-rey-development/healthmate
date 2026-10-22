import { defineConfig } from 'vitest/config';

const TEST_TIMEOUT_MS = 15_000;

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: TEST_TIMEOUT_MS,
    hookTimeout: TEST_TIMEOUT_MS,
  },
});
