import enabled from '../oauth/enabled';
import { version } from '../version';
import { Config } from './validate';

export type SafeConfig = Omit<
  Config,
  'oauth' | 'datasource' | 'core' | 'discord' | 'httpWebhook' | 'ratelimit'
> & {
  oauthEnabled: ReturnType<typeof enabled>;
  oauth: {
    bypassLocalLogin: boolean;
    loginOnly: boolean;
  };
  version: string;
};

export function safeConfig(config: Config): SafeConfig {
  const { datasource: _d, core: _c, oauth, discord: _di, ratelimit: _r, httpWebhook: _h, ...rest } = config;

  return {
    ...rest,
    oauthEnabled: enabled(config),
    oauth: {
      bypassLocalLogin: oauth.bypassLocalLogin,
      loginOnly: oauth.loginOnly,
    },
    version,
  };
}
