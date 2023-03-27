const esbuild = require('esbuild');
const { existsSync } = require('fs');
const { rm } = require('fs/promises');
const { recursiveReadDir } = require('next/dist/lib/recursive-readdir');

(async () => {
  if (existsSync('./dist')) {
    await rm('./dist', { recursive: true });
  }

  const entryPoints = await recursiveReadDir('./src', /.*\.(ts)$/, /(themes|queries|pages)/);

  await esbuild.build({
    tsconfig: 'tsconfig.json',
    outdir: 'dist',
    platform: 'node',
    entryPoints,
    format: 'cjs',
    resolveExtensions: ['.ts', '.js'],
    write: true,
    sourcemap: true,
  });
})();
