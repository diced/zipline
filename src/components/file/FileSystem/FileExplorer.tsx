import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Breadcrumbs, Button, Flex, Group, Stack, Text } from '@mantine/core';
import { IconArrowLeft, IconFile, IconFolder } from '@tabler/icons-react';
import { Folder } from '@/lib/db/models/folder';
import { File } from '@/lib/db/models/file';
import { useFilesSystemState } from '@/components/pages/files/state/FileSystemState';
import styles from './index.module.css';
import React, { useState } from 'react';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import FileModal from '@/components/file/DashboardFile/FileModal';
import RenameModal from '@/components/file/FileSystem/RenameModal';
import FolderCard from '@/components/file/FileSystem/FolderCard';
import FileCard from '@/components/file/FileSystem/FileCard';
import ContextMenu from '@/components/file/FileSystem/ContextMenu';
import BreadcrumbAnchor from '@/components/file/FileSystem/BreadcrumbAnchor';
import EditFileDetailsModal from '@/components/file/DashboardFile/EditFileDetailsModal';

type FileExplorerProps = {
  onMoveFile: (file: File, toFolderId: string | null) => void;
  onMoveFolder: (file: Folder, toFolderId: string | null) => void;
};

export const FileExplorer = ({ onMoveFile, onMoveFolder }: FileExplorerProps) => {
  const fileSystemState = useFilesSystemState();
  const [isActive, setIsActive] = useState('none');

  const [contextMenuOpened, setContextMenuOpened] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedItem, setSelectedItem] = useState<{ type: 'file' | 'folder'; item: File | Folder } | null>(
    null,
  );
  const [renameModalOpened, setRenameModalOpened] = useState(false);
  const [openFileModal, setOpenFileModal] = useState(false);
  const [fileInModal, setFileInModal] = useState<File | undefined>(undefined);
  const [editFileModalOpen, setEditFileModalOpen] = useState(false);

  const visibleFolders = fileSystemState.folders.filter(
    (folder: Folder) => folder.parentFolderId === fileSystemState?.currentFolder?.id,
  );

  const handleOpenFolder = (folder: Folder) => {
    fileSystemState.setCurrentFolder(folder);
  };

  const handleBack = () => {
    const parent = fileSystemState?.currentFolder?.parentFolderId;
    const previousFolder = fileSystemState.folders.find((folder: Folder) => folder.id === parent);
    if (!previousFolder) return;
    fileSystemState.setCurrentFolder(previousFolder);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setIsActive('none');
    console.log(active, over);

    if (active.data.current.folder) {
      if (active.id !== over?.id && over?.id) {
        onMoveFolder(active.data.current.folder, over?.id as string);
      }
    } else {
      if (active.id !== over?.id && over?.id) {
        onMoveFile(active.data.current.file, over.id as string);
      }
    }
  };

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 0.01,
    },
  });
  const mouseSensor = useSensor(MouseSensor);
  const touchSensor = useSensor(TouchSensor);
  const keyboardSensor = useSensor(KeyboardSensor);

  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor, pointerSensor);

  const generateBreadcrumbs = () => {
    const breadcrumbs = [];
    let currentFolder = fileSystemState.currentFolder;

    while (currentFolder) {
      breadcrumbs.unshift(currentFolder);
      currentFolder =
        fileSystemState.folders.find((folder: Folder) => folder.id === currentFolder?.parentFolderId) ||
        undefined;
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleContextMenu = (event: React.MouseEvent, type: 'file' | 'folder', item: File | Folder) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setSelectedItem({ type, item });
    setContextMenuOpened(true);
  };

  return (
    <>
      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={(event: any) => {
          if (event.active.data.current.folder) {
            setIsActive('folder');
          } else {
            setIsActive('file');
          }
        }}
        sensors={sensors}
      >
        <Stack>
          <Group align='center' mt='md'>
            {fileSystemState?.currentFolder?.parentFolderId && (
              <Button leftSection={<IconArrowLeft size={16} />} variant='subtle' onClick={handleBack}>
                Back
              </Button>
            )}
            <Breadcrumbs
              separator='›'
              classNames={{
                breadcrumb: styles.breadcrumb,
                separator: styles.breadcrumbSeparator,
              }}
            >
              {breadcrumbs.map((folder) => (
                <BreadcrumbAnchor
                  key={folder.id}
                  folder={folder}
                  onSetFolder={fileSystemState.setCurrentFolder}
                />
              ))}
            </Breadcrumbs>
          </Group>

          <Flex wrap='wrap' gap='sm'>
            {visibleFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onClick={() => handleOpenFolder(folder)}
                handleContextMenu={handleContextMenu}
              />
            ))}
            {visibleFolders.length === 0 &&
              (!fileSystemState?.currentFolder?.files?.length ||
                fileSystemState?.currentFolder?.files?.length === 0) && (
                <Text c='dimmed' ta='center' w='100%' my='xl'>
                  Folder is empty
                </Text>
              )}
            {fileSystemState?.currentFolder?.files?.map((file: File) => (
              <FileCard
                key={file.id}
                file={file}
                handleContextMenu={handleContextMenu}
                setFileInModal={setFileInModal}
                setOpenFileModal={setOpenFileModal}
              />
            ))}
          </Flex>
        </Stack>
        <DragOverlay
          style={{
            width: '150px',
            height: '160px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'var(--mantine-color-gray-light-hover)',
            borderRadius: '100%',
          }}
          modifiers={[snapCenterToCursor]}
        >
          {isActive === 'file' ? (
            <IconFile size={64} />
          ) : isActive === 'folder' ? (
            <IconFolder size={64} />
          ) : null}
        </DragOverlay>
      </DndContext>
      <ContextMenu
        opened={contextMenuOpened}
        position={contextMenuPosition}
        selectedItem={selectedItem}
        onClose={() => setContextMenuOpened(false)}
        onOpenRenameModal={() => setRenameModalOpened(true)}
        onOpenEditFileDetailsModal={() => setEditFileModalOpen(true)}
      />
      <RenameModal
        opened={renameModalOpened}
        onClose={() => setRenameModalOpened(false)}
        item={selectedItem?.item}
        type={selectedItem?.type}
      />
      <EditFileDetailsModal
        open={editFileModalOpen}
        onClose={() => setEditFileModalOpen(false)}
        file={selectedItem?.item as File}
      />
      <FileModal open={openFileModal} setOpen={setOpenFileModal} file={fileInModal} />
    </>
  );
};
