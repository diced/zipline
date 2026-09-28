import type common from './locales/en/common.json';
import type layout from './locales/en/layout.json';
import type auth from './locales/en/auth.json';
import type view from './locales/en/view.json';
import type file from './locales/en/file.json';
import type files from './locales/en/files.json';
import type folders from './locales/en/folders.json';
import type settings from './locales/en/settings.json';
import type serverSettings from './locales/en/serverSettings.json';
import type serverActions from './locales/en/serverActions.json';
import type upload from './locales/en/upload.json';
import type urls from './locales/en/urls.json';
import type invites from './locales/en/invites.json';
import type users from './locales/en/users.json';
import type dashboard from './locales/en/dashboard.json';
import type metrics from './locales/en/metrics.json';
import type { Language } from './languages';

// english is the source of truth, every other language is a (possibly partial) translation of it
export type Resources = {
  common: typeof common;
  layout: typeof layout;
  auth: typeof auth;
  view: typeof view;
  file: typeof file;
  files: typeof files;
  folders: typeof folders;
  settings: typeof settings;
  serverSettings: typeof serverSettings;
  serverActions: typeof serverActions;
  upload: typeof upload;
  urls: typeof urls;
  invites: typeof invites;
  users: typeof users;
  dashboard: typeof dashboard;
  metrics: typeof metrics;
};

export type Namespace = keyof Resources;

const modules = import.meta.glob<Record<string, unknown>>('./locales/*/*.json', {
  eager: true,
  import: 'default',
});

export const resources: Partial<Record<Language, Record<string, Record<string, unknown>>>> = {};

for (const [path, messages] of Object.entries(modules)) {
  const match = path.match(/^\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;

  const [, lng, ns] = match;
  (resources[lng as Language] ??= {})[ns] = messages;
}
