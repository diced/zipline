import { config } from '.';
import { Config } from './validate';

export type SafeConfig = Omit<Config, 'oauth' | 'datasource' | 'core'>;

export function safeConfig(): SafeConfig {
  const { datasource, core, oauth, ...rest } = config;

  return rest;
}
