import type { VersionDetails, VersionInfo } from '.';
import { ApiError } from '../api/errors';
import { log } from '../logger';

const GITHUB_API = 'https://api.github.com/repos/diced/zipline';
const GITHUB_URL = 'https://github.com/diced/zipline';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// minimal github api types
type GitHubRepoRelease = {
  tag_name: string;
};

type GithubRepoTags = {
  name: string;
  commit: {
    sha: string;
  };
}[];

type GithubRepoCommits = {
  sha: string;
}[];

type GithubRepoCheckRuns = {
  check_runs: {
    name: string;
    status: string;
    conclusion: string | null;
  }[];
};

let cachedData: VersionInfo | null = null;
let cachedAt = 0;
let cachedFor = '';
let pending: Promise<VersionInfo> | null = null;

function shaMatch(first: string, second: string) {
  if (first.length < 7 || second.length < 7) return false;

  const firstLower = first.toLowerCase();
  const secondLower = second.toLowerCase();
  return (
    firstLower === secondLower || firstLower.startsWith(secondLower) || secondLower.startsWith(firstLower)
  );
}

async function githubFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'zipline',
      ...(process.env.ZIPLINE_GITHUB_TOKEN
        ? { Authorization: `token ${process.env.ZIPLINE_GITHUB_TOKEN}` }
        : {}),
    },
  });

  if (!response.ok) throw new ApiError(6001, `Failed to get github ${path}: ${response.status}`);

  return response.json() as Promise<T>;
}

async function fetchVersionInfo(details: VersionDetails): Promise<VersionInfo> {
  const [latestRelease, tags] = await Promise.all([
    githubFetch<GitHubRepoRelease>('/releases/latest'),
    githubFetch<GithubRepoTags>('/tags?per_page=100'),
  ]);

  const expectedTag = details.version.startsWith('v') ? details.version : `v${details.version}`;
  const versionTag = tags.find((tag) => tag.name === expectedTag);
  const releaseTag = details.sha ? tags.find((tag) => shaMatch(tag.commit.sha, details.sha!)) : versionTag;
  const latest = {
    tag: latestRelease.tag_name,
    url: `${GITHUB_URL}/releases/${latestRelease.tag_name}`,
  };

  if (releaseTag) {
    return {
      isUpstream: false,
      isRelease: true,
      isLatest: latest.tag === releaseTag.name,
      version: {
        tag: releaseTag.name,
        sha: releaseTag.commit.sha,
        url: `${GITHUB_URL}/releases/${releaseTag.name}`,
      },
      latest,
    };
  }

  if (!details.sha) throw new ApiError(6001, 'Could not determine sha for version');

  const commits = await githubFetch<GithubRepoCommits>('/commits?per_page=1');
  const latestCommit = commits[0];
  if (!latestCommit) throw new ApiError(6001, 'Github returned no commits');

  const runs = await githubFetch<GithubRepoCheckRuns>(`/commits/${latestCommit.sha}/check-runs`);
  const build = runs.check_runs.find((run) => run.name === 'amend-builds');

  return {
    isUpstream: true,
    isRelease: false,
    isLatest: shaMatch(latestCommit.sha, details.sha),
    version: {
      tag: versionTag?.name ?? expectedTag,
      sha: details.sha,
      url: `${GITHUB_URL}/commit/${details.sha}`,
    },
    latest: {
      ...latest,
      commit: {
        sha: latestCommit.sha,
        url: `${GITHUB_URL}/commit/${latestCommit.sha}`,
        pull: build?.status === 'completed' && build.conclusion === 'success',
      },
    },
  };
}

const logger = log('version').c('github');

export async function checkForUpdates(
  details: VersionDetails,
): Promise<{ data: VersionInfo; cached: boolean }> {
  const cacheKey = `${details.version},${details.sha ?? 'unknown'}`;
  if (cachedData && cachedFor === cacheKey && Date.now() - cachedAt < CACHE_TTL) {
    return { data: cachedData, cached: true };
  }

  if (pending) return { data: await pending, cached: true };

  pending = fetchVersionInfo(details);
  try {
    const data = await pending;
    cachedData = data;
    cachedAt = Date.now();
    cachedFor = cacheKey;

    logger.debug('fetched version info', { data, cachedFor, cachedAt });

    return { data, cached: false };
  } finally {
    pending = null;
  }
}
