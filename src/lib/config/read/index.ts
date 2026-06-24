import { log } from '@/lib/logger';
import { DATABASE_TO_PROP, DatabaseToPropKey, readDatabaseSettings } from './db';
import { readEnv } from './env';
import { setProperty } from './transform';

export type ParsedConfig = ReturnType<typeof read>;

export const rawConfig: any = {
  core: {
    port: undefined,
    hostname: undefined,
    secret: undefined,
    databaseUrl: undefined,
    returnHttpsUrls: undefined,
    tempDirectory: undefined,
    trustProxy: undefined,
    database: {
      username: undefined,
      password: undefined,
      host: undefined,
      port: undefined,
      name: undefined,
    },
  },
  chunks: {
    max: undefined,
    size: undefined,
    enabled: undefined,
  },
  tasks: {
    deleteInterval: undefined,
    clearInvitesInterval: undefined,
    maxViewsInterval: undefined,
    thumbnailsInterval: undefined,
    metricsInterval: undefined,
    cleanThumbnailsInterval: undefined,
  },
  files: {
    route: undefined,
    length: undefined,
    defaultFormat: undefined,
    disabledExtensions: undefined,
    maxFileSize: undefined,
    defaultExpiration: undefined,
    assumeMimetypes: undefined,
    defaultDateFormat: undefined,
    removeGpsMetadata: undefined,
    randomWordsNumAdjectives: undefined,
    randomWordsSeparator: undefined,
    defaultCompressionFormat: undefined,
    maxFilesPerUpload: undefined,
    extensionlessUrls: undefined,
  },
  urls: {
    route: undefined,
    length: undefined,
  },
  datasource: {
    type: undefined,
  },
  features: {
    imageCompression: undefined,
    robotsTxt: undefined,
    healthcheck: undefined,
    invites: undefined,
    userRegistration: undefined,
    oauthRegistration: undefined,
    deleteOnMaxViews: undefined,
    thumbnails: {
      enabled: undefined,
      num_threads: undefined,
      format: undefined,
    },
    metrics: {
      enabled: undefined,
      adminOnly: undefined,
      showUserSpecific: undefined,
    },
  },
  invites: {
    enabled: undefined,
    length: undefined,
  },
  website: {
    title: undefined,
    titleLogo: undefined,
    externalLinks: undefined,
    loginBackground: undefined,
    defaultAvatar: undefined,
    tos: undefined,
    theme: {
      default: undefined,
      dark: undefined,
      light: undefined,
    },
  },
  mfa: {
    totp: {
      enabled: undefined,
      issuer: undefined,
    },
    passkeys: {
      enabled: undefined,
      rpID: undefined,
      origin: undefined,
    },
  },
  oauth: {
    bypassLocalLogin: undefined,
    loginOnly: undefined,
    discord: {
      clientId: undefined,
      clientSecret: undefined,
    },
    github: {
      clientId: undefined,
      clientSecret: undefined,
    },
    google: {
      clientId: undefined,
      clientSecret: undefined,
    },
    oidc: {
      clientId: undefined,
      clientSecret: undefined,
      authorizeUrl: undefined,
      userinfoUrl: undefined,
      tokenUrl: undefined,
    },
  },
  discord: null,
  ratelimit: {
    enabled: undefined,
    max: undefined,
    window: undefined,
    adminBypass: undefined,
    allowList: undefined,
  },
  httpWebhook: {
    onUpload: undefined,
    onShorten: undefined,
  },
  pwa: {
    enabled: undefined,
    title: undefined,
    shortName: undefined,
    description: undefined,
    backgroundColor: undefined,
    themeColor: undefined,
  },
};

const logger = log('config').c('read');

export async function read() {
  const database = (await readDatabaseSettings()) as Record<string, any>;
  const { dbEnv, env } = readEnv();

  if (global.__tamperedConfig__) {
    global.__tamperedConfig__ = [];
  }

  // this overwrites database settings with provided env vars if they exist
  for (const [propPath, val] of Object.entries(dbEnv)) {
    const col = Object.entries(DATABASE_TO_PROP).find(([_colName, path]) => path === propPath)?.[0];
    if (col) {
      database[col] = val;
      if (!global.__tamperedConfig__) {
        global.__tamperedConfig__ = [];
      }

      global.__tamperedConfig__.push(col);
    }
  }

  logger.debug('overridden db settings from env vars', { overridden: global.__tamperedConfig__ });

  const raw = structuredClone(rawConfig);

  for (const [key, value] of Object.entries(database)) {
    if (value === undefined) {
      logger.warn('Missing database value', { key });
      continue;
    }

    if (!DATABASE_TO_PROP[key as DatabaseToPropKey]) continue;
    if (value == undefined) continue;

    setProperty(raw, DATABASE_TO_PROP[key as DatabaseToPropKey], value);
  }

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      logger.warn('Missing env value', { key });
      continue;
    }

    setProperty(raw, key, value);
  }

  return raw;
}
