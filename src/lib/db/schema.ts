import { createId } from '@paralleldrive/cuid2';
import type { Json } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  incompleteFileStatusValues,
  oauthProviderTypeValues,
  roleValues,
  userFilesQuotaValues,
} from './enums';

type ExternalLink = { name: string; url: string };
export type IncompleteFileMetadata = {
  file: { filename: string; type: string; id: string };
};

export const role = pgEnum('Role', roleValues);
export const oauthProviderType = pgEnum('OAuthProviderType', oauthProviderTypeValues);
export const userFilesQuota = pgEnum('UserFilesQuota', userFilesQuotaValues);
export const incompleteFileStatus = pgEnum('IncompleteFileStatus', incompleteFileStatusValues);

const id = () => text().notNull().$defaultFn(createId);
const createdAt = () => timestamp({ precision: 3, mode: 'date', withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp({ precision: 3, mode: 'date', withTimezone: true })
    .notNull()
    .$onUpdate(() => new Date());

export const zipline = pgTable(
  'Zipline',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),

    firstSetup: boolean().default(true).notNull(),

    coreReturnHttpsUrls: boolean().default(false).notNull(),
    coreDefaultDomain: text(),
    coreTempDirectory: text().notNull(),
    coreTrustProxy: boolean().default(false).notNull(),

    chunksEnabled: boolean().default(true).notNull(),
    chunksMax: text().default('95mb').notNull(),
    chunksSize: text().default('25mb').notNull(),

    tasksDeleteInterval: text().default('30m').notNull(),
    tasksClearInvitesInterval: text().default('30m').notNull(),
    tasksMaxViewsInterval: text().default('30m').notNull(),
    tasksThumbnailsInterval: text().default('30m').notNull(),
    tasksMetricsInterval: text().default('30m').notNull(),
    tasksCleanThumbnailsInterval: text().default('1d').notNull(),

    filesRoute: text().default('/u').notNull(),
    filesLength: integer().default(6).notNull(),
    filesDefaultFormat: text().default('random').notNull(),
    filesDisabledTypes: text().array().default([]).notNull(),
    filesDisabledTypesDefault: text(),
    filesDisabledExtensions: text().array().default([]).notNull(),
    filesMaxFileSize: text().default('100mb').notNull(),
    filesDefaultExpiration: text(),
    filesMaxExpiration: text(),
    filesAssumeMimetypes: boolean().default(false).notNull(),
    filesDefaultDateFormat: text().default('YYYY-MM-DD_HH:mm:ss').notNull(),
    filesRemoveGpsMetadata: boolean().default(false).notNull(),
    filesRandomWordsNumAdjectives: integer().default(2).notNull(),
    filesRandomWordsSeparator: text().default('-').notNull(),
    filesDefaultCompressionFormat: text().default('jpg'),
    filesMaxFilesPerUpload: integer().default(1000).notNull(),
    filesExtensionlessUrls: boolean().default(false).notNull(),

    urlsRoute: text().default('/go').notNull(),
    urlsLength: integer().default(6).notNull(),

    featuresImageCompression: boolean().default(true).notNull(),
    featuresRobotsTxt: boolean().default(true).notNull(),
    featuresHealthcheck: boolean().default(true).notNull(),
    featuresUserRegistration: boolean().default(false).notNull(),
    featuresOauthRegistration: boolean().default(false).notNull(),
    featuresDeleteOnMaxViews: boolean().default(true).notNull(),

    featuresThumbnailsEnabled: boolean().default(true).notNull(),
    featuresThumbnailsNumberThreads: integer().default(4).notNull(),
    featuresThumbnailsFormat: text().default('jpg').notNull(),
    featuresThumbnailsInstantaneous: boolean().default(false).notNull(),

    featuresMetricsEnabled: boolean().default(true).notNull(),
    featuresMetricsAdminOnly: boolean().default(false).notNull(),
    featuresMetricsShowUserSpecific: boolean().default(true).notNull(),

    featuresVersionChecking: boolean().default(true).notNull(),

    invitesEnabled: boolean().default(true).notNull(),
    invitesLength: integer().default(6).notNull(),

    websiteTitle: text().default('Zipline').notNull(),
    websiteTitleLogo: text(),
    websiteExternalLinks: jsonb()
      .$type<ExternalLink[]>()
      .default([
        { name: 'GitHub', url: 'https://github.com/diced/zipline' },
        { name: 'Documentation', url: 'https://zipline.diced.sh/' },
      ])
      .notNull(),
    websiteLoginBackground: text(),
    websiteLoginBackgroundBlur: boolean().default(true).notNull(),
    websiteDefaultAvatar: text(),
    websiteTos: text(),

    websiteThemeDefault: text().default('system').notNull(),
    websiteThemeDark: text().default('builtin:dark_gray').notNull(),
    websiteThemeLight: text().default('builtin:light_gray').notNull(),

    oauthBypassLocalLogin: boolean().default(false).notNull(),
    oauthLoginOnly: boolean().default(false).notNull(),

    oauthDiscordClientId: text(),
    oauthDiscordClientSecret: text(),
    oauthDiscordRedirectUri: text(),
    oauthDiscordAllowedIds: text().array().default([]).notNull(),
    oauthDiscordDeniedIds: text().array().default([]).notNull(),

    oauthGoogleClientId: text(),
    oauthGoogleClientSecret: text(),
    oauthGoogleRedirectUri: text(),

    oauthGithubClientId: text(),
    oauthGithubClientSecret: text(),
    oauthGithubRedirectUri: text(),

    oauthOidcClientId: text(),
    oauthOidcClientSecret: text(),
    oauthOidcAuthorizeUrl: text(),
    oauthOidcTokenUrl: text(),
    oauthOidcUserinfoUrl: text(),
    oauthOidcRedirectUri: text(),

    mfaTotpEnabled: boolean().default(false).notNull(),
    mfaTotpIssuer: text().default('Zipline').notNull(),

    mfaPasskeysEnabled: boolean().default(false).notNull(),
    mfaPasskeysRpID: text(),
    mfaPasskeysOrigin: text(),

    ratelimitEnabled: boolean().default(true).notNull(),
    ratelimitMax: integer().default(10).notNull(),
    ratelimitWindow: integer(),
    ratelimitAdminBypass: boolean().default(true).notNull(),
    ratelimitAllowList: text().array().default([]).notNull(),

    httpWebhookOnUpload: text(),
    httpWebhookOnShorten: text(),

    discordWebhookUrl: text(),
    discordUsername: text(),
    discordAvatarUrl: text(),

    discordOnUploadWebhookUrl: text(),
    discordOnUploadUsername: text(),
    discordOnUploadAvatarUrl: text(),
    discordOnUploadContent: text(),
    discordOnUploadEmbed: jsonb().$type<Json>(),

    discordOnShortenWebhookUrl: text(),
    discordOnShortenUsername: text(),
    discordOnShortenAvatarUrl: text(),
    discordOnShortenContent: text(),
    discordOnShortenEmbed: jsonb().$type<Json>(),

    pwaEnabled: boolean().default(false).notNull(),
    pwaTitle: text().default('Zipline').notNull(),
    pwaShortName: text().default('Zipline').notNull(),
    pwaDescription: text().default('Zipline').notNull(),
    pwaThemeColor: text().default('#000000').notNull(),
    pwaBackgroundColor: text().default('#000000').notNull(),

    domains: text().array().default([]).notNull(),
  },
  (table) => [primaryKey({ name: 'zipline_pkey', columns: [table.id] })],
);

