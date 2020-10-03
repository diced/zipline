import { bold, magenta, reset } from "@dicedtomato/colors";
import { ConsoleLevel, Formatter } from "./logger";

export class ConsoleFormatter implements Formatter {
  format(message: string, origin: string, level: ConsoleLevel, time: Date): string {
    return `${bold(magenta(origin))} ${bold(">")} ${reset(message)}`
  }
}