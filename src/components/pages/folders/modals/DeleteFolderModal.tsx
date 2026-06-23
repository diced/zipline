import FolderComboboxOptions from '@/components/folders/FolderComboboxOptions';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { buildFolderHierarchy } from '@/lib/folderHierarchy';
import { openWarningModal } from '@/lib/client/warningModal';
import { useFolders } from '@/lib/client/hooks/useFolders';
import { Button, Combobox, InputBase, Modal, Radio, Stack, Text, useCombobox } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrashFilled } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { mutateFolder } from '../actions';

type ChildrenAction = 'root' | 'folder' | 'cascade' | 'cascade-files';

export default function DeleteFolderModal({
  folder,
  opened,
  onClose,
}: {
  folder: Folder | null;
  opened: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [childrenAction, setChildrenAction] = useState<ChildrenAction>('root');
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const combobox = useCombobox();

  const { data: allFolders } = useFolders(undefined, opened);

  const folderOptions = useMemo(() => {
    if (!allFolders || !folder) return [];
    // Exclude the folder being deleted
    const excludeIds = new Set([folder.id]);
    return buildFolderHierarchy(allFolders, excludeIds);
  }, [allFolders, folder]);

  if (!folder) return null;

  const hasChildren = (folder._count?.children ?? 0) > 0;
  const hasFiles = (folder._count?.files ?? 0) > 0;
  const hasContent = hasChildren || hasFiles;

  const getDisplayValue = () => {
    const selected = folderOptions.find((f) => f.id === targetFolderId);
    return selected?.path || '';
  };

  const performDelete = async (body: any) => {
    setLoading(true);

    const { error } = await fetchApi<Response['/api/user/folders/[id]']>(
      `/api/user/folders/${folder.id}`,
      'DELETE',
      body,
    );

    setLoading(false);

    if (error) {
      notifications.show({
        title: 'Failed to delete folder',
        message: error.error,
        color: 'red',
      });
    } else {
      notifications.show({
        title: 'Folder deleted',
        message: `${folder.name} has been deleted`,
        color: 'green',
      });
      mutateFolder();
      onClose();
    }
  };

  const handleDelete = async () => {
    const body: any = {
      delete: 'folder',
    };

    if (hasContent) {
      body.childrenAction = childrenAction;
      if (childrenAction === 'folder') {
        if (!targetFolderId) {
          notifications.show({
            title: 'No folder selected',
            message: 'Please select a folder to move contents to',
            color: 'red',
          });
          return;
        }
        body.targetFolderId = targetFolderId;
      }
    }

    if (hasContent && (childrenAction === 'cascade' || childrenAction === 'cascade-files')) {
      openWarningModal({
        confirmLabel: `Delete '${folder.name}' and ${childrenAction === 'cascade-files' ? 'all subfolders and files' : 'all subfolders'}?`,
        message: (
          <Stack gap='sm'>
            <Text c='red' fw={500}>
              {childrenAction === 'cascade-files'
                ? 'All subfolders and every file within them will be permanently deleted from storage. This action cannot be undone.'
                : 'All subfolders will be permanently deleted (files will be moved to the root). This action cannot be undone.'}
            </Text>
          </Stack>
        ),
        onConfirm: () => performDelete(body),
      });
      return;
    }

    await performDelete(body);
  };

  return (
    <Modal centered opened={opened} onClose={onClose} title={`Delete "${folder.name}"?`}>
      <Stack gap='sm'>
        <Text size='sm' c='red' fw={500}>
          This action cannot be undone.
        </Text>

        {hasContent && (
          <>
            <Text size='sm'>
              This folder contains {hasFiles && `${folder._count?.files} file(s)`}
              {hasChildren && hasFiles && ' and '}
              {hasChildren && `${folder._count?.children} subfolder(s)`}. What would you like to do with them?
            </Text>

            <Radio.Group value={childrenAction} onChange={(v) => setChildrenAction(v as ChildrenAction)}>
              <Stack gap='xs'>
                <Radio value='root' label='Move contents to root folder' />
                <Radio value='folder' label='Move contents to another folder' />
                <Radio
                  value='cascade'
                  label={
                    <Text size='sm' c='red'>
                      Delete subfolders (files moved to root)
                    </Text>
                  }
                />
                <Radio
                  value='cascade-files'
                  label={
                    <Text size='sm' c='red'>
                      Delete subfolders and their files (cascade delete)
                    </Text>
                  }
                />
              </Stack>
            </Radio.Group>

            {childrenAction === 'folder' && (
              <Combobox
                store={combobox}
                withinPortal={true}
                onOptionSubmit={(value) => {
                  setTargetFolderId(value);
                  setSearch(folderOptions.find((f) => f.id === value)?.path || '');
                  combobox.closeDropdown();
                }}
              >
                <Combobox.Target>
                  <InputBase
                    label='Target Folder'
                    placeholder='Select a folder'
                    rightSection={<Combobox.Chevron />}
                    value={search || getDisplayValue()}
                    onChange={(event) => {
                      combobox.openDropdown();
                      combobox.updateSelectedOptionIndex();
                      setSearch(event.currentTarget.value);
                    }}
                    onClick={() => {
                      combobox.openDropdown();
                      setSearch('');
                    }}
                    onFocus={() => {
                      combobox.openDropdown();
                      setSearch('');
                    }}
                    onBlur={() => {
                      combobox.closeDropdown();
                      setSearch('');
                    }}
                    rightSectionPointerEvents='none'
                    required
                  />
                </Combobox.Target>

                <Combobox.Dropdown>
                  <FolderComboboxOptions folderOptions={folderOptions} searchValue={search} />
                </Combobox.Dropdown>
              </Combobox>
            )}

            {childrenAction === 'cascade' && (
              <Text size='sm' c='red' fw={500}>
                Warning: This will permanently delete all subfolders within this folder. Files will be
                unlinked from their folders and moved to the root.
              </Text>
            )}

            {childrenAction === 'cascade-files' && (
              <Text size='sm' c='red' fw={500}>
                Warning: This will permanently delete all subfolders within this folder, along with every file
                contained in them. The files will be removed from storage and cannot be recovered.
              </Text>
            )}
          </>
        )}

        <Button
          onClick={handleDelete}
          loading={loading}
          leftSection={<IconTrashFilled size='1rem' />}
          color='red'
        >
          Delete Folder
        </Button>
      </Stack>
    </Modal>
  );
}
