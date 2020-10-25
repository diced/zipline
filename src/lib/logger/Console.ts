import { Formatter, DefaultFormatter } from './Formatter';

declare global {
  // eslint-disable-next-line
  module NodeJS {
    interface Global {
      logr: { formatter: Formatter };
    }
  }
}

if (!global.logr) global.logr = { formatter: null };

export enum ConsoleLevel {
  DEBUG,
  ERROR,
  INFO,
  TRACE,
  VERBOSE,
}

export class Console {
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  public debug(message: string): string {
    return this.log(ConsoleLevel.DEBUG, message);
  }

  public error(message: string): string {
    return this.log(ConsoleLevel.ERROR, message);
  }

  public info(message: string): string {
    return this.log(ConsoleLevel.INFO, message);
  }

  public trace(message: string): string {
    return this.log(ConsoleLevel.TRACE, message);
  }

  public verbose(message: string): string {
    if (process.env.VERBOSE) return this.log(ConsoleLevel.VERBOSE, message);
  }

  public log(level: ConsoleLevel, message: string): string {
    const formatter = global.logr.formatter || new DefaultFormatter();
    console.log(formatter.format(message, this.name, level, new Date()));
    return formatter.format(message, this.name, level, new Date());
  }

  public static setFormatter(formatter: Formatter): void {
    global.logr.formatter = formatter;
  }
  // eslint-disable-next-line @typescript-eslint/ban-types
  public static logger(o: string | Function): Console {
    const name = o instanceof Function ? o.name : o;
    return new Console(name);
  }
}
