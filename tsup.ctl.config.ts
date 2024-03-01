import { defineConfig } from 'tsup';

export default defineConfig([
  {
    platform: 'node',
    format: 'cjs',
    treeshake: true,
    clean: false,
    sourcemap: true,
    entryPoints: {
      ctl: 'src/ctl/index.ts',
    },
    outDir: 'build',
    bundle: true,
    minify: true,
  },
]);
