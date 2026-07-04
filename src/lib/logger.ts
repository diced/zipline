import dayjs from 'dayjs';
import { isatty } from 'tty';
import { styleText } from 'util';
import { isMainThread } from 'worker_threads';

const canStyle = !process.env.ZIPLINE_NO_COLOR && isatty(1);

const style = (format: Parameters<typeof styleText>[0], text: string) =>
  canStyle ? styleText(format, text, { validateStream: false }) : text;

const colors: Record<string, (text: string) => string> = {
  green: (text: string) => style('green', text),
  red: (text: string) => style('red', text),
  yellow: (text: string) => style('yellow', text),
  gray: (text: string) => style('gray', text),
  white: (text: string) => style('white', text),
  bold: (text: string) => style('bold', text),
  blue: (text: string) => style('blue', text),
};

export type LoggerLevel = 'info' | 'warn' | 'error' | 'debug' | 'trace';

export function log(name: string) {
  return new Logger(name);
}

const SEPARATOR = '.';

export default class Logger {
  public constructor(public name: string) {}

  public c(name: string) {
    return new Logger(`${this.name}${SEPARATOR}${name}`);
  }

  private isZiplineDebug(): boolean {
    const debugVar = process.env.DEBUG;
    if (!debugVar) return false;

    if (debugVar === 'zipline') return true;

    const parts = debugVar.split(',').map((v) => v.trim());
    if (parts.includes('zipline') || parts.includes('*')) return true;

    return false;
  }

  private format(message: string, level: LoggerLevel) {
    const timestamp = dayjs().format(process.env.ZIPLINE_OVERRIDE_LOG_DATE_FORMAT ?? 'YYYY-MM-DDTHH:mm:ss');

    return `${colors.gray('[')}${timestamp} ${this.formatLevel(level)}  ${this.formatName()}${colors.gray(']')} ${message}`;
  }

  private formatName() {
    if (!canStyle) return this.name;

    return this.name
      .split(SEPARATOR)
      .map((part) => part)
      .join(colors.gray(SEPARATOR));
  }

  private formatLevel(level: LoggerLevel) {
    switch (level) {
      case 'info':
        return colors.green('INFO ');
      case 'warn':
        return colors.yellow('WARN ');
      case 'error':
        return colors.red('ERROR');
      case 'debug':
        return colors.yellow(colors.bold('DEBUG'));
      case 'trace':
        return colors.gray(colors.bold('TRACE'));
      default:
        return colors.white(colors.bold('?????'));
    }
  }

  private formatExtra(extra: Record<string, unknown>) {
    return (
      ' ' +
      Object.entries(extra)
        .map(
          ([key, value]) => `${colors.blue(key)}${colors.gray('=')}${JSON.stringify(value, this.replacer)}`,
        )
        .join(' ')
    );
  }

  private replacer(key: string, value: unknown) {
    if (key === 'password') return '********';
    if (key === 'avatar') return '[base64]';
    return value;
  }

  private workerDisabled(): boolean {
    const s = ['db', 'config'];

    return s.some((v) => this.name.startsWith(v));
  }

  private write(message: string, level: LoggerLevel, extra?: Record<string, unknown>) {
    if (!isMainThread && this.workerDisabled() && !process.env.ZIPLINE_OVERRIDE_DISABLED_WORKER_LOG) return;

    process.stdout.write(`${this.format(message, level)}${extra ? this.formatExtra(extra) : ''}\n`);
  }

  public info(args: string, extra?: Record<string, unknown>) {
    this.write(args, 'info', extra);
    return this;
  }

  public warn(args: string, extra?: Record<string, unknown>) {
    this.write(args, 'warn', extra);
    return this;
  }

  public error(args: string | Error, extra?: Record<string, unknown>) {
    this.write(args.toString(), 'error', extra);
    return this;
  }

  public debug(args: string, extra?: Record<string, unknown>) {
    if (!this.isZiplineDebug()) return this;

    this.write(args, 'debug', extra);

    return this;
  }

  public trace(args: string, extra?: Record<string, unknown>) {
    this.write(args, 'trace', extra);
    return this;
  }
}
