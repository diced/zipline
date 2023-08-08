import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SettingsStore = {
  settings: {
    disableMediaPreview: boolean;
    warnDeletion: boolean;
    searchThreshold: number;
    theme: string;
    themeDark: string;
    themeLight: string;
  };

  update: <K extends keyof SettingsStore['settings']>(key: K, value: SettingsStore['settings'][K]) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: {
        disableMediaPreview: false,
        warnDeletion: true,
        searchThreshold: 0.1,
        theme: 'builtin:dark_gray',
        themeDark: 'builtin:dark_gray',
        themeLight: 'builtin:light_gray',
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
    }
  )
);
