import { atom, selector } from 'recoil';

const localStorageEffect =
  (key) =>
  ({ setSelf, onSet }) => {
    const savedValue = localStorage.getItem(key);
    if (savedValue != null) {
      setSelf(JSON.parse(savedValue));
    }

    onSet((newValue, _, isReset) => {
      isReset ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(newValue));
    });
  };

export type Settings = {
  showNonMedia: boolean;
  listView: {
    urls: boolean;
    users: boolean;
    invites: boolean;
    folders: boolean;
    files: boolean;
  };
};

export const DEFAULT_SETTINGS: Settings = {
  showNonMedia: false,
  listView: {
    urls: true,
    users: true,
    invites: true,
    folders: true,
    files: true,
  },
};

export const settingsState = atom<Settings>({
  key: 'settingsState',
  default: DEFAULT_SETTINGS,
  effects: [localStorageEffect('zipline_settings')],
});

export const showNonMediaSelector = selector<boolean>({
  key: 'settingsShowNonMediaSelector',
  get: ({ get }) => get(settingsState).showNonMedia,
  set: ({ set, get }, newValue) =>
    set(settingsState, {
      showNonMedia: newValue,
      listView: get(settingsState).listView ?? DEFAULT_SETTINGS.listView,
    }),
});

export const listViewUrlsSelector = selector<boolean>({
  key: 'listViewUrlsSelector',
  get: ({ get }) => get(settingsState).listView?.urls ?? DEFAULT_SETTINGS.listView.urls,
  set: ({ set, get }, newValue) =>
    set(settingsState, {
      showNonMedia: get(settingsState).showNonMedia,
      listView: { ...(get(settingsState).listView ?? DEFAULT_SETTINGS.listView), urls: newValue },
    }),
});

export const listViewUsersSelector = selector<boolean>({
  key: 'listViewUsersSelector',
  get: ({ get }) => get(settingsState).listView?.users ?? DEFAULT_SETTINGS.listView.users,
  set: ({ set, get }, newValue) =>
    set(settingsState, {
      showNonMedia: get(settingsState).showNonMedia,
      listView: { ...(get(settingsState).listView ?? DEFAULT_SETTINGS.listView), users: newValue },
    }),
});

export const listViewInvitesSelector = selector<boolean>({
  key: 'listViewInvitesSelector',
  get: ({ get }) => get(settingsState).listView?.invites ?? DEFAULT_SETTINGS.listView.invites,
  set: ({ set, get }, newValue) =>
    set(settingsState, {
      showNonMedia: get(settingsState).showNonMedia,
      listView: { ...(get(settingsState).listView ?? DEFAULT_SETTINGS.listView), invites: newValue },
    }),
});

export const listViewFoldersSelector = selector<boolean>({
  key: 'listViewFoldersSelector',
  get: ({ get }) => get(settingsState).listView?.folders ?? DEFAULT_SETTINGS.listView.folders,
  set: ({ set, get }, newValue) =>
    set(settingsState, {
      showNonMedia: get(settingsState).showNonMedia,
      listView: { ...(get(settingsState).listView ?? DEFAULT_SETTINGS.listView), folders: newValue },
    }),
});

export const listViewFilesSelector = selector<boolean>({
  key: 'listViewFilesSelector',
  get: ({ get }) => get(settingsState).listView?.files ?? DEFAULT_SETTINGS.listView.files,
  set: ({ set, get }, newValue) =>
    set(settingsState, {
      showNonMedia: get(settingsState).showNonMedia,
      listView: { ...(get(settingsState).listView ?? DEFAULT_SETTINGS.listView), files: newValue },
    }),
});
