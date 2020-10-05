import { getType } from "mime";
import { findFile } from "../util";
import Logger from "@ayanaware/logger";
import { readFileSync } from "fs";

if (!findFile("config.json", process.cwd())) {
  Logger.get("FS").error(
    `No config.json exists in the ${__dirname}, exiting...`
  );
  process.exit(1);
}

const config = JSON.parse(
  readFileSync(findFile("config.json", process.cwd()), "utf8")
);

export interface Shortened {
  url: string;
  origin: string;
  protocol: string;
  key: string;
  extension: string;
  mime: string;
}

export class ShortenUtil {
  static parseURL(url: string): Shortened {
    const parsed = new URL(url);
    return {
      url: parsed.href,
      origin: parsed.origin,
      protocol: parsed.protocol.slice(0, -1),
      key: parsed.pathname.startsWith(config.shorten.route)
        ? parsed.pathname.slice(3).split(".")[0]
        : null,
      extension: parsed.pathname.startsWith(config.shorten.route)
        ? parsed.pathname.slice(3).split(".")[1]
        : null,
      mime: parsed.pathname.startsWith(config.shorten.route)
        ? getType(parsed.pathname.slice(3).split(".")[1])
        : null,
    };
  }
}
