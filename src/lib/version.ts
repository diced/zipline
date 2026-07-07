import packageJson from '../../package.json' with { type: 'json' };
import { execSync } from 'child_process';
import { log } from './logger';

const logger = log('version');

export const version = packageJson.version;

export function gitSha() {
  const envValue = process.env.ZIPLINE_GIT_SHA;
  if (envValue && envValue !== 'unknown') return envValue;

  try {
    const commitHash = execSync('git rev-parse HEAD').toString().trim();
    return commitHash;
  } catch (error) {
    if (!(error instanceof Error)) return null;

    logger.warn('failed to get commit hash: ' + error.message);
    logger.debug('failed to get commit hash', { error: JSON.stringify(error) });
    return null;
  }
}

export function getVersion(): {
  version: string;
  sha: string | null;
} {
  const sha = gitSha();

  return {
    version,
    sha,
  };
}
