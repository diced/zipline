import { blueBright, cyan, red, yellow } from 'colorette';
import dayjs from 'dayjs';

export enum LoggerLevel {
  ERROR,
  INFO,
  DEBUG,
}

export default class Logger {
  public name: string;

  static get(klass: any) {
    if (typeof klass !== 'function') if (typeof klass !== 'string') throw new Error('not string/function');

    const name = klass.name ?? klass;

    return new Logger(name);
  }

  constructor(name: string) {
    this.name = name;
  }

  child(name: string) {
    return new Logger(`${this.name}::${name}`);
  }

  info(...args: any[]): this {
    process.stdout.write(this.formatMessage(LoggerLevel.INFO, this.name, args.join(' ')));

    return this;
  }

  error(...args: any[]): this {
    process.stdout.write(
      this.formatMessage(LoggerLevel.ERROR, this.name, args.map((error) => error.stack ?? error).join(' '))
    );

    return this;
  }

  debug(...args: any[]): this {
    if (!process.env.DEBUG) return;

    process.stdout.write(this.formatMessage(LoggerLevel.DEBUG, this.name, args.join(' ')));

    return this;
  }

  formatMessage(level: LoggerLevel, name: string, message: string) {
    const time = dayjs().format('YYYY-MM-DD hh:mm:ss,SSS A');
    return `${time} ${this.formatLevel(level)} [${blueBright(name)}] ${message}\n`;
  }

  formatLevel(level: LoggerLevel) {
    switch (level) {
      case LoggerLevel.INFO:
        return cyan('info ');
      case LoggerLevel.ERROR:
        return red('error');
      case LoggerLevel.DEBUG:
        return yellow('debug');
    }
  }
}
