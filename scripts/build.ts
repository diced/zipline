import { run, step } from '.';
import { lintStep } from './lint';

run(
  'build',

  step('format', 'oxfmt --check'),
  lintStep,
  step('typecheck', 'tsc', () => !process.argv.includes('--skip')),

  // builds
  step('server', 'tsup'),

  // client stuff
  step('client', 'vite build'),
  step(
    'client/ssr/view',
    'vite build --ssr ssr-view/server.tsx -m ssr-view --outDir ../../build/ssr --emptyOutDir=false',
  ),
  step(
    'client/ssr/view-url',
    'vite build --ssr ssr-view-url/server.tsx -m ssr-view-url --outDir ../../build/ssr --emptyOutDir=false',
  ),
);
