import { styleText } from 'util';

export const COLORS = {
  green: (text: string) => styleText('green', text),
  gray: (text: string) => styleText('gray', text),
  bold: (text: string) => styleText('bold', text),
  red: (text: string) => styleText('red', text),
  boldBlue: (text: string) => styleText('bold', styleText('blue', text)),
  boldGreen: (text: string) => styleText('bold', styleText('green', text)),
  blue: (text: string) => styleText('blue', text),
};

type StepCommand = string | (() => void | Promise<void>);

export function step(name: string, command: StepCommand, condition: () => boolean = () => true) {
  return {
    name,
    command,
    condition,
  };
}

export type Step = ReturnType<typeof step>;

function log(message: string) {
  console.log(`\n${message}\n`);
}

function toReadableTime(value: number) {
  return value > 1e9 ? `${(value / 1e9).toFixed(2)}s` : `${(value / 1e6).toFixed(2)}ms`;
}

export async function run(name: string, ...steps: Step[]) {
  const { execSync } = await import('child_process');

  const runOne = process.argv[2];
  if (runOne) {
    const match = steps.find((s) => `${name}/${s.name}` === runOne);
    if (!match) {
      console.error(`${COLORS.red('x')} No step found with name "${COLORS.bold(runOne)}"`);
      process.exit(1);
    }

    steps = [match];
  }

  const timings: Record<string, string> = {};

  const start = process.hrtime();
  for (const step of steps) {
    const stepStart = process.hrtime();

    if (!step.condition()) {
      log(`${COLORS.gray('-')} Skipping step "${COLORS.bold(name)}/${COLORS.bold(step.name)}"...`);
      continue;
    }

    try {
      log(`${COLORS.boldBlue('>')} Running step "${COLORS.bold(name)}/${COLORS.bold(step.name)}"...`);
      if (typeof step.command === 'string') {
        execSync(step.command, { stdio: 'inherit' });
      } else {
        await step.command();
      }
    } catch {
      console.error(`${COLORS.red('x')} Step "${COLORS.bold(name)}/${COLORS.bold(step.name)}" failed.`);
      process.exit(1);
    }

    const diff = process.hrtime(stepStart);
    const timeStr = toReadableTime(diff[0] * 1e9 + diff[1]);

    timings[step.name] = timeStr;
  }

  const diff = process.hrtime(start);
  const timeStr = toReadableTime(diff[0] * 1e9 + diff[1]);

  console.log(
    `${COLORS.green('✓')} ${COLORS.blue(steps.length.toString())} steps completed in ${COLORS.boldGreen(timeStr)}.`,
  );
  for (const [stepName, stepTime] of Object.entries(timings).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  - ${COLORS.blue(stepName)}: ${COLORS.bold(stepTime)}`);
  }
}
