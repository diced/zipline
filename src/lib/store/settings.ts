import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SettingsStore = {
  settings: {
    disableMediaPreview: boolean;
    warnDeletion: boolean;
    searchTreshold: number;
  };

  update: <K extends keyof SettingsStore['settings']>(key: K, value: SettingsStore['settings'][K]) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: {
        disableMediaPreview: false,
        warnDeletion: true,
        searchTreshold: 0.1,
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
