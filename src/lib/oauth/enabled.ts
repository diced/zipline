import { Config } from '../config/validate';
import { isTruthy } from '../primitive';

export default function enabled(config: Config) {
  const discordEnabled = isTruthy(
    config.oauth?.discord?.clientId,
    config.oauth?.discord?.clientSecret,
    config.features.oauthRegistration,
  );

  const githubEnabled = isTruthy(
    config.oauth?.github?.clientId,
    config.oauth?.github?.clientSecret,
    config.features.oauthRegistration,
  );

  const googleEnabled = isTruthy(
    config.oauth?.google?.clientId,
    config.oauth?.google?.clientSecret,
    config.features.oauthRegistration,
  );

  const authentikEnabled = isTruthy(
    config.oauth?.authentik?.clientId,
    config.oauth?.authentik?.clientSecret,
    config.oauth?.authentik?.authorizeUrl,
    config.oauth?.authentik?.tokenUrl,
    config.oauth?.authentik?.userinfoUrl,
    config.features.oauthRegistration,
  );

  return {
    discord: discordEnabled,
    github: githubEnabled,
    google: googleEnabled,
    authentik: authentikEnabled,
  };
}
