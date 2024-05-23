import glob from 'fast-glob';
import { defineConfig } from 'tsup';

export default defineConfig(async (_) => {
  return [
    {
      platform: 'node',
      format: 'cjs',
      treeshake: true,
      clean: false,
      sourcemap: true,
      entryPoints: await glob('./src/**/*.ts', {
        ignore: ['./src/components/**/*.ts', './src/pages/**/*.ts'],
      }),
      outDir: 'build',
      external: ['argon2'],
    },
  ];
});
