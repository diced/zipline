import { run, step } from '.';
import { lintStep } from './lint';

run(
  'validate',

  step('format', 'prettier --write --ignore-path .gitignore --ignore-path .prettierignore .'),
  lintStep,
);
