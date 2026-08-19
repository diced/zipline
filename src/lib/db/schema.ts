import { createId } from '@paralleldrive/cuid2';
import {
  bigint,
  boolean,
  foreignKey,
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

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue | undefined };
export type ExternalLink = { name: string; url: string };

export const role = pgEnum('Role', roleValues);
export const oauthProviderType = pgEnum('OAuthProviderType', oauthProviderTypeValues);
export const userFilesQuota = pgEnum('UserFilesQuota', userFilesQuotaValues);
export const incompleteFileStatus = pgEnum('IncompleteFileStatus', incompleteFileStatusValues);

const id = () => text('id').primaryKey().$defaultFn(createId);
const createdAt = () => timestamp('createdAt', { precision: 3, mode: 'date' }).defaultNow().notNull();
const updatedAt = () =>
  timestamp('updatedAt', { precision: 3, mode: 'date' })
    .notNull()
    .$onUpdate(() => new Date());

export const zipline = pgTable('Zipline', {
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
  // Prisma's PostgreSQL list columns are nullable in the physical catalog.
  filesDisabledTypes: text('filesDisabledTypes').array().default([]),
  filesDisabledTypesDefault: text('filesDisabledTypesDefault'),
  filesDisabledExtensions: text('filesDisabledExtensions').array(),
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
  oauthDiscordAllowedIds: text('oauthDiscordAllowedIds').array().default([]),
  oauthDiscordDeniedIds: text('oauthDiscordDeniedIds').array().default([]),

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
  ratelimitAllowList: text('ratelimitAllowList').array(),

  httpWebhookOnUpload: text('httpWebhookOnUpload'),
  httpWebhookOnShorten: text('httpWebhookOnShorten'),

  discordWebhookUrl: text('discordWebhookUrl'),
  discordUsername: text('discordUsername'),
  discordAvatarUrl: text('discordAvatarUrl'),

  discordOnUploadWebhookUrl: text('discordOnUploadWebhookUrl'),
  discordOnUploadUsername: text('discordOnUploadUsername'),
  discordOnUploadAvatarUrl: text('discordOnUploadAvatarUrl'),
  discordOnUploadContent: text('discordOnUploadContent'),
  discordOnUploadEmbed: jsonb('discordOnUploadEmbed').$type<JsonValue>(),

  discordOnShortenWebhookUrl: text('discordOnShortenWebhookUrl'),
  discordOnShortenUsername: text('discordOnShortenUsername'),
  discordOnShortenAvatarUrl: text('discordOnShortenAvatarUrl'),
  discordOnShortenContent: text('discordOnShortenContent'),
  discordOnShortenEmbed: jsonb('discordOnShortenEmbed').$type<JsonValue>(),

  pwaEnabled: boolean('pwaEnabled').default(false).notNull(),
  pwaTitle: text('pwaTitle').default('Zipline').notNull(),
  pwaShortName: text('pwaShortName').default('Zipline').notNull(),
  pwaDescription: text('pwaDescription').default('Zipline').notNull(),
  pwaThemeColor: text('pwaThemeColor').default('#000000').notNull(),
  pwaBackgroundColor: text('pwaBackgroundColor').default('#000000').notNull(),

  domains: text('domains').array().default([]),
});

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
    view: jsonb('view').$type<Record<string, JsonValue | undefined>>().default({}).notNull(),
    totpSecret: text('totpSecret'),
  },
  (table) => [
    uniqueIndex('User_username_key').on(table.username),
    uniqueIndex('User_token_key').on(table.token),
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
    parentId: text('parentId'),
    userId: text('userId').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'Folder_userId_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      name: 'Folder_parentId_fkey',
      columns: [table.parentId],
      foreignColumns: [table.id],
    })
      .onDelete('set null')
      .onUpdate('cascade'),
  ],
);

