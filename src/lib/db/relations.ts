import { relations } from 'drizzle-orm';
import {
  exports,
  files,
  filesToTags,
  folders,
  incompleteFiles,
  invites,
  oauthProviders,
  tags,
  thumbnails,
  urls,
  userPasskeys,
  userQuotas,
  users,
  userSessions,
} from './schema';

export const usersRelations = relations(users, ({ many, one }) => ({
  quota: one(userQuotas),
  passkeys: many(userPasskeys),
  sessions: many(userSessions),
  files: many(files),
  urls: many(urls),
  folders: many(folders),
  invites: many(invites),
  tags: many(tags),
  oauthProviders: many(oauthProviders),
  incompleteFiles: many(incompleteFiles),
  exports: many(exports),
}));

export const userQuotasRelations = relations(userQuotas, ({ one }) => ({
  user: one(users, { fields: [userQuotas.userId], references: [users.id] }),
}));

export const userPasskeysRelations = relations(userPasskeys, ({ one }) => ({
  user: one(users, { fields: [userPasskeys.userId], references: [users.id] }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}));

export const oauthProvidersRelations = relations(oauthProviders, ({ one }) => ({
  user: one(users, { fields: [oauthProviders.userId], references: [users.id] }),
}));

export const exportsRelations = relations(exports, ({ one }) => ({
  user: one(users, { fields: [exports.userId], references: [users.id] }),
}));

export const foldersRelations = relations(folders, ({ many, one }) => ({
  User: one(users, { fields: [folders.userId], references: [users.id] }),
  parent: one(folders, {
    relationName: 'FolderToFolder',
    fields: [folders.parentId],
    references: [folders.id],
  }),
  children: many(folders, { relationName: 'FolderToFolder' }),
  files: many(files),
}));

export const filesRelations = relations(files, ({ many, one }) => ({
  User: one(users, { fields: [files.userId], references: [users.id] }),
  Folder: one(folders, { fields: [files.folderId], references: [folders.id] }),
  thumbnail: one(thumbnails),
  fileTags: many(filesToTags),
}));

export const thumbnailsRelations = relations(thumbnails, ({ one }) => ({
  file: one(files, { fields: [thumbnails.fileId], references: [files.id] }),
}));

export const tagsRelations = relations(tags, ({ many, one }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  fileTags: many(filesToTags),
}));

export const filesToTagsRelations = relations(filesToTags, ({ one }) => ({
  file: one(files, { fields: [filesToTags.fileId], references: [files.id] }),
  tag: one(tags, { fields: [filesToTags.tagId], references: [tags.id] }),
}));

export const urlsRelations = relations(urls, ({ one }) => ({
  user: one(users, { fields: [urls.userId], references: [users.id] }),
}));

export const incompleteFilesRelations = relations(incompleteFiles, ({ one }) => ({
  user: one(users, { fields: [incompleteFiles.userId], references: [users.id] }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  inviter: one(users, { fields: [invites.inviterId], references: [users.id] }),
}));
