import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SettingsStore = {
  settings: {
    disableMediaPreview: boolean;
    warnDeletion: boolean;
    theme: string;
    themeDark: string;
    themeLight: string;
    backgroundType: 'default' | 'image';
    backgroundImageUrl: string;
  };

  update: <K extends keyof SettingsStore['settings']>(key: K, value: SettingsStore['settings'][K]) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: {
        disableMediaPreview: false,
        warnDeletion: true,
        theme: 'builtin:dark_blue',
        themeDark: 'builtin:dark_blue',
        themeLight: 'builtin:light_blue',
        backgroundType: 'default',
        backgroundImageUrl: '',
      },

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
    },
  ),
);
