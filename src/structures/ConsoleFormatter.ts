import { Formatter, LogLevel, LogMeta } from "@ayanaware/logger";
import chalk from "chalk";

export class ConsoleFormatter extends Formatter {
  public formatError(meta: Readonly<LogMeta>, error: Error): string {
    return error.toString();
  }

  public formatMessage(meta: Readonly<LogMeta>, message: string): string {
    return `${this.formatTimestamp()} ${this.formatLevel(
      meta.level
    )} ${this.formatName(meta.origin.name)}: ${message}`;
  }

  public formatName(name: string): string {
    return `${chalk.greenBright(name)}`;
  }

  public formatTimestamp(): string {
    return new Date().toLocaleString().split(", ").join(" ");
  }

  public formatLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return `${chalk.yellowBright("debug")}`;
      case LogLevel.ERROR:
        return `${chalk.redBright("err")}    `;
      case LogLevel.INFO:
        return `${chalk.blue("info")}   `;
      case LogLevel.OFF:
        return `${chalk.white("off")}   `;
      case LogLevel.TRACE:
        return `${chalk.magenta("trace")}     `;
      case LogLevel.WARN:
        return `${chalk.yellow("warn")}   `;
    }
  }
}
