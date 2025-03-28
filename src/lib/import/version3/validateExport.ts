import { z } from 'zod';

export type Zipline3Export = {
  versions: {
    zipline: string;
    node: string;
    export: '3';
  };

  request: {
    user: string;
    date: string;
    os: {
      platform: 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32';
      arch:
        | 'arm'
        | 'arm64'
        | 'ia32'
        | 'loong64'
        | 'mips'
        | 'mipsel'
        | 'ppc'
        | 'ppc64'
        | 'riscv64'
        | 's390'
        | 's390x'
        | 'x64';
      cpus: number;
      hostname: string;
      release: string;
    };
    env: NodeJS.ProcessEnv;
  };

  // Creates a unique identifier for each model
  // used to map the user's stuff to other data owned by the user
  user_map: Record<number, string>;
  thumbnail_map: Record<number, string>;
  folder_map: Record<number, string>;
  file_map: Record<number, string>;
  url_map: Record<number, string>;
  invite_map: Record<number, string>;

  users: {
    [id: string]: {
      username: string;
      password: string;
      avatar: string;
      administrator: boolean;
      super_administrator: boolean;
      embed: {
        title?: string;
        site_name?: string;
        description?: string;
        color?: string;
      };
      totp_secret: string;
      oauth: {
        provider: 'DISCORD' | 'GITHUB' | 'GOOGLE';
        username: string;
        oauth_id: string;
        access_token: string;
        refresh_token: string;
      }[];
    };
  };

  files: {
    [id: string]: {
      name: string;
      original_name: string;
      type: `${string}/${string}`;
      size: number | bigint;
      user: string | null;
      thumbnail?: string;
      max_views: number;
      views: number;
      expires_at?: string;
      created_at: string;
      favorite: boolean;
      password?: string;
    };
  };

  thumbnails: {
    [id: string]: {
      name: string;
      created_at: string;
    };
  };

  folders: {
    [id: string]: {
      name: string;
      public: boolean;
      created_at: string;
      user: string;
      files: string[];
    };
  };

  urls: {
    [id: number]: {
      destination: string;
      vanity?: string;
      code: string;
      created_at: string;
      max_views: number;
      views: number;
      user: string;
    };
  };

  invites: {
    [id: string]: {
      code: string;
      expites_at?: string;
      created_at: string;
      used: boolean;

      created_by_user: string;
    };
  };

  stats: {
    created_at: string;

    data: any;
  }[];
};

