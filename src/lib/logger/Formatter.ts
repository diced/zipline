import { ConsoleLevel } from '.';
import { blue, green, red, reset, white, yellow } from '@dicedtomato/colors';

export interface Formatter {
  format(
    message: string,
    origin: string,
    level: ConsoleLevel,
    time: Date
  ): string;
}

export class DefaultFormatter implements Formatter {
  formatLevel(level: ConsoleLevel) {
    return {
      0: yellow('debug') + ':',
      1: red('error') + ':',
      2: blue('info') + ':',
      3: white('trace') + ':',
      4: yellow('verbose') + ':'
    }[level];
  }

  format(
    message: string,
    origin: string,
    level: ConsoleLevel,
    time: Date
  ): string {
    return `[${time.toLocaleString().replace(',', '')}] [${green(origin.toLowerCase())}] ${this.formatLevel(
      level
    )} ${reset(message)}`;
  }
}
