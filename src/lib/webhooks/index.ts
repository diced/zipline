import { Config } from '../config/validate';
import { log } from '../logger';
import { onUpload as discordOnUpload, onShorten as discordOnShorten } from './discord';
import { onUpload as httpOnUpload, onShorten as httpOnShorten } from './http';

const logger = log('webhooks');

export function onUpload(config: Config, args: Parameters<typeof discordOnUpload>[1]) {
  void Promise.all([discordOnUpload(config, args), httpOnUpload(config, args)]).catch((error) =>
    logger.error('upload webhook failed', { error: error instanceof Error ? error.message : error }),
  );
}

export function onShorten(config: Config, args: Parameters<typeof discordOnShorten>[1]) {
  void Promise.all([discordOnShorten(config, args), httpOnShorten(config, args)]).catch((error) =>
    logger.error('shorten webhook failed', { error: error instanceof Error ? error.message : error }),
  );
}
