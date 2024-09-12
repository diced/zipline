import { Config } from '@/lib/config/validate';

export function checkRateLimit(config: Config) {
  if (config.ratelimit.max <= 0) throw new Error('ratelimitMax must be greater than 0');

  if (config.ratelimit.window && !config.ratelimit.max)
    throw new Error('ratelimitMax must be set if ratelimitWindow is set');

  return;
}
