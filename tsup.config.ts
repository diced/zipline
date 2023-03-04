import { defineConfig, Options } from 'tsup';

const opts: Options = {
  platform: 'node',
  format: ['cjs'],
  treeshake: true,
  clean: true,
  sourcemap: true,
};

export default defineConfig([
  {
    entryPoints: ['src/server/index.ts'],
    ...opts,
  },
  // scripts
  {
    entryPoints: ['src/scripts/import-dir.ts'],
    outDir: 'dist/scripts',
    ...opts,
  },
  {
    entryPoints: ['src/scripts/list-users.ts'],
    outDir: 'dist/scripts',
    ...opts,
  },
  {
    entryPoints: ['src/scripts/read-config.ts'],
    outDir: 'dist/scripts',
    ...opts,
  },
  {
    entryPoints: ['src/scripts/set-user.ts'],
    outDir: 'dist/scripts',
    ...opts,
  },
  {
    entryPoints: ['src/scripts/clear-zero-byte.ts'],
    outDir: 'dist/scripts',
    ...opts,
  },
]);
