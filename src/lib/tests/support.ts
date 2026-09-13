import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { TestContext } from 'node:test';
import type { Config } from '@/lib/config/validate';

export const config = {
  core: { secret: 'test-only-secret-with-no-production-value', returnHttpsUrls: true },
  files: {
    route: '/u',
    length: 12,
    defaultFormat: 'random',
    defaultDateFormat: 'YYYY-MM-DD',
    defaultCompressionFormat: 'jpg',
    defaultExpiration: null,
    maxExpiration: null,
    disabledTypes: [],
    disabledTypesDefault: null,
    assumeMimetypes: false,
    randomWordsNumAdjectives: 2,
    randomWordsSeparator: '-',
  },
  features: { oauthRegistration: true },
  oauth: { bypassLocalLogin: false, loginOnly: false },
  website: { title: 'Test instance' },
  datasource: { type: 'local' },
  discord: null,
  httpWebhook: { onUpload: null, onShorten: null },
  ratelimit: {},
} as unknown as Config;

globalThis.__config__ = config;

export async function temporaryDirectory(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'zipline-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
