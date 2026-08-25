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

const id = () => text('id').notNull().$defaultFn(createId);
const createdAt = () =>
  timestamp('createdAt', { precision: 3, mode: 'date', withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp('updatedAt', { precision: 3, mode: 'date', withTimezone: true })
    .notNull()
    .$onUpdate(() => new Date());

export const zipline = pgTable(
  'Zipline',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),

    firstSetup: boolean('firstSetup').default(true).notNull(),

    coreReturnHttpsUrls: boolean('coreReturnHttpsUrls').default(false).notNull(),
    coreDefaultDomain: text('coreDefaultDomain'),
    coreTempDirectory: text('coreTempDirectory').notNull(),
    coreTrustProxy: boolean('coreTrustProxy').default(false).notNull(),

    chunksEnabled: boolean('chunksEnabled').default(true).notNull(),
    chunksMax: text('chunksMax').default('95mb').notNull(),
    chunksSize: text('chunksSize').default('25mb').notNull(),

    tasksDeleteInterval: text('tasksDeleteInterval').default('30m').notNull(),
    tasksClearInvitesInterval: text('tasksClearInvitesInterval').default('30m').notNull(),
    tasksMaxViewsInterval: text('tasksMaxViewsInterval').default('30m').notNull(),
    tasksThumbnailsInterval: text('tasksThumbnailsInterval').default('30m').notNull(),
    tasksMetricsInterval: text('tasksMetricsInterval').default('30m').notNull(),
    tasksCleanThumbnailsInterval: text('tasksCleanThumbnailsInterval').default('1d').notNull(),

    filesRoute: text('filesRoute').default('/u').notNull(),
    filesLength: integer('filesLength').default(6).notNull(),
    filesDefaultFormat: text('filesDefaultFormat').default('random').notNull(),
    filesDisabledTypes: text('filesDisabledTypes').array().default([]).notNull(),
    filesDisabledTypesDefault: text('filesDisabledTypesDefault'),
    filesDisabledExtensions: text('filesDisabledExtensions').array().default([]).notNull(),
    filesMaxFileSize: text('filesMaxFileSize').default('100mb').notNull(),
    filesDefaultExpiration: text('filesDefaultExpiration'),
    filesMaxExpiration: text('filesMaxExpiration'),
    filesAssumeMimetypes: boolean('filesAssumeMimetypes').default(false).notNull(),
    filesDefaultDateFormat: text('filesDefaultDateFormat').default('YYYY-MM-DD_HH:mm:ss').notNull(),
    filesRemoveGpsMetadata: boolean('filesRemoveGpsMetadata').default(false).notNull(),
    filesRandomWordsNumAdjectives: integer('filesRandomWordsNumAdjectives').default(2).notNull(),
    filesRandomWordsSeparator: text('filesRandomWordsSeparator').default('-').notNull(),
    filesDefaultCompressionFormat: text('filesDefaultCompressionFormat').default('jpg'),
    filesMaxFilesPerUpload: integer('filesMaxFilesPerUpload').default(1000).notNull(),
    filesExtensionlessUrls: boolean('filesExtensionlessUrls').default(false).notNull(),

    urlsRoute: text('urlsRoute').default('/go').notNull(),
    urlsLength: integer('urlsLength').default(6).notNull(),

    featuresImageCompression: boolean('featuresImageCompression').default(true).notNull(),
    featuresRobotsTxt: boolean('featuresRobotsTxt').default(true).notNull(),
    featuresHealthcheck: boolean('featuresHealthcheck').default(true).notNull(),
    featuresUserRegistration: boolean('featuresUserRegistration').default(false).notNull(),
    featuresOauthRegistration: boolean('featuresOauthRegistration').default(false).notNull(),
    featuresDeleteOnMaxViews: boolean('featuresDeleteOnMaxViews').default(true).notNull(),

    featuresThumbnailsEnabled: boolean('featuresThumbnailsEnabled').default(true).notNull(),
    featuresThumbnailsNumberThreads: integer('featuresThumbnailsNumberThreads').default(4).notNull(),
    featuresThumbnailsFormat: text('featuresThumbnailsFormat').default('jpg').notNull(),
    featuresThumbnailsInstantaneous: boolean('featuresThumbnailsInstantaneous').default(false).notNull(),

    featuresMetricsEnabled: boolean('featuresMetricsEnabled').default(true).notNull(),
    featuresMetricsAdminOnly: boolean('featuresMetricsAdminOnly').default(false).notNull(),
    featuresMetricsShowUserSpecific: boolean('featuresMetricsShowUserSpecific').default(true).notNull(),

    featuresVersionChecking: boolean('featuresVersionChecking').default(true).notNull(),

    invitesEnabled: boolean('invitesEnabled').default(true).notNull(),
    invitesLength: integer('invitesLength').default(6).notNull(),

    websiteTitle: text('websiteTitle').default('Zipline').notNull(),
    websiteTitleLogo: text('websiteTitleLogo'),
    websiteExternalLinks: jsonb('websiteExternalLinks')
      .$type<ExternalLink[]>()
      .default([
        { name: 'GitHub', url: 'https://github.com/diced/zipline' },
        { name: 'Documentation', url: 'https://zipline.diced.sh/' },
      ])
      .notNull(),
    websiteLoginBackground: text('websiteLoginBackground'),
    websiteLoginBackgroundBlur: boolean('websiteLoginBackgroundBlur').default(true).notNull(),
    websiteDefaultAvatar: text('websiteDefaultAvatar'),
    websiteTos: text('websiteTos'),

    websiteThemeDefault: text('websiteThemeDefault').default('system').notNull(),
    websiteThemeDark: text('websiteThemeDark').default('builtin:dark_gray').notNull(),
    websiteThemeLight: text('websiteThemeLight').default('builtin:light_gray').notNull(),

    oauthBypassLocalLogin: boolean('oauthBypassLocalLogin').default(false).notNull(),
    oauthLoginOnly: boolean('oauthLoginOnly').default(false).notNull(),

    oauthDiscordClientId: text('oauthDiscordClientId'),
    oauthDiscordClientSecret: text('oauthDiscordClientSecret'),
    oauthDiscordRedirectUri: text('oauthDiscordRedirectUri'),
    oauthDiscordAllowedIds: text('oauthDiscordAllowedIds').array().default([]).notNull(),
    oauthDiscordDeniedIds: text('oauthDiscordDeniedIds').array().default([]).notNull(),

    oauthGoogleClientId: text('oauthGoogleClientId'),
    oauthGoogleClientSecret: text('oauthGoogleClientSecret'),
    oauthGoogleRedirectUri: text('oauthGoogleRedirectUri'),

    oauthGithubClientId: text('oauthGithubClientId'),
    oauthGithubClientSecret: text('oauthGithubClientSecret'),
    oauthGithubRedirectUri: text('oauthGithubRedirectUri'),

    oauthOidcClientId: text('oauthOidcClientId'),
    oauthOidcClientSecret: text('oauthOidcClientSecret'),
    oauthOidcAuthorizeUrl: text('oauthOidcAuthorizeUrl'),
    oauthOidcTokenUrl: text('oauthOidcTokenUrl'),
    oauthOidcUserinfoUrl: text('oauthOidcUserinfoUrl'),
    oauthOidcRedirectUri: text('oauthOidcRedirectUri'),

    mfaTotpEnabled: boolean('mfaTotpEnabled').default(false).notNull(),
    mfaTotpIssuer: text('mfaTotpIssuer').default('Zipline').notNull(),

    mfaPasskeysEnabled: boolean('mfaPasskeysEnabled').default(false).notNull(),
    mfaPasskeysRpID: text('mfaPasskeysRpID'),
    mfaPasskeysOrigin: text('mfaPasskeysOrigin'),

    ratelimitEnabled: boolean('ratelimitEnabled').default(true).notNull(),
    ratelimitMax: integer('ratelimitMax').default(10).notNull(),
    ratelimitWindow: integer('ratelimitWindow'),
    ratelimitAdminBypass: boolean('ratelimitAdminBypass').default(true).notNull(),
    ratelimitAllowList: text('ratelimitAllowList').array().default([]).notNull(),

    httpWebhookOnUpload: text('httpWebhookOnUpload'),
    httpWebhookOnShorten: text('httpWebhookOnShorten'),

    discordWebhookUrl: text('discordWebhookUrl'),
    discordUsername: text('discordUsername'),
    discordAvatarUrl: text('discordAvatarUrl'),

    discordOnUploadWebhookUrl: text('discordOnUploadWebhookUrl'),
    discordOnUploadUsername: text('discordOnUploadUsername'),
    discordOnUploadAvatarUrl: text('discordOnUploadAvatarUrl'),
    discordOnUploadContent: text('discordOnUploadContent'),
    discordOnUploadEmbed: jsonb('discordOnUploadEmbed').$type<Json>(),

    discordOnShortenWebhookUrl: text('discordOnShortenWebhookUrl'),
    discordOnShortenUsername: text('discordOnShortenUsername'),
    discordOnShortenAvatarUrl: text('discordOnShortenAvatarUrl'),
    discordOnShortenContent: text('discordOnShortenContent'),
    discordOnShortenEmbed: jsonb('discordOnShortenEmbed').$type<Json>(),

    pwaEnabled: boolean('pwaEnabled').default(false).notNull(),
    pwaTitle: text('pwaTitle').default('Zipline').notNull(),
    pwaShortName: text('pwaShortName').default('Zipline').notNull(),
    pwaDescription: text('pwaDescription').default('Zipline').notNull(),
    pwaThemeColor: text('pwaThemeColor').default('#000000').notNull(),
    pwaBackgroundColor: text('pwaBackgroundColor').default('#000000').notNull(),

    domains: text('domains').array().default([]).notNull(),
  },
  (table) => [primaryKey({ name: 'zipline_pkey', columns: [table.id] })],
);

