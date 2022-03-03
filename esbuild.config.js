const esbuild = require('esbuild');

(async () => {
  const watch = process.argv[2] === '--watch';

  await esbuild.build({
    tsconfig: 'tsconfig.json',
    outdir: 'dist',
    bundle: false,
    platform: 'node',
    treeShaking: true,
    entryPoints: [
      'src/server/index.ts',
      'src/server/util.ts',
      'src/server/validateConfig.ts',
      'src/lib/logger.ts',
      'src/lib/readConfig.ts',
      'src/lib/datasource/datasource.ts',
      'src/lib/datasource/index.ts',
      'src/lib/datasource/Local.ts',
      'src/lib/datasource/S3.ts',
      'src/lib/ds.ts',
      'src/lib/config.ts',
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