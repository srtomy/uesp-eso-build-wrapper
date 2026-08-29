import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Serial execution required: the UESP engine writes to process globals via
    // vm.runInThisContext and is not safe to run concurrently within the same worker.
    pool: 'forks',
    forkOptions: {
      singleFork: true,
    },
    coverage: {
      provider: 'v8',
      // lcov feeds the SonarCloud scan (sonar.javascript.lcov.reportPaths);
      // json-summary feeds scripts/coverage-summary.mjs.
      reporter: ['text', 'json-summary', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
