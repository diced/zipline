import { PROP_TO_ENV } from '@/lib/config/read';
import { Config } from '@/lib/config/validate';

export function checkRateLimit(config: Config) {
  if (config.ratelimit.max <= 0) throw new Error(`${PROP_TO_ENV['ratelimit.max']} must be greater than 0`);

  if (config.ratelimit.window && !config.ratelimit.max)
    throw new Error(
      `${PROP_TO_ENV['ratelimit.max']} must be set if ${PROP_TO_ENV['ratelimit.window']} is set`,
    );

  return;
}
