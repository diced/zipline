import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../db/models/user';

export type ViewType = 'grid' | 'table';

export type SettingsStore = {
  view: {
    files: ViewType;
    urls: ViewType;
    users: ViewType;
    invites: ViewType;
  };

  setView: (type: keyof SettingsStore['view'], value: ViewType) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      view: {
        files: 'grid',
        urls: 'grid',
        users: 'grid',
        invites: 'grid',
      },

      setView: (type, value) =>
        set((state) => ({
          view: {
            ...state.view,
            [type]: value,
          },
        })),
    }),
    {
      name: 'zipline-settings',
    }
  )
);
