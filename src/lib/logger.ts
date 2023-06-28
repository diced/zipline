import dayjs from 'dayjs';
import { green, red, yellow, gray, white, bold } from 'colorette';

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

  private write(message: string, level: LoggerLevel) {
    process.stdout.write(`${this.format(message, level)}\n`);
  }

  public info(...args: unknown[]) {
    this.write(args.join(' '), 'info');
    return this;
  }

  public warn(...args: unknown[]) {
    this.write(args.join(' '), 'warn');
    return this;
  }

  public error(...args: unknown[]) {
    this.write(args.join(' '), 'error');
    return this;
  }

  public debug(...args: unknown[]) {
    if (process.env.DEBUG !== 'zipline') return this;

    this.write(args.join(' '), 'debug');

    return this;
  }

  public trace(...args: unknown[]) {
    this.write(args.join(' '), 'trace');
    return this;
  }
}
