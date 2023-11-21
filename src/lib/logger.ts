const COLORS = {
  blueBright: (str: string) => `\x1b[34m${str}\x1b[0m`,
  cyan: (str: string) => `\x1b[36m${str}\x1b[0m`,
  red: (str: string) => `\x1b[31m${str}\x1b[0m`,
  yellow: (str: string) => `\x1b[33m${str}\x1b[0m`,
  gray: (str: string) => `\x1b[90m${str}\x1b[0m`,
};

import dayjs from 'dayjs';

export enum LoggerLevel {
  ERROR,
  INFO,
  DEBUG,
}

export default class Logger {
  public name: string;

  static filters(): string[] {
    return (process.env.LOGGER_FILTERS ?? '').split(',').filter((x) => x !== '');
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  static get(klass: Function | string) {
    if (typeof klass !== 'function') if (typeof klass !== 'string') throw new Error('not string/function');

    const name = typeof klass === 'string' ? klass : klass.name;

    return new Logger(name);
  }

  constructor(name: string) {
    this.name = name;
  }

  child(name: string) {
    return new Logger(`${this.name}::${name}`);
  }

  show(): boolean {
    const filters = Logger.filters();
    if (!filters.length) return true;

    return filters.includes(this.name);
  }

  info(...args: unknown[]): this {
    if (!this.show()) return this;

    process.stdout.write(this.formatMessage(LoggerLevel.INFO, this.name, args.join(' ')));

    return this;
  }

  error(...args: unknown[]): this {
    if (!this.show()) return this;

    process.stdout.write(
      this.formatMessage(
        LoggerLevel.ERROR,
        this.name,
        args.map((error) => (typeof error === 'string' ? error : (error as Error).stack)).join(' '),
      ),
    );

    return this;
  }

  debug(...args: unknown[]): this {
    if (!process.env.DEBUG) return this;
    if (!this.show()) return this;

    process.stdout.write(this.formatMessage(LoggerLevel.DEBUG, this.name, args.join(' ')));

    return this;
  }

  formatMessage(level: LoggerLevel, name: string, message: string) {
    const time = dayjs().format('YYYY-MM-DD hh:mm:ss,SSS A');
    return `${COLORS.gray(time)} ${this.formatLevel(level)} [${COLORS.blueBright(name)}] ${message}\n`;
  }

  formatLevel(level: LoggerLevel) {
    switch (level) {
      case LoggerLevel.INFO:
        return COLORS.cyan('info ');
      case LoggerLevel.ERROR:
        return COLORS.red('error');
      case LoggerLevel.DEBUG:
        return COLORS.yellow('debug');
    }
  }
}
