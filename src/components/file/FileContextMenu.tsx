import FolderComboboxOptions from '@/components/folders/FolderComboboxOptions';
import { useFolders } from '@/lib/client/hooks/useFolders';
import { useSettingsStore } from '@/lib/client/store/settings';
import type { File } from '@/lib/db/models/file';
import { buildFolderHierarchy } from '@/lib/folderHierarchy';
import { Box, Combobox, InputBase, Menu, ScrollArea, Text, useCombobox } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import {
  IconClipboardTypography,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconEye,
  IconFolderMinus,
  IconFolderSymlink,
  IconPencil,
  IconStar,
  IconStarFilled,
  IconTrashFilled,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import {
  addToFolder,
  copyFile,
  createFolderAndAdd,
  deleteFile,
  downloadFile,
  favoriteFile,
  removeFromFolder,
  viewFile,
} from './actions';
import EditFileDetailsModal from './DashboardFile/EditFileDetailsModal';

const stop = (fn: () => void) => (event: React.MouseEvent) => {
  event.stopPropagation();
  fn();
};

function openCreateFolderModal(file: File) {
  modals.openConfirmModal({
    modalId: 'file-context-create-folder',
    title: 'Create folder',
    centered: true,
    children: (
      <InputBase
        id='file-context-new-folder'
        label='Folder name'
        placeholder='My folder'
        data-autofocus
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          const name = event.currentTarget.value.trim();
          if (!name) return;
          createFolderAndAdd(file, name);
          modals.closeAll();
        }}
      />
    ),
    labels: { confirm: 'Create', cancel: 'Cancel' },
    onConfirm: () => {
      const input = document.getElementById('file-context-new-folder') as HTMLInputElement | null;
      const name = input?.value?.trim();
      if (name) createFolderAndAdd(file, name);
    },
  });
}