export const users = pgTable(
  'User',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    username: text().notNull(),
    password: text(),
    avatar: text(),
    token: text().notNull(),
    role: role().default('USER').notNull(),
    view: jsonb().$type<Record<string, Json | undefined>>().default({}).notNull(),
    totpSecret: text(),
  },
  (table) => [
    primaryKey({ name: 'user_pkey', columns: [table.id] }),
    uniqueIndex('user_username_key').on(table.username),
    uniqueIndex('user_token_key').on(table.token),
  ],
);

export const folders = pgTable(
  'Folder',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    name: text().notNull(),
    public: boolean().default(false).notNull(),
    allowUploads: boolean().default(false).notNull(),
    parentId: text().references((): AnyPgColumn => folders.id, {
      name: 'folder_parent_id_fkey',
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    userId: text()
      .notNull()
      .references(() => users.id, {
        name: 'folder_user_id_fkey',
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [
    primaryKey({ name: 'folder_pkey', columns: [table.id] }),
    index('folder_user_id_created_at_idx').on(table.userId, table.createdAt),
    index('folder_parent_id_created_at_idx').on(table.parentId, table.createdAt),
  ],
);

export const files = pgTable(
  'File',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletesAt: timestamp({ precision: 3, mode: 'date', withTimezone: true }),
    name: text().notNull(),
    originalName: text(),
    size: bigint({ mode: 'number' }).notNull(),
    type: text().notNull(),
    views: integer().default(0).notNull(),
    maxViews: integer(),
    favorite: boolean().default(false).notNull(),
    password: text(),
    anonymous: boolean().default(false).notNull(),
    userId: text().references(() => users.id, {
      name: 'file_user_id_fkey',
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    folderId: text().references(() => folders.id, {
      name: 'file_folder_id_fkey',
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
  },
  (table) => [
    primaryKey({ name: 'file_pkey', columns: [table.id] }),
    index('file_name_idx').on(table.name),
    index('file_user_id_size_idx').on(table.userId, table.size),
    index('file_user_id_created_at_idx').on(table.userId, table.createdAt),
    index('file_folder_id_created_at_idx').on(table.folderId, table.createdAt),
  ],
);

export const exports = pgTable(
  'Export',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completed: boolean().default(false).notNull(),
    path: text().notNull(),
    files: integer().notNull(),
    size: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, {
        name: 'export_user_id_fkey',
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [primaryKey({ name: 'export_pkey', columns: [table.id] })],
);

export const userSessions = pgTable(
  'UserSession',
  {
    id: text().notNull(),
    createdAt: createdAt(),
    ua: text().notNull(),
    client: text().notNull(),
    device: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, {
        name: 'user_session_user_id_fkey',
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [
    primaryKey({ name: 'user_session_pkey', columns: [table.id] }),
    index('user_session_user_id_created_at_idx').on(table.userId, table.createdAt),
  ],
);

export const userQuotas = pgTable(
  'UserQuota',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    filesQuota: userFilesQuota().notNull(),
    maxBytes: text(),
    maxFiles: integer(),
    maxUrls: integer(),
    userId: text().references(() => users.id, {
      name: 'user_quota_user_id_fkey',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  },
  (table) => [
    primaryKey({ name: 'user_quota_pkey', columns: [table.id] }),
    uniqueIndex('user_quota_user_id_key').on(table.userId),
  ],
);

export const userPasskeys = pgTable(
  'UserPasskey',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lastUsed: timestamp({ precision: 3, mode: 'date', withTimezone: true }),
    name: text().notNull(),
    reg: jsonb().$type<Record<string, Json | undefined>>().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, {
        name: 'user_passkey_user_id_fkey',
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [
    primaryKey({ name: 'user_passkey_pkey', columns: [table.id] }),
    index('user_passkey_user_id_last_used_idx').on(table.userId, table.lastUsed.desc().nullsFirst()),
  ],
);

export const oauthProviders = pgTable(
  'OAuthProvider',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    userId: text()
      .notNull()
      .references(() => users.id, {
        name: 'oauth_provider_user_id_fkey',
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    provider: oauthProviderType().notNull(),
    username: text().notNull(),
    accessToken: text().notNull(),
    refreshToken: text(),
    oauthId: text(),
  },
  (table) => [
    primaryKey({ name: 'oauth_provider_pkey', columns: [table.id] }),
    uniqueIndex('oauth_provider_provider_oauth_id_key').on(table.provider, table.oauthId),
    index('oauth_provider_user_id_provider_idx').on(table.userId, table.provider),
  ],
);

export const thumbnails = pgTable(
  'Thumbnail',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    path: text().notNull(),
    fileId: text()
      .notNull()
      .references(() => files.id, {
        name: 'thumbnail_file_id_fkey',
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [
    primaryKey({ name: 'thumbnail_pkey', columns: [table.id] }),
    uniqueIndex('thumbnail_file_id_key').on(table.fileId),
    index('thumbnail_path_idx').on(table.path),
  ],
);

export const incompleteFiles = pgTable(
  'IncompleteFile',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    status: incompleteFileStatus().notNull(),
    chunksTotal: integer().notNull(),
    chunksComplete: integer().notNull(),
    metadata: jsonb().$type<IncompleteFileMetadata>().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, {
        name: 'incomplete_file_user_id_fkey',
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [
    primaryKey({ name: 'incomplete_file_pkey', columns: [table.id] }),
    index('incomplete_file_user_id_status_idx').on(table.userId, table.status),
  ],
);

export const tags = pgTable(
  'Tag',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    name: text().notNull(),
    color: text().notNull(),
    userId: text().references(() => users.id, {
      name: 'tag_user_id_fkey',
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
  },
  (table) => [
    primaryKey({ name: 'tag_pkey', columns: [table.id] }),
    uniqueIndex('tag_name_key').on(table.name),
  ],
);

export const urls = pgTable(
  'Url',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    code: text().notNull(),
    vanity: text(),
    destination: text().notNull(),
    views: integer().default(0).notNull(),
    maxViews: integer(),
    password: text(),
    enabled: boolean().default(true).notNull(),
    userId: text().references(() => users.id, {
      name: 'url_user_id_fkey',
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
  },
  (table) => [
    primaryKey({ name: 'url_pkey', columns: [table.id] }),
    uniqueIndex('url_code_vanity_key').on(table.code, table.vanity),
    index('url_user_id_idx').on(table.userId),
  ],
);

export const metrics = pgTable(
  'Metric',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    data: jsonb().$type<Record<string, Json | undefined>>().notNull(),
  },
  (table) => [
    primaryKey({ name: 'metric_pkey', columns: [table.id] }),
    index('metric_created_at_idx').on(table.createdAt),
  ],
);

export const invites = pgTable(
  'Invite',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    expiresAt: timestamp({ precision: 3, mode: 'date', withTimezone: true }),
    code: text().notNull(),
    uses: integer().default(0).notNull(),
    maxUses: integer(),
    inviterId: text()
      .notNull()
      .references(() => users.id, {
        name: 'invite_inviter_id_fkey',
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [
    primaryKey({ name: 'invite_pkey', columns: [table.id] }),
    uniqueIndex('invite_code_key').on(table.code),
  ],
);

export const filesToTags = pgTable(
  '_FileToTag',
  {
    fileId: text('A')
      .notNull()
      .references(() => files.id, {
        name: 'file_to_tag_file_id_fkey',
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    tagId: text('B')
      .notNull()
      .references(() => tags.id, {
        name: 'file_to_tag_tag_id_fkey',
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [
    primaryKey({ name: 'file_to_tag_pkey', columns: [table.fileId, table.tagId] }),
    index('file_to_tag_tag_id_idx').on(table.tagId),
  ],
);

export type Zipline = typeof zipline.$inferSelect;
export type Thumbnail = typeof thumbnails.$inferSelect;
