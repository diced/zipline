import { version } from '../../package.json';
import { execSync } from 'child_process';

export function gitSha() {
  const envValue = process.env.ZIPLINE_GIT_SHA;
  if (envValue && envValue !== 'unknown') return envValue;

  try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    return commitHash;
  } catch (error) {
    console.error('Error getting git commit hash:', error);
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
