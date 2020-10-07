import { bold, magenta, reset } from '@dicedtomato/colors';
import { Formatter } from './logger';

export class ConsoleFormatter implements Formatter {
  format(message: string, origin: string): string {
    return `${bold(magenta(origin))} ${bold('>')} ${reset(message)}`;
  }
}
