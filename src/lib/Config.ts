import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'toml';
import { ConnectionOptions } from 'typeorm';

export interface Config {
  database: ConnectionOptions;
  core: ConfigCore;
}

export interface ConfigMongo {
  url: string;
  database: string;
}

export interface ConfigCore {
  secret: string;
  port: number;
}

export class Configuration {
  static readConfig(): Config {
    try {
      const data = readFileSync(resolve(process.cwd(), "Zipline.toml"), 'utf8');
      return parse(data) as Config;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
}