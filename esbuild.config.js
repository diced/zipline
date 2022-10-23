const esbuild = require('esbuild');
const { existsSync } = require('fs');
const { rm } = require('fs/promises');

(async () => {
  if (existsSync('./dist')) {
    await rm('./dist', { recursive: true });
  }

  await esbuild.build({
    tsconfig: 'tsconfig.json',
    outdir: 'dist',
    bundle: false,
    platform: 'node',
    entryPoints: [
      'src/server/index.ts',
      'src/server/util.ts',
      'src/lib/logger.ts',
      'src/lib/config.ts',
      'src/lib/mimes.ts',
      'src/lib/exts.ts',
      'src/lib/config/Config.ts',
      'src/lib/config/readConfig.ts',
      'src/lib/config/validateConfig.ts',
      'src/lib/datasources/Datasource.ts',
      'src/lib/datasources/index.ts',
      'src/lib/datasources/Local.ts',
      'src/lib/datasources/S3.ts',
      'src/lib/datasources/Swift.ts',
      'src/lib/datasource.ts',
      'src/scripts/read-config.ts',
      'src/scripts/import-dir.ts',
    ],
    format: 'cjs',
    resolveExtensions: ['.ts', '.js'],
    write: true,
    sourcemap: true,
    minify: false,
  });
})();