export const files = pgTable(
  'File',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletesAt: timestamp('deletesAt', { precision: 3, mode: 'date' }),
    name: text('name').notNull(),
    originalName: text('originalName'),
    size: bigint('size', { mode: 'number' }).notNull(),
    type: text('type').notNull(),
    views: integer('views').default(0).notNull(),
    maxViews: integer('maxViews'),
    favorite: boolean('favorite').default(false).notNull(),
    password: text('password'),
    anonymous: boolean('anonymous').default(false).notNull(),
    userId: text('userId'),
    folderId: text('folderId'),
  },
  (table) => [
    index('File_name_idx').on(table.name),
    index('File_userId_size_idx').on(table.userId, table.size),
    index('File_folderId_createdAt_idx').on(table.folderId, table.createdAt),
    foreignKey({
      name: 'File_userId_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    })
      .onDelete('set null')
      .onUpdate('cascade'),
    foreignKey({
      name: 'File_folderId_fkey',
      columns: [table.folderId],
      foreignColumns: [folders.id],
    })
      .onDelete('set null')
      .onUpdate('cascade'),
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
    userId: text('userId').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'Export_userId_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

export const userSessions = pgTable(
  'UserSession',
  {
    id: text('id').primaryKey(),
    createdAt: createdAt(),
    ua: text('ua').notNull(),
    client: text('client').notNull(),
    device: text('device').notNull(),
    userId: text('userId').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'UserSession_userId_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
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
    userId: text('userId'),
  },
  (table) => [
    uniqueIndex('UserQuota_userId_key').on(table.userId),
    foreignKey({
      name: 'UserQuota_userId_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

export const userPasskeys = pgTable(
  'UserPasskey',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    lastUsed: timestamp('lastUsed', { precision: 3, mode: 'date' }),
    name: text('name').notNull(),
    reg: jsonb('reg').$type<Record<string, JsonValue | undefined>>().notNull(),
    userId: text('userId').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'UserPasskey_userId_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

export const oauthProviders = pgTable(
  'OAuthProvider',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    userId: text('userId').notNull(),
    provider: oauthProviderType('provider').notNull(),
    username: text('username').notNull(),
    accessToken: text('accessToken').notNull(),
    refreshToken: text('refreshToken'),
    oauthId: text('oauthId'),
  },
  (table) => [
    uniqueIndex('OAuthProvider_provider_oauthId_key').on(table.provider, table.oauthId),
    foreignKey({
      name: 'OAuthProvider_userId_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    })
      .onDelete('restrict')
      .onUpdate('cascade'),
  ],
);

export const thumbnails = pgTable(
  'Thumbnail',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    path: text('path').notNull(),
    fileId: text('fileId').notNull(),
  },
  (table) => [
    uniqueIndex('Thumbnail_fileId_key').on(table.fileId),
    foreignKey({
      name: 'Thumbnail_fileId_fkey',
      columns: [table.fileId],
      foreignColumns: [files.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
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
    metadata: jsonb('metadata').$type<Record<string, JsonValue | undefined>>().notNull(),
    userId: text('userId').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'IncompleteFile_userId_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
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
    userId: text('userId'),
  },
  (table) => [
    uniqueIndex('Tag_name_key').on(table.name),
    foreignKey({
      name: 'Tag_userId_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    })
      .onDelete('set null')
      .onUpdate('cascade'),
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
    userId: text('userId'),
  },
  (table) => [
    uniqueIndex('Url_code_vanity_key').on(table.code, table.vanity),
    foreignKey({
      name: 'Url_userId_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    })
      .onDelete('set null')
      .onUpdate('cascade'),
  ],
);

export const metrics = pgTable('Metric', {
  id: id(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  data: jsonb('data').$type<Record<string, JsonValue | undefined>>().notNull(),
});

export const invites = pgTable(
  'Invite',
  {
    id: id(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }),
    code: text('code').notNull(),
    uses: integer('uses').default(0).notNull(),
    maxUses: integer('maxUses'),
    inviterId: text('inviterId').notNull(),
  },
  (table) => [
    uniqueIndex('Invite_code_key').on(table.code),
    foreignKey({
      name: 'Invite_inviterId_fkey',
      columns: [table.inviterId],
      foreignColumns: [users.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

export const filesToTags = pgTable(
  '_FileToTag',
  {
    fileId: text('A').notNull(),
    tagId: text('B').notNull(),
  },
  (table) => [
    primaryKey({ name: '_FileToTag_AB_pkey', columns: [table.fileId, table.tagId] }),
    index('_FileToTag_B_index').on(table.tagId),
    foreignKey({
      name: '_FileToTag_A_fkey',
      columns: [table.fileId],
      foreignColumns: [files.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      name: '_FileToTag_B_fkey',
      columns: [table.tagId],
      foreignColumns: [tags.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);

export type Zipline = typeof zipline.$inferSelect;
export type User = typeof users.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type File = typeof files.$inferSelect;
export type Export = typeof exports.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type UserQuota = typeof userQuotas.$inferSelect;
export type UserPasskey = typeof userPasskeys.$inferSelect;
export type OAuthProvider = typeof oauthProviders.$inferSelect;
export type Thumbnail = typeof thumbnails.$inferSelect;
export type IncompleteFile = typeof incompleteFiles.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Url = typeof urls.$inferSelect;
export type Metric = typeof metrics.$inferSelect;
export type Invite = typeof invites.$inferSelect;
