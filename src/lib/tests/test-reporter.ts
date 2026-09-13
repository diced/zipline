import type { TestEvent } from 'node:test/reporters';
import { relative } from 'path';
import { inspect } from 'util';
import { tsImport } from 'tsx/esm/api';

// Node loads reporters separately from test files, so register TypeScript loading here too.
const { COLORS }: typeof import('../../../scripts/index') = await tsImport(
  '../../../scripts/index.ts',
  import.meta.url,
);

function formatValue(value: unknown) {
  return inspect(value, { colors: false, depth: 5, breakLength: Infinity, compact: true });
}

function formatDuration(duration: number) {
  return duration >= 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration.toFixed(2)}ms`;
}

function formatError(error: Error): string {
  const cause = error.cause ?? error;

  if (typeof cause !== 'object' || cause === null) return `    ${String(cause)}\n`;

  if ('expected' in cause && 'actual' in cause) {
    // throws(), rejects(), and fail() can fail without a pair of values to compare.
    if (cause.expected === undefined && cause.actual === undefined && 'message' in cause) {
      return `    ${String(cause.message)}\n`;
    }

    const message =
      'generatedMessage' in cause && cause.generatedMessage === false && 'message' in cause
        ? `    ${String(cause.message).split('\n\n')[0]}\n`
        : '';

    return (
      message +
      `    ${COLORS.green('Expected:')} ${formatValue(cause.expected)}\n` +
      `    ${COLORS.red('Received:')} ${formatValue(cause.actual)}\n`
    );
  }

  return `    ${'message' in cause ? String(cause.message) : formatValue(cause)}\n`;
}

export default async function* reporter(source: AsyncIterable<TestEvent>) {
  let currentFile: string | undefined;

  yield `\n${COLORS.boldBlue('>')} Running tests...\n`;

  for await (const event of source) {
    switch (event.type) {
      case 'test:pass':
      case 'test:fail': {
        const { data } = event;
        const file = data.file ? relative(process.cwd(), data.file) : '(unknown file)';

        if (file !== currentFile) {
          currentFile = file;
          yield `\n${COLORS.bold(file)}\n`;
        }

        const marker =
          data.skip || data.todo
            ? COLORS.gray('-')
            : event.type === 'test:pass'
              ? COLORS.green('✓')
              : COLORS.red('x');
        const status = data.skip ? ' (skipped)' : data.todo ? ' (todo)' : '';
        const time = formatDuration(data.details.duration_ms);

        yield `  ${marker} ${data.name}${status} ${COLORS.gray(`(${time})`)}\n`;

        if (event.type === 'test:fail' && !data.skip && !data.todo) {
          if (data.line)
            yield `    ${COLORS.gray(`${file}:${data.line}${data.column ? `:${data.column}` : ''}`)}\n`;
          yield formatError(event.data.details.error);
        }
        break;
      }

      case 'test:stdout':
      case 'test:stderr':
        yield event.data.message;
        break;

      case 'test:diagnostic':
        if (event.data.nesting > 0 || event.data.level === 'warn' || event.data.level === 'error') {
          yield `    ${event.data.message}\n`;
        }
        break;

      case 'test:summary': {
        if (event.data.file) break;

        const { counts, success, duration_ms } = event.data;
        const failed = counts.tests - counts.passed - counts.skipped - counts.todo - counts.cancelled;
        const results = [
          COLORS.green(`${counts.passed} passed`),
          (failed || !success) && COLORS.red(`${failed} failed`),
          counts.cancelled && COLORS.red(`${counts.cancelled} cancelled`),
          counts.skipped && COLORS.gray(`${counts.skipped} skipped`),
          counts.todo && COLORS.gray(`${counts.todo} todo`),
        ].filter(Boolean);
        yield `\n${success ? COLORS.green('✓') : COLORS.red('x')} ${results.join(', ')} ${COLORS.gray(`(${counts.tests} tests, ${formatDuration(duration_ms)} total)`)}\n\n`;
        break;
      }
    }
  }
}
