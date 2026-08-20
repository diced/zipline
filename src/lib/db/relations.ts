import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
  users: {
    quota: r.one.userQuotas({
      from: r.users.id,
      to: r.userQuotas.userId,
    }),
    passkeys: r.many.userPasskeys(),
    sessions: r.many.userSessions(),
    files: r.many.files(),
    urls: r.many.urls(),
    folders: r.many.folders(),
    invites: r.many.invites(),
    tags: r.many.tags(),
    oauthProviders: r.many.oauthProviders(),
    incompleteFiles: r.many.incompleteFiles(),
    exports: r.many.exports(),
  },
  userQuotas: {
    user: r.one.users({
      from: r.userQuotas.userId,
      to: r.users.id,
    }),
  },
  userPasskeys: {
    user: r.one.users({
      from: r.userPasskeys.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  userSessions: {
    user: r.one.users({
      from: r.userSessions.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  oauthProviders: {
    user: r.one.users({
      from: r.oauthProviders.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  exports: {
    user: r.one.users({
      from: r.exports.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  folders: {
    user: r.one.users({
      from: r.folders.userId,
      to: r.users.id,
      optional: false,
    }),
    parent: r.one.folders({
      from: r.folders.parentId,
      to: r.folders.id,
      alias: 'FolderToFolder',
    }),
    children: r.many.folders({ alias: 'FolderToFolder' }),
    files: r.many.files(),
  },
  files: {
    user: r.one.users({
      from: r.files.userId,
      to: r.users.id,
    }),
    folder: r.one.folders({
      from: r.files.folderId,
      to: r.folders.id,
    }),
    thumbnail: r.one.thumbnails({
      from: r.files.id,
      to: r.thumbnails.fileId,
    }),
    tags: r.many.tags({
      from: r.files.id.through(r.filesToTags.fileId),
      to: r.tags.id.through(r.filesToTags.tagId),
    }),
  },
  thumbnails: {
    file: r.one.files({
      from: r.thumbnails.fileId,
      to: r.files.id,
      optional: false,
    }),
  },
  tags: {
    user: r.one.users({
      from: r.tags.userId,
      to: r.users.id,
    }),
    files: r.many.files({
      from: r.tags.id.through(r.filesToTags.tagId),
      to: r.files.id.through(r.filesToTags.fileId),
    }),
  },
  urls: {
    user: r.one.users({
      from: r.urls.userId,
      to: r.users.id,
    }),
  },
  incompleteFiles: {
    user: r.one.users({
      from: r.incompleteFiles.userId,
      to: r.users.id,
      optional: false,
    }),
  },
  invites: {
    inviter: r.one.users({
      from: r.invites.inviterId,
      to: r.users.id,
      optional: false,
    }),
  },
}));
