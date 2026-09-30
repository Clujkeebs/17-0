// Bundles the worker, migrator, cron and backup scripts into self-contained ESM files in dist/.
import { build } from 'esbuild';

const common = {
  bundle: true, platform: 'node', target: 'node22', format: 'esm', sourcemap: true, logLevel: 'info',
  alias: { '@': './src' },
  banner: { js: "import { createRequire as __glCreateRequire } from 'module'; const require = __glCreateRequire(import.meta.url);" },
  external: ['playwright-core', 'chromium-bidi'],
};
await build({ ...common, entryPoints: ['worker/index.ts'], outfile: 'dist/worker.mjs', external: ['playwright-core', 'chromium-bidi'] });
await build({ ...common, entryPoints: ['scripts/migrate.ts'], outfile: 'dist/migrate.mjs', external: [] });
await build({ ...common, entryPoints: ['scripts/seed.ts'], outfile: 'dist/seed.mjs', external: [] });
await build({ ...common, entryPoints: ['scripts/cron.mjs'], outfile: 'dist/cron.mjs', external: [] });
await build({ ...common, entryPoints: ['scripts/backup.mjs'], outfile: 'dist/backup.mjs', external: [] });
