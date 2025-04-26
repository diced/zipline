import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Folder } from '@/lib/db/models/folder';

export type FilesSystemState = {
  folders: Folder[];
  currentFolder?: Folder;
  setFolders: (folders: Folder[]) => void;
  setCurrentFolder: (folder?: Folder) => void;
};

export const useFilesSystemState = create<FilesSystemState>()(
  persist(
    (set) => ({
      folders: [],
      currentFolder: undefined,
      setFolders: (folders: Folder[]) =>
        set((state) => {
          const currentId = state.currentFolder?.id;
          const updatedCurrent = folders.find((folder: Folder) => folder.id === currentId)
            ?? folders.find((folder: Folder) => folder.id === 'root');

          return {
            folders: folders,
            currentFolder: updatedCurrent,
          };
        }),
      setCurrentFolder: (folder?: Folder) =>
        set({
          currentFolder: folder,
        }),
    }),
    {
      name: 'zipline-file-system',
    },
  ),
);
