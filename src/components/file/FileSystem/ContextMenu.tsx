import { File } from '@/lib/db/models/file';
import { Folder } from '@/lib/db/models/folder';
import React from 'react';
import { useClipboard } from '@mantine/hooks';
import { Button, Card, Stack, Switch, Text, Transition } from '@mantine/core';
import { IconDownload, IconEdit, IconEye, IconStar, IconStarFilled, IconTrash } from '@tabler/icons-react';
import {
  copyFolderUrl,
  deleteFolder,
  editFolderUploads,
  editFolderVisibility,
} from '@/components/pages/folders/actions';
import { deleteFile, downloadFile, favoriteFile, viewFile, copyFile } from '@/components/file/actions';

const ContextMenu = ({
  opened,
  position,
  selectedItem,
  onClose,
  onOpenRenameModal,
  onOpenEditFileDetailsModal,
}: {
  opened: boolean;
  position: { x: number; y: number };
  selectedItem: { type: 'file' | 'folder'; item: File | Folder } | null;
  onClose: () => void;
  onOpenRenameModal: () => void;
  onOpenEditFileDetailsModal: () => void;
}) => {
  const contextMenuRef = React.useRef<HTMLDivElement>(null);
  const clipboard = useClipboard();

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <Transition mounted={opened} transition='scale' duration={200}>
      {(styles) => (
        <Card
          ref={contextMenuRef}
          shadow='sm'
          p='xs'
          radius='md'
          style={{
            position: 'fixed',
            top: position.y,
            left: position.x,
            zIndex: 1000,
            width: '200px',
            ...styles,
          }}
        >
          <Text size='sm' fw={500} mb='xs'>
            {selectedItem?.type === 'file' ? 'File' : 'Folder'} actions
          </Text>
          <Stack gap='xs'>
            {selectedItem?.type === 'file' && (
              <>
                <Button
                  variant='light'
                  size='xs'
                  leftSection={
                    (selectedItem.item as File).favorite ? (
                      <IconStarFilled size={14} color='yellow' />
                    ) : (
                      <IconStar size={14} />
                    )
                  }
                  onClick={() => {
                    const file = selectedItem.item as File;
                    favoriteFile(selectedItem.item as File);
                    file.favorite = !file.favorite;
                  }}
                >
                  {(selectedItem.item as File).favorite ? 'Unfavorite' : 'Add to favorites'}
                </Button>
                <Button
                  variant='light'
                  size='xs'
                  leftSection={<IconDownload size={14} />}
                  onClick={() => {
                    copyFile(selectedItem.item as File, clipboard);
                    onClose();
                  }}
                >
                  Copy URL
                </Button>
                <Button
                  variant='light'
                  size='xs'
                  leftSection={<IconEye size={14} />}
                  onClick={() => {
                    viewFile(selectedItem.item as File);
                    onClose();
                  }}
                >
                  View
                </Button>
                <Button
                  variant='light'
                  size='xs'
                  leftSection={<IconEdit size={14} />}
                  onClick={() => {
                    onOpenEditFileDetailsModal();
                    onClose();
                  }}
                >
                  Edit details
                </Button>
                <Button
                  variant='light'
                  size='xs'
                  leftSection={<IconDownload size={14} />}
                  onClick={() => {
                    downloadFile(selectedItem.item as File);
                    onClose();
                  }}
                >
                  Download
                </Button>
              </>
            )}
            <Button
              variant='light'
              size='xs'
              leftSection={<IconEdit size={14} />}
              onClick={() => {
                onOpenRenameModal();
                onClose();
              }}
            >
              Rename
            </Button>
            {selectedItem?.type === 'folder' && (
              <>
                <Button
                  variant='light'
                  size='xs'
                  leftSection={<IconDownload size={14} />}
                  onClick={() => {
                    const folder = selectedItem.item as Folder;
                    copyFolderUrl(folder, clipboard);
                    onClose();
                  }}
                  disabled={!(selectedItem.item as Folder).public}
                >
                  Copy URL
                </Button>
                <Switch
                  size='sm'
                  checked={(selectedItem.item as Folder).public}
                  onChange={(event) => {
                    const folder = selectedItem.item as Folder;
                    const newValue = !folder.public;
                    folder.public = newValue;
                    editFolderVisibility(folder, newValue);
                  }}
                  label={(selectedItem.item as Folder).public ? 'Public' : 'Private'}
                />
                <Switch
                  size='sm'
                  checked={(selectedItem.item as Folder).allowUploads}
                  onChange={(event) => {
                    const folder = selectedItem.item as Folder;
                    const newValue = !folder.allowUploads;
                    folder.allowUploads = newValue;
                    editFolderUploads(folder, newValue);
                  }}
                  label={(selectedItem.item as Folder).allowUploads ? 'Uploads enabled' : 'Uploads disabled'}
                />
              </>
            )}
            <Button
              variant='light'
              color='red'
              size='xs'
              leftSection={<IconTrash size={14} />}
              onClick={() => {
                if (selectedItem?.type === 'file') {
                  deleteFile(true, selectedItem.item as File, () => {});
                } else {
                  deleteFolder(selectedItem?.item as Folder);
                }
                onClose();
              }}
            >
              Delete
            </Button>
          </Stack>
        </Card>
      )}
    </Transition>
  );
};

export default ContextMenu;
