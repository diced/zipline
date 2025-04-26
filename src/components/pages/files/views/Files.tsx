import { FileExplorer } from '@/components/file/FileSystem/FileExplorer';
import { addToFolder } from '@/components/file/actions';
import { File } from '@/lib/db/models/file';
import { FilesSystemState, useFilesSystemState } from '@/components/pages/files/state/FileSystemState';
import { Folder } from '@/lib/db/models/folder';
import { moveFolderToAnotherFolder } from '@/components/pages/folders/actions';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Files() {
  const fileSystemState = useFilesSystemState();

  const handleMoveFile = async (file: File, toFolderId: string | null) => {
    console.log(`Move file ${file} to folder ${toFolderId}`);
    addToFolder(file, toFolderId);
  };

  const handleMoveFolder = async (folder: Folder, toFolderId: string | null) => {
    console.log(`Move folder ${folder.id} to folder ${toFolderId}`);
    moveFolderToAnotherFolder(folder, toFolderId);
  };

  useSyncFolderWithUrl(fileSystemState);

  return (
    fileSystemState.folders != undefined && (
      <FileExplorer onMoveFile={handleMoveFile} onMoveFolder={handleMoveFolder} />
    )
  );
}

function useSyncFolderWithUrl(fileSystemState: FilesSystemState) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  const updateUrlWithFolder = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString());
    const urlFolderId = params.get('folder');
    const currentFolderId = fileSystemState.currentFolder?.id;

    if (isFirstRender.current) {
      if (urlFolderId) {
        const folder = fileSystemState.folders.find((f) => f.id === urlFolderId);
        if (folder) {
          fileSystemState.setCurrentFolder(folder);
        }
      }
      isFirstRender.current = false;
      return;
    }

    if (currentFolderId && currentFolderId !== urlFolderId) {
      params.set('folder', currentFolderId);
      const newSearch = params.toString();
      const currentSearch = searchParams?.toString() || '';

      if (newSearch !== currentSearch) {
        router.replace(`?${newSearch}`);
      }
    }
  }, [fileSystemState, router, searchParams]);

  useEffect(() => {
    updateUrlWithFolder();
  }, [updateUrlWithFolder]);
}
