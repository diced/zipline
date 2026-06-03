import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SettingsStore = {
  settings: {
    disableMediaPreview: boolean;
    mediaAutoMuted: boolean;
    warnDeletion: boolean;
    fileNavButtons: boolean;
    fileViewer: 'default' | 'fullscreen';
    theme: string;
    themeDark: string;
    themeLight: string;
    domain: '' | string;
    homeShowRecents: boolean;
    homeShowActivity: boolean;
    homeShowTypes: boolean;
  };

  update: <K extends keyof SettingsStore['settings']>(key: K, value: SettingsStore['settings'][K]) => void;
};

const defaultSettings: SettingsStore['settings'] = {
  disableMediaPreview: false,
  mediaAutoMuted: true,
  warnDeletion: true,
  fileNavButtons: true,
  fileViewer: 'fullscreen',
  theme: 'builtin:dark_blue',
  themeDark: 'builtin:dark_blue',
  themeLight: 'builtin:light_blue',
  domain: '',
  homeShowRecents: true,
  homeShowActivity: true,
  homeShowTypes: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      update: (key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        })),
    }),
    {
      name: 'zipline-settings',
      merge: (persistedState, currentState) => {
        const typedPersisted = persistedState as SettingsStore | undefined;

        return {
          ...currentState,
          ...typedPersisted,
          settings: {
            ...currentState.settings,
            ...(typedPersisted?.settings || {}),
          },
        };
      },
    },
  ),
);
