import { run, step } from '.';
import { lintStep } from './lint';

run(
  'validate',

  step('format', 'oxfmt'),
  lintStep,
);
