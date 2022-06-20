const esbuild = require('esbuild');
const { existsSync } = require('fs');
const { rm } = require('fs/promises');

(async () => {
  const watch = process.argv[2] === '--watch';

  if (existsSync('./dist')) {
    await rm('./dist', { recursive: true });
  }

  await esbuild.build({
    tsconfig: 'tsconfig.json',
    outdir: 'dist',
    bundle: false,
    platform: 'node',
    treeShaking: true,
    entryPoints: [
      'src/server/index.ts',
      'src/server/server.ts',
      'src/server/util.ts',
      'src/lib/logger.ts',
      'src/lib/config.ts',
      'src/lib/config/Config.ts',
      'src/lib/config/readConfig.ts',
      'src/lib/config/validateConfig.ts',
      'src/lib/datasources/Datasource.ts',
      'src/lib/datasources/index.ts',
      'src/lib/datasources/Local.ts',
      'src/lib/datasources/S3.ts',
      'src/lib/datasource.ts',
    ],
    format: 'cjs',
    resolveExtensions: ['.ts', '.js'],
    write: true,
    watch,
    incremental: watch,
    sourcemap: false,
    minify: process.env.NODE_ENV === 'production',
  });
})();