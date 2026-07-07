import glob from 'fast-glob';
import { copyFile, mkdir } from 'fs/promises';
import { replaceTscAliasPaths } from 'tsc-alias';
import { defineConfig } from 'tsup';

export default defineConfig(async (_) => {
  return [
    {
      platform: 'node',
      format: 'esm',
      outExtension: () => ({ js: '.js' }),
      clean: true,
      sourcemap: true,
      entry: await glob('./src/**/*.ts', {
        ignore: ['./src/components/**/*.ts', './src/client/**/*.(ts|tsx|html)'],
      }),
      shims: false,
      esbuildPlugins: [],
      outDir: 'build',
      bundle: false,
      onSuccess: async () => {
        console.log('[ts] replacing ts paths...');
        await replaceTscAliasPaths({
          configFile: 'tsconfig.json',
          outDir: 'build',
          resolveFullPaths: true,
          resolveFullExtension: '.js',
        });

        console.log('[built-ins] copying builtins...');
        const builtins = await glob('./src/lib/theme/builtins/*.theme.json');

        await mkdir('./build/lib/theme/builtins', { recursive: true });
        for (const builtin of builtins) {
          await copyFile(builtin, builtin.replace('./src/', './build/'));
        }
      },
    },
  ];
});
