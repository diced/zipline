import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'toml';
import { ConnectionOptions } from 'typeorm';

export interface Config {
  database: ConnectionOptions;
  core: ConfigCore;
  meta: ConfigMeta;
  uploader: ConfigUploader;
  urls: ConfigUrls;
}

export interface ConfigMeta {
  title: string;
  description: string;
  thumbnail: string;
  color: string;
}

export interface ConfigUploader {
  directory: string;
  route: string;
  length: number;
  blacklisted: string[];
  original: boolean;
}

export interface ConfigUrls {
  route: string;
  length: number;
  vanity: boolean;
}

export interface ConfigCore {
  secret: string;
  port: number;
}

export class Configuration {
  static readConfig(): Config {
    try {
      const data = readFileSync(resolve(process.cwd(), 'Zipline.toml'), 'utf8');
      console.log(parse(data) as Config);
    } catch (e) {
      console.log(e);
      return null;
    }
  }
}