export default function FileContextMenu({
  file,
  reduce,
  user,
  onView,
  children,
}: {
  file: File;
  reduce?: boolean;
  user?: string;
  onView?: () => void;
  children: React.ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [editOpen, setEditOpen] = useState(false);

  const clipboard = useClipboard();
  const warnDeletion = useSettingsStore((state) => state.settings.warnDeletion);
  const { data: folders } = useFolders(user);

  const folderOptions = useMemo(() => {
    if (!folders) return [];
    return buildFolderHierarchy(folders);
  }, [folders]);

  const folderCombobox = useCombobox({
    onDropdownClose: () => {
      folderCombobox.resetSelectedOption();
      setFolderSearch('');
    },
  });
  const [folderSearch, setFolderSearch] = useState('');

  useEffect(() => {
    if (!opened) return;

    const close = () => setOpened(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);

    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [opened]);

  const closeMenu = () => setOpened(false);

  const run = (fn: () => void) => () => {
    closeMenu();
    fn();
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setPosition({ x: event.clientX, y: event.clientY });
    setOpened(true);
  };

  const handleAddToFolder = async (value: string) => {
    closeMenu();
    folderCombobox.closeDropdown();

    if (value === '$create') {
      await createFolderAndAdd(file, folderSearch.trim());
    } else {
      await addToFolder(file, value);
    }

    setFolderSearch('');
  };

  const filteredFolders = folderOptions.filter((folder) =>
    folder.path.toLowerCase().includes(folderSearch.toLowerCase().trim()),
  );

  return (
    <>
      <EditFileDetailsModal open={editOpen} onClose={() => setEditOpen(false)} file={file} />

      <Box onContextMenu={handleContextMenu} style={{ display: 'contents' }}>
        {children}
      </Box>

      <Menu
        opened={opened}
        onChange={setOpened}
        withinPortal
        shadow='md'
        radius='md'
        width={240}
        position='bottom-start'
        offset={4}
        closeOnItemClick
      >
        <Menu.Target>
          <Box
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              width: 1,
              height: 1,
              padding: 0,
              margin: 0,
              pointerEvents: 'none',
            }}
          />
        </Menu.Target>

        <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
          <Menu.Label>
            <Text size='xs' fw={600} lineClamp={1}>
              {file.name}
            </Text>
            <Text size='xs' c='dimmed' lineClamp={1}>
              {file.type}
            </Text>
          </Menu.Label>

          <Menu.Divider />

          {onView && (
            <Menu.Item leftSection={<IconEye size='1rem' />} onClick={stop(run(onView))}>
              Open
            </Menu.Item>
          )}
          <Menu.Item leftSection={<IconExternalLink size='1rem' />} onClick={stop(run(() => viewFile(file)))}>
            Open in new tab
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item
            leftSection={<IconCopy size='1rem' />}
            onClick={stop(run(() => copyFile(file, clipboard)))}
          >
            Copy link
          </Menu.Item>
          <Menu.Item
            leftSection={<IconClipboardTypography size='1rem' />}
            onClick={stop(run(() => copyFile(file, clipboard, true)))}
          >
            Copy raw link
          </Menu.Item>
          <Menu.Item leftSection={<IconDownload size='1rem' />} onClick={stop(run(() => downloadFile(file)))}>
            Download
          </Menu.Item>

          {!reduce && (
            <>
              <Menu.Divider />

              <Menu.Item
                leftSection={
                  file.favorite ? (
                    <IconStarFilled size='1rem' color='var(--mantine-color-yellow-5)' />
                  ) : (
                    <IconStar size='1rem' />
                  )
                }
                onClick={stop(run(() => favoriteFile(file)))}
              >
                {file.favorite ? 'Unfavorite' : 'Favorite'}
              </Menu.Item>

              {file.folderId ? (
                <Menu.Item
                  leftSection={<IconFolderMinus size='1rem' color='var(--mantine-color-red-5)' />}
                  onClick={stop(run(() => removeFromFolder(file)))}
                >
                  Remove from folder
                </Menu.Item>
              ) : (
                <Menu.Sub openDelay={100} closeDelay={200}>
                  <Menu.Sub.Target>
                    <Menu.Sub.Item leftSection={<IconFolderSymlink size='1rem' />}>
                      Move to folder
                    </Menu.Sub.Item>
                  </Menu.Sub.Target>
                  <Menu.Sub.Dropdown>
                    <Box p='xs' w={220} onClick={(event) => event.stopPropagation()}>
                      <Combobox
                        store={folderCombobox}
                        onOptionSubmit={handleAddToFolder}
                        withinPortal={false}
                      >
                        <Combobox.Target>
                          <InputBase
                            size='xs'
                            placeholder='Search folders...'
                            value={folderSearch}
                            onChange={(event) => {
                              folderCombobox.openDropdown();
                              setFolderSearch(event.currentTarget.value);
                            }}
                            onClick={() => folderCombobox.openDropdown()}
                            onFocus={() => folderCombobox.openDropdown()}
                            rightSection={<Combobox.Chevron />}
                            rightSectionPointerEvents='none'
                          />
                        </Combobox.Target>

                        <Combobox.Dropdown>
                          <ScrollArea.Autosize mah={200} type='scroll'>
                            <FolderComboboxOptions
                              folderOptions={filteredFolders}
                              searchValue={folderSearch}
                              additionalOptions={
                                !folders?.some((f) => f.name === folderSearch.trim()) &&
                                folderSearch.trim().length > 0 ? (
                                  <Combobox.Option value='$create'>
                                    + Create &quot;{folderSearch.trim()}&quot;
                                  </Combobox.Option>
                                ) : null
                              }
                            />
                            {!filteredFolders.length && !folderSearch.trim() && (
                              <Combobox.Empty px='xs' py='sm'>
                                <Text size='xs' c='dimmed'>
                                  No folders yet
                                </Text>
                              </Combobox.Empty>
                            )}
                          </ScrollArea.Autosize>
                        </Combobox.Dropdown>
                      </Combobox>

                      <Menu.Item mt={4} onClick={stop(() => openCreateFolderModal(file))}>
                        + Create new folder
                      </Menu.Item>
                    </Box>
                  </Menu.Sub.Dropdown>
                </Menu.Sub>
              )}

              <Menu.Item
                leftSection={<IconPencil size='1rem' />}
                onClick={stop(run(() => setEditOpen(true)))}
              >
                Edit details
              </Menu.Item>

              <Menu.Divider />

              <Menu.Item
                color='red'
                leftSection={<IconTrashFilled size='1rem' />}
                onClick={stop(run(() => deleteFile(warnDeletion, file, () => {})))}
              >
                Delete
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    </>
  );
}
