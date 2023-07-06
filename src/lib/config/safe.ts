import { config } from '.';
import { Config } from './validate';

export type SafeConfig = Omit<Omit<Config, 'datasource'>, 'core'>;

export function safeConfig(): SafeConfig {
  const { datasource, core, ...rest } = config;

  return rest;
}

// TODO figure out later
// probably a better way to do this
// cbb
export function stringifyDates(config: SafeConfig) {
  const stringified = JSON.stringify(config, (_, v) => {
    if (v instanceof Date) return v.toISOString();
    return v;
  });

  return JSON.parse(stringified);
}