export const users = pgTable(
  'User',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    username: text('username').notNull(),
    password: text('password'),
    avatar: text('avatar'),
    token: text('token').notNull(),
    role: role('role').default('USER').notNull(),
    view: jsonb('view').$type<Record<string, Json | undefined>>().default({}).notNull(),
    totpSecret: text('totpSecret'),
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
    name: text('name').notNull(),
    public: boolean('public').default(false).notNull(),
    allowUploads: boolean('allowUploads').default(false).notNull(),
    parentId: text('parentId').references((): AnyPgColumn => folders.id, {
      name: 'folder_parent_id_fkey',
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    userId: text('userId')
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
    deletesAt: timestamp('deletesAt', { precision: 3, mode: 'date', withTimezone: true }),
    name: text('name').notNull(),
    originalName: text('originalName'),
    size: bigint('size', { mode: 'number' }).notNull(),
    type: text('type').notNull(),
    views: integer('views').default(0).notNull(),
    maxViews: integer('maxViews'),
    favorite: boolean('favorite').default(false).notNull(),
    password: text('password'),
    anonymous: boolean('anonymous').default(false).notNull(),
    userId: text('userId').references(() => users.id, {
      name: 'file_user_id_fkey',
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    folderId: text('folderId').references(() => folders.id, {
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
    completed: boolean('completed').default(false).notNull(),
    path: text('path').notNull(),
    files: integer('files').notNull(),
    size: text('size').notNull(),
    userId: text('userId')
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
    id: text('id').notNull(),
    createdAt: createdAt(),
    ua: text('ua').notNull(),
    client: text('client').notNull(),
    device: text('device').notNull(),
    userId: text('userId')
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
    filesQuota: userFilesQuota('filesQuota').notNull(),
    maxBytes: text('maxBytes'),
    maxFiles: integer('maxFiles'),
    maxUrls: integer('maxUrls'),
    userId: text('userId').references(() => users.id, {
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
    lastUsed: timestamp('lastUsed', { precision: 3, mode: 'date', withTimezone: true }),
    name: text('name').notNull(),
    reg: jsonb('reg').$type<Record<string, Json | undefined>>().notNull(),
    userId: text('userId')
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
    userId: text('userId')
      .notNull()
      .references(() => users.id, {
        name: 'oauth_provider_user_id_fkey',
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    provider: oauthProviderType('provider').notNull(),
    username: text('username').notNull(),
    accessToken: text('accessToken').notNull(),
    refreshToken: text('refreshToken'),
    oauthId: text('oauthId'),
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
    path: text('path').notNull(),
    fileId: text('fileId')
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
    status: incompleteFileStatus('status').notNull(),
    chunksTotal: integer('chunksTotal').notNull(),
    chunksComplete: integer('chunksComplete').notNull(),
    metadata: jsonb('metadata').$type<IncompleteFileMetadata>().notNull(),
    userId: text('userId')
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
    name: text('name').notNull(),
    color: text('color').notNull(),
    userId: text('userId').references(() => users.id, {
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
    code: text('code').notNull(),
    vanity: text('vanity'),
    destination: text('destination').notNull(),
    views: integer('views').default(0).notNull(),
    maxViews: integer('maxViews'),
    password: text('password'),
    enabled: boolean('enabled').default(true).notNull(),
    userId: text('userId').references(() => users.id, {
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
    data: jsonb('data').$type<Record<string, Json | undefined>>().notNull(),
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
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date', withTimezone: true }),
    code: text('code').notNull(),
    uses: integer('uses').default(0).notNull(),
    maxUses: integer('maxUses'),
    inviterId: text('inviterId')
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
