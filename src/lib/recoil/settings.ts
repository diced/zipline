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
};

export const settingsState = atom<Settings>({
  key: 'settingsState',
  default: {
    showNonMedia: false,
  },
  effects: [localStorageEffect('zipline_settings')],
});

export const showNonMediaSelector = selector<boolean>({
  key: 'settingsState',
  get: ({ get }) => get(settingsState).showNonMedia,
  set: ({ set }, newValue) => set(settingsState, { showNonMedia: newValue }),
});
