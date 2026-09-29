import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: { include: ['src/lib/game/**'], thresholds: { lines: 80, functions: 80, statements: 80 } },
  },
});
