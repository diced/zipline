import packageJson from '../../../package.json' with { type: 'json' };
import { execSync } from 'child_process';
import { log } from '../logger';
import z from 'zod';

const logger = log('version');

export const version = packageJson.version;

export function gitSha() {
  const envValue = process.env.ZIPLINE_GIT_SHA;
  if (envValue && envValue !== 'unknown') return envValue;

  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    if (!(error instanceof Error)) return null;

    logger.warn('failed to get commit hash: ' + error.message);
    logger.debug('failed to get commit hash', { error: JSON.stringify(error) });
    return null;
  }
}

export function getVersion() {
  return {
    version,
    sha: gitSha(),
  };
}

export const versionInfoSchema = z.object({
  isUpstream: z.boolean(),
  isRelease: z.boolean(),
  isLatest: z.boolean(),
  version: z.object({
    tag: z.string(),
    sha: z.string(),
    url: z.string(),
  }),
  latest: z.object({
    tag: z.string(),
    url: z.string(),
    commit: z
      .object({
        sha: z.string(),
        url: z.string(),
        pull: z.boolean(),
      })
      .optional(),
  }),
});

export type VersionInfo = z.infer<typeof versionInfoSchema>;
export type VersionDetails = {
  version: string;
  sha: string | null;
};

export { checkForUpdates } from './github';
