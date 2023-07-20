import { config } from '.';
import enabled from '../oauth/enabled';
import { Config } from './validate';

export type SafeConfig = Omit<Config, 'oauth' | 'datasource' | 'core'> & {
  oauthEnabled: ReturnType<typeof enabled>;
};

export function safeConfig(): SafeConfig {
  const { datasource, core, oauth, ...rest } = config;

  (rest as SafeConfig).oauthEnabled = enabled(config);

  return rest as SafeConfig;
}
