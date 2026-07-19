import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewType = 'grid' | 'table';
export type GridSize = 'compact' | 'normal' | 'large';

export type ViewStore = {
  files: ViewType;
  urls: ViewType;
  users: ViewType;
  invites: ViewType;
  folders: ViewType;
  filesGridSize: GridSize;

  setView: (type: Exclude<keyof ViewStore, 'setView' | 'setGridSize'>, value: ViewType) => void;
  setGridSize: (size: GridSize) => void;
};

export const useViewStore = create<ViewStore>()(
  persist(
    (set) => ({
      files: 'grid',
      urls: 'table',
      users: 'table',
      invites: 'table',
      folders: 'table',
      filesGridSize: 'normal',

      setView: (type, value) =>
        set((state) => ({
          ...state,
          [type]: value,
        })),
      setGridSize: (size) => set((state) => ({ ...state, filesGridSize: size })),
    }),
    {
      name: 'zipline-view-settings',
    },
  ),
);
