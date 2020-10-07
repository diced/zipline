import { ConsoleLevel } from "./Console";
import { brightGreen, blue } from "@dicedtomato/colors";

export interface Formatter {
  format(
    message: string,
    origin: string,
    level: ConsoleLevel,
    time: Date
  ): string;
}

export class DefaultFormatter implements Formatter {
  public format(
    message: string,
    origin: string,
    level: ConsoleLevel,
    time: Date
  ) {
    return `[${time.toLocaleString()}] ${brightGreen(origin)} - ${blue(
      ConsoleLevel[level]
    )}: ${message}`;
  }
}
