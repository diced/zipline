import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'toml-patch';
import { ConnectionOptions } from 'typeorm';
import { Webhooks, WebhookType } from './Webhooks';

export interface Config {
  database: ConnectionOptions;
  core: ConfigCore;
  meta: ConfigMeta;
  uploader: ConfigUploader;
  urls: ConfigUrls;
  webhooks?: ConfigWebhooks;
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
  rich_content_route?: string;
  length: number;
  blacklisted: string[];
  original: boolean;
}

export interface ConfigUrls {
  route: string;
  length: number;
  vanity: boolean;
}

export interface ConfigCoreRateLimiter {
  requests: number;
  retry_after: number;
}

export interface ConfigCore {
  secret: string;
  host: string;
  port: number;
  secure?: boolean;
  blacklisted_ips?: string[];
  ratelimiter?: ConfigCoreRateLimiter;
  theme?: 'dark' | 'light';
  mfa?: boolean;
  log?: boolean;
}

export interface ConfigWebhooks {
  enabled?: boolean;
  url?: string;
  events?: WebhookType[];
  username?: string;
  avatar?: string;

  upload?: ConfigWebhooksEvent;
  create_user?: ConfigWebhooksEvent;
  delete_image?: ConfigWebhooksEvent;
  delete_url?: ConfigWebhooksEvent;
  shorten?: ConfigWebhooksEvent;
  login?: ConfigWebhooksEvent;
  token_reset?: ConfigWebhooksEvent;
  user_edit?: ConfigWebhooksEvent;
  user_delete?: ConfigWebhooksEvent;
}

export interface ConfigWebhooksEvent {
  content: string;
}

export class Configuration {
  static readConfig(): Config {
    try {
      const data = readFileSync(resolve(process.cwd(), 'Zipline.toml'), 'utf8');
      const parsed = parse(data);
      if (parsed.webhooks) parsed.webhooks.events = Webhooks.convert(parsed.webhooks.events);
      return parsed;
    } catch (e) {
      return null;
    }
  }
}
