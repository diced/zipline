import FolderComboboxOptions from '@/components/folders/FolderComboboxOptions';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { buildFolderHierarchy, getDescendantIds } from '@/lib/folderHierarchy';
import { useFolders } from '@/lib/hooks/useFolders';
import { Button, Combobox, InputBase, Modal, Stack, Text, useCombobox } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconFolderSymlink } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { mutate } from 'swr';

interface MoveFolderModalProps {
  folder: Folder | null;
  opened: boolean;
  onClose: () => void;
}

export default function MoveFolderModal({ folder, opened, onClose }: MoveFolderModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const combobox = useCombobox();

  const { data: allFolders } = useFolders(undefined, opened);

  const folderOptions = useMemo(() => {
    if (!allFolders || !folder) return [];

    const descendantIds = getDescendantIds(folder.id, allFolders);
    // Exclude the folder being moved and its descendants
    const excludeIds = new Set([folder.id, ...descendantIds]);

    return buildFolderHierarchy(allFolders, excludeIds);
  }, [allFolders, folder]);

  const getDisplayValue = () => {
    if (selectedParentId === '__root__' || selectedParentId === null) {
      return '/ (Root)';
    }
    const selected = folderOptions.find((f) => f.id === selectedParentId);
    return selected?.path || '';
  };

  if (!folder) {
    return null;
  }

  const handleMove = async () => {
    setLoading(true);

    const newParentId = selectedParentId === '__root__' ? null : selectedParentId;

    const { error } = await fetchApi<Response['/api/user/folders/[id]']>(
      `/api/user/folders/${folder.id}`,
      'PATCH',
      { parentId: newParentId },
    );

    setLoading(false);

    if (error) {
      notifications.show({
        title: 'Failed to move folder',
        message: error.error,
        color: 'red',
      });
    } else {
      notifications.show({
        title: 'Folder moved',
        message: `${folder.name} has been moved`,
        color: 'green',
      });
      mutate((key: string) => typeof key === 'string' && key.startsWith('/api/user/folders'));
      onClose();
    }
  };

  return (
    <Modal key={folder.id} centered opened={opened} onClose={onClose} title={`Move "${folder.name}"`}>
      <Stack gap='sm'>
        <Text size='sm' c='dimmed'>
          Select a destination folder for this folder.
        </Text>

        <Combobox
          store={combobox}
          withinPortal={true}
          onOptionSubmit={(value) => {
            setSelectedParentId(value);
            setSearch(
              value === '__root__' ? '/ (Root)' : folderOptions.find((f) => f.id === value)?.path || '',
            );
            combobox.closeDropdown();
          }}
        >
          <Combobox.Target>
            <InputBase
              label='Destination'
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
            />
          </Combobox.Target>

          <Combobox.Dropdown>
            <FolderComboboxOptions
              folderOptions={folderOptions}
              searchValue={search}
              additionalOptions={<Combobox.Option value='__root__'>/ (Root)</Combobox.Option>}
            />
          </Combobox.Dropdown>
        </Combobox>

        <Button
          onClick={handleMove}
          loading={loading}
          leftSection={<IconFolderSymlink size='1rem' />}
          variant='outline'
        >
          Move Folder
        </Button>
      </Stack>
    </Modal>
  );
}
