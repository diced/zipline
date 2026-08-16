import dayjs from 'dayjs';
import { isatty } from 'tty';
import { styleText } from 'util';
import { isMainThread } from 'worker_threads';

const canStyle = !process.env.ZIPLINE_NO_COLOR && isatty(1);

const style = (format: Parameters<typeof styleText>[0], text: string) =>
  canStyle ? styleText(format, text, { validateStream: false }) : text;

export type LoggerLevel = 'info' | 'warn' | 'error' | 'debug' | 'trace';

export function log(name: string) {
  return new Logger(name);
}

export default class Logger {
  static SEPARATOR = '.';
  static COLORS: Record<string, (text: string) => string> = {
    green: (text: string) => style('green', text),
    red: (text: string) => style('red', text),
    yellow: (text: string) => style('yellow', text),
    gray: (text: string) => style('gray', text),
    white: (text: string) => style('white', text),
    bold: (text: string) => style('bold', text),
    blue: (text: string) => style('blue', text),
  };

  public constructor(public name: string) {}

  public c(name: string) {
    return new Logger(`${this.name}${Logger.SEPARATOR}${name}`);
  }

  private isZiplineDebug(): boolean {
    const debugVar = process.env.DEBUG;
    if (!debugVar) return false;

    const parts = debugVar.split(',').map((v) => v.trim());
    const loggerName = `zipline${Logger.SEPARATOR}${this.name}`;
    const disabled = parts.some((part) => {
      if (!part.startsWith('!')) return false;

      const name = part.slice(1);
      return (
        name === 'zipline' ||
        name === '*' ||
        loggerName === name ||
        loggerName.startsWith(`${name}${Logger.SEPARATOR}`)
      );
    });

    if (disabled) return false;

    return parts.includes('zipline') || parts.includes('*') || parts.includes(loggerName);
  }

  private format(message: string, level: LoggerLevel) {
    const timestamp = dayjs().format(process.env.ZIPLINE_OVERRIDE_LOG_DATE_FORMAT ?? 'YYYY-MM-DDTHH:mm:ss');

    return `${Logger.COLORS.gray('[')}${timestamp} ${this.formatLevel(level)}  ${this.formatName()}${Logger.COLORS.gray(']')} ${message}`;
  }

  private formatName() {
    if (!canStyle) return this.name;

    return this.name.split(Logger.SEPARATOR).join(Logger.COLORS.gray(Logger.SEPARATOR));
  }

  private formatLevel(level: LoggerLevel) {
    switch (level) {
      case 'info':
        return Logger.COLORS.green('INFO ');
      case 'warn':
        return Logger.COLORS.yellow('WARN ');
      case 'error':
        return Logger.COLORS.red('ERROR');
      case 'debug':
        return Logger.COLORS.yellow(Logger.COLORS.bold('DEBUG'));
      case 'trace':
        return Logger.COLORS.gray(Logger.COLORS.bold('TRACE'));
      default:
        return Logger.COLORS.white(Logger.COLORS.bold('?????'));
    }
  }

  private formatExtra(extra: Record<string, unknown>) {
    return (
      ' ' +
      Object.entries(extra)
        .map(
          ([key, value]) =>
            `${Logger.COLORS.blue(key)}${Logger.COLORS.gray('=')}${JSON.stringify(value, this.replacer)}`,
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