export const export3Schema = z.object({
  versions: z.object({
    zipline: z.string(),
    node: z.string(),
    export: z.literal('3'),
  }),

  request: z.object({
    user: z.string(),
    date: z.string(),
    os: z.object({
      platform: z.union([
        z.literal('aix'),
        z.literal('darwin'),
        z.literal('freebsd'),
        z.literal('linux'),
        z.literal('openbsd'),
        z.literal('sunos'),
        z.literal('win32'),
      ]),
      arch: z.union([
        z.literal('arm'),
        z.literal('arm64'),
        z.literal('ia32'),
        z.literal('loong64'),
        z.literal('mips'),
        z.literal('mipsel'),
        z.literal('ppc'),
        z.literal('ppc64'),
        z.literal('riscv64'),
        z.literal('s390'),
        z.literal('s390x'),
        z.literal('x64'),
      ]),
      cpus: z.number(),
      hostname: z.string(),
      release: z.string(),
    }),
    env: z.record(z.string()),
  }),

  user_map: z.record(z.string()),
  thumbnail_map: z.record(z.string()),
  folder_map: z.record(z.string()),
  file_map: z.record(z.string()),
  url_map: z.record(z.string()),
  invite_map: z.record(z.string()),

  users: z.record(
    z.object({
      username: z.string(),
      password: z.string().optional().nullable(),
      avatar: z.string().optional().nullable(),
      administrator: z.boolean(),
      super_administrator: z.boolean(),
      embed: z.object({
        title: z.string().optional().nullable(),
        site_name: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        color: z.string().optional().nullable(),
      }),
      totp_secret: z.string().optional().nullable(),
      oauth: z.array(
        z.object({
          provider: z.union([z.literal('DISCORD'), z.literal('GITHUB'), z.literal('GOOGLE')]),
          username: z.string(),
          oauth_id: z.string().nullable(),
          access_token: z.string().nullable(),
          refresh_token: z.string().nullable(),
        }),
      ),
    }),
  ),

  files: z.record(
    z.object({
      name: z.string(),
      original_name: z.string().optional().nullable(),
      type: z.string(),
      size: z.union([z.number(), z.bigint()]),
      user: z.string().optional().nullable(),
      thumbnail: z.string().optional().nullable(),
      max_views: z.number().optional().nullable(),
      views: z.number(),
      expires_at: z.string().optional().nullable(),
      created_at: z.string(),
      favorite: z.boolean(),
      password: z.string().optional().nullable(),
    }),
  ),

  thumbnails: z.record(
    z.object({
      name: z.string(),
      created_at: z.string(),
    }),
  ),

  folders: z.record(
    z.object({
      name: z.string(),
      public: z.boolean(),
      created_at: z.string(),
      user: z.string().optional().nullable(),
      files: z.array(z.string()),
    }),
  ),

  urls: z.record(
    z.object({
      destination: z.string(),
      vanity: z.string().optional().nullable(),
      code: z.string(),
      created_at: z.string(),
      max_views: z.number().optional().nullable(),
      views: z.number(),
      user: z.string().optional().nullable(),
    }),
  ),

  invites: z.record(
    z.object({
      code: z.string(),
      expires_at: z.string().optional().nullable(),
      created_at: z.string(),
      used: z.boolean(),
      created_by_user: z.string().optional().nullable(),
    }),
  ),

  stats: z
    .array(
      z.object({
        created_at: z.string(),
        data: z.any(),
      }),
    )
    .optional(),
});

export type Export3 = z.infer<typeof export3Schema>;

export const V3_COMPATIBLE_SETTINGS: Record<string, string> = {
  CORE_RETURN_HTTPS: 'coreReturnHttpsUrls',
  CORE_TEMP_DIRECTORY: 'coreTempDirectory',

  CHUNKS_MAX_SIZE: 'chunksMax',
  CHUNKS_CHUNKS_SIZE: 'chunksSize',
  CHUNKS_ENABLED: 'chunksEnabled',

  UPLOADER_ROUTE: 'filesRoute',
  UPLOADER_LENGTH: 'filesLength',
  UPLOADER_DISABLED_EXTENSIONS: 'filesDisabledExtensions',
  UPLOADER_DEFAULT_EXPIRATION: 'filesDefaultExpiration',
  UPLOADER_ASSUME_MIMETYPES: 'filesAssumeMimetypes',
  EXIF_REMOVE_GPS: 'filesRemoveGpsMetadata',

  URLS_ROUTE: 'urlsRoute',
  URLS_LENGTH: 'urlsLength',

  WEBSITE_TITLE: 'websiteTitle',
  WEBSITE_EXTERNAL_LINKS: 'websiteExternalLinks',
  FEATURES_DEFAULT_AVATAR: 'websiteDefaultAvatar',

  OAUTH_BYPASS_LOCAL_LOGIN: 'oauthBypassLocalLogin',
  FEATURES_OAUTH_LOGIN_ONLY: 'oauthLoginOnly',

  OAUTH_GITHUB_CLIENT_ID: 'oauthGithubClientId',
  OAUTH_GITHUB_CLIENT_SECRET: 'oauthGithubClientSecret',

  OAUTH_DISCORD_CLIENT_ID: 'oauthDiscordClientId',
  OAUTH_DISCORD_CLIENT_SECRET: 'oauthDiscordClientSecret',
  OAUTH_DISCORD_REDIRECT_URI: 'oauthDiscordRedirectUri',

  OAUTH_GOOGLE_CLIENT_ID: 'oauthGoogleClientId',
  OAUTH_GOOGLE_CLIENT_SECRET: 'oauthGoogleClientSecret',
  OAUTH_GOOGLE_REDIRECT_URI: 'oauthGoogleRedirectUri',

  FEATURES_OAUTH_REGISTRATION: 'featuresOauthRegistration',
  FEATURES_USER_REGISTRATION: 'featuresUserRegistration',
  FEATURES_ROBOTS_TXT: 'featuresRobotsTxt',

  FEATURES_INVITES: 'invitesEnabled',
  FEATURES_INVITES_LENGTH: 'invitesLength',

  FEATURES_THUMBNAILS: 'featuresThumbnailsEnabled',

  MFA_TOTP_ISSUER: 'mfaTotpIssuer',
  MFA_TOTP_ENABLED: 'mfaTotpEnabled',

  CORE_STATS_INTERVAL: 'tasksMetricsInterval',
  CORE_INVITES_INTERVAL: 'tasksClearInvitesInterval',
  CORE_THUMBNAILS_INTERVAL: 'tasksThumbnailsInterval',

  DISCORD_URL: 'discordWebhookUrl',
  DISCORD_USERNAME: 'discordUsername',
  DISCORD_AVATAR_URL: 'discordAvatarUrl',

  DISCORD_UPLOAD_URL: 'discordOnUploadWebhookUrl',
  DISCORD_UPLOAD_USERNAME: 'discordOnUploadUsername',
  DISCORD_UPLOAD_AVATAR_URL: 'discordOnUploadAvatarUrl',

  DISCORD_SHORTEN_URL: 'discordShortenUrl',
  DISCORD_SHORTEN_USERNAME: 'discordShortenUsername',
  DISCORD_SHORTEN_AVATAR_URL: 'discordShortenAvatarUrl',
};

