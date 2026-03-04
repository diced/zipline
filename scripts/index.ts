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

export async function run(name: string, ...steps: Step[]) {
  const { execSync } = await import('child_process');

  const runOne = process.argv[2];
  if (runOne) {
    const match = steps.find((s) => `${name}/${s.name}` === runOne);
    if (!match) {
      console.error(`x No step found with name "${runOne}"`);
      process.exit(1);
    }

    steps = [match];
  }

  const start = process.hrtime();
  for (const step of steps) {
    if (!step.condition()) {
      log(`- Skipping step "${name}/${step.name}"...`);
      continue;
    }

    try {
      log(`> Running step "${name}/${step.name}"...`);
      if (typeof step.command === 'string') {
        execSync(step.command, { stdio: 'inherit' });
      } else {
        await step.command();
      }
    } catch {
      console.error(`x Step "${name}/${step.name}" failed.`);
      process.exit(1);
    }
  }

  const diff = process.hrtime(start);
  const time = diff[0] * 1e9 + diff[1];
  const timeStr = time > 1e9 ? `${(time / 1e9).toFixed(2)}s` : `${(time / 1e6).toFixed(2)}ms`;
  log(`✓ Steps in "${name}" completed in ${timeStr}.`);
}
