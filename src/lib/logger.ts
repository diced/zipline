import { format } from 'fecha';
import { blueBright, red, cyan } from 'colorette';

export enum LoggerLevel {
  ERROR,
  INFO,
}

export default class Logger {
  public name: string;

  static get(clas: any) {
    if (typeof clas !== 'function')
      if (typeof clas !== 'string') throw new Error('not string/function');

    const name = clas.name ?? clas;

    return new Logger(name);
  }

  constructor(name: string) {
    this.name = name;
  }

  info(...args: any[]) {
    console.log(this.formatMessage(LoggerLevel.INFO, this.name, args.join(' ')));
  }

  error(...args: any[]) {
    console.log(
      this.formatMessage(
        LoggerLevel.ERROR,
        this.name,
        args.map((error) => error.stack ?? error).join(' ')
      )
    );
  }

  formatMessage(level: LoggerLevel, name: string, message: string) {
    const time = format(new Date(), 'YYYY-MM-DD hh:mm:ss,SSS A');
    return `${time} ${this.formatLevel(level)} [${blueBright(name)}] ${message}`;
  }

  formatLevel(level: LoggerLevel) {
    switch (level) {
      case LoggerLevel.INFO:
        return cyan('INFO ');
      case LoggerLevel.ERROR:
        return red('ERROR');
    }
  }
}