const booleanTransform = (value: string) => (value === 'true' ? true : false);
const numberTransform = (value: string) => (isNaN(Number(value)) ? undefined : Number(value));
const arrayTransform = (value: string) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v !== '');

export const V3_SETTINGS_TRANSFORM: Record<keyof typeof V3_COMPATIBLE_SETTINGS, (value: string) => unknown> =
  {
    CORE_RETURN_HTTPS: booleanTransform,

    CHUNKS_ENABLED: booleanTransform,
    CHUNKS_CHUNKS_SIZE: numberTransform,
    CHUNKS_MAX_SIZE: numberTransform,

    UPLOADER_LENGTH: numberTransform,
    UPLOADER_ASSUME_MIMETYPES: booleanTransform,
    UPLOADER_DISABLED_EXTENSIONS: arrayTransform,
    EXIF_REMOVE_GPS: booleanTransform,

    URLS_LENGTH: numberTransform,

    WEBSITE_EXTERNAL_LINKS: (value) => {
      try {
        return JSON.parse(value, function (key, val) {
          if (key === 'label') {
            this.name = val;
            return;
          }

          if (key === 'link') {
            this.url = val;
            return;
          }

          return val;
        });
      } catch {
        return [];
      }
    },

    OAUTH_BYPASS_LOCAL_LOGIN: booleanTransform,
    FEATURES_OAUTH_LOGIN_ONLY: booleanTransform,

    FEATURES_OAUTH_REGISTRATION: booleanTransform,
    FEATURES_USER_REGISTRATION: booleanTransform,
    FEATURES_ROBOTS_TXT: booleanTransform,

    FEATURES_INVITES: booleanTransform,
    FEATURES_INVITES_LENGTH: numberTransform,

    FEATURES_THUMBNAILS: booleanTransform,

    MFA_TOTP_ENABLED: booleanTransform,

    CORE_STATS_INTERVAL: numberTransform,
    CORE_INVITES_INTERVAL: numberTransform,
    CORE_THUMBNAILS_INTERVAL: numberTransform,
  };

export function validateExport(data: unknown): ReturnType<typeof export3Schema.safeParse> {
  const result = export3Schema.safeParse(data);
  if (!result.success) {
    if (typeof window === 'object') console.error('Failed to validate export data', result.error);
  }

  return result;
}
