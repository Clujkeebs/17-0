import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // The play-engine tests simulate hundreds of snaps; v8 coverage slows that several times over on a CI runner, so 5 seconds is too tight.
    testTimeout: 30_000,
    coverage: { include: ['src/lib/game/**'], thresholds: { lines: 80, functions: 80, statements: 80 } },
  },
});
