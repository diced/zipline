import { config } from '.';
import enabled from '../oauth/enabled';
import { Config } from './validate';

export type SafeConfig = Omit<Config, 'oauth' | 'datasource' | 'core'> & {
  oauthEnabled: ReturnType<typeof enabled>;
  oauth: {
    bypassLocalLogin: boolean;
    loginOnly: boolean;
  }
};

export function safeConfig(): SafeConfig {
  const { datasource, core, oauth, ...rest } = config;

  (rest as SafeConfig).oauthEnabled = enabled(config);
  (rest as SafeConfig).oauth = {
    bypassLocalLogin: oauth.bypassLocalLogin,
    loginOnly: oauth.loginOnly,
  };

  return rest as SafeConfig;
}
