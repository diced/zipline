import dayjs from 'dayjs';
import { green, red, yellow, gray, white, bold, blue } from 'colorette';

export type LoggerLevel = 'info' | 'warn' | 'error' | 'debug' | 'trace';

export function log(name: string) {
  return new Logger(name);
}

export default class Logger {
  public constructor(public name: string) {}

  // Creates child of this logger
  public c(name: string) {
    return new Logger(`${this.name}::${name}`);
  }

  private format(message: string, level: LoggerLevel) {
    const timestamp = dayjs().format('YYYY-MM-DDTHH:mm:ss');

    return `${gray('[')}${timestamp} ${this.formatLevel(level)}  ${this.name}${gray(']')} ${message}`;
  }

  private formatLevel(level: LoggerLevel) {
    switch (level) {
      case 'info':
        return green('INFO ');
      case 'warn':
        return yellow('WARN ');
      case 'error':
        return red('ERROR');
      case 'debug':
        return yellow(bold('DEBUG'));
      case 'trace':
        return gray(bold('TRACE'));
      default:
        return white(bold('?????'));
    }
  }

  private formatExtra(extra: Record<string, unknown>) {
    return (
      ' ' +
      Object.entries(extra)
        .map(([key, value]) => `${blue(key)}${gray('=')}${JSON.stringify(value)}`)
        .join(' ')
    );
  }

  private write(message: string, level: LoggerLevel, extra?: Record<string, unknown>) {
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
    if (process.env.DEBUG !== 'zipline') return this;

    this.write(args, 'debug', extra);

    return this;
  }

  public trace(args: string, extra?: Record<string, unknown>) {
    this.write(args, 'trace', extra);
    return this;
  }
}
