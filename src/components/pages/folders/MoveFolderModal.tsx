import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Modal, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconFolderSymlink } from '@tabler/icons-react';
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';

interface MoveFolderModalProps {
  folder: Folder | null;
  opened: boolean;
  onClose: () => void;
}

export default function MoveFolderModal({ folder, opened, onClose }: MoveFolderModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch all folders to build the selection list
  const { data: allFolders } = useSWR<Extract<Response['/api/user/folders'], Folder[]>>(
    opened ? '/api/user/folders?noincl=true' : null,
  );

  // Reset selected parent when folder changes
  React.useEffect(() => {
    if (folder) {
      setSelectedParentId(folder.parentId ?? null);
    }
  }, [folder]);

  if (!folder) {
    return null;
  }

  // Filter out the current folder and its descendants to prevent circular references
  const getDescendantIds = (folderId: string, folders: Folder[]): Set<string> => {
    const descendants = new Set<string>();
    const addDescendants = (parentId: string) => {
      for (const f of folders) {
        if (f.parentId === parentId) {
          descendants.add(f.id);
          addDescendants(f.id);
        }
      }
    };
    addDescendants(folderId);
    return descendants;
  };

  const descendantIds = allFolders ? getDescendantIds(folder.id, allFolders) : new Set<string>();

  const folderOptions = [
    { value: '__root__', label: '/ (Root)' },
    ...(allFolders
      ?.filter((f) => f.id !== folder.id && !descendantIds.has(f.id))
      .map((f) => ({
        value: f.id,
        label: f.name,
      })) ?? []),
  ];

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
    <Modal centered opened={opened} onClose={onClose} title={`Move "${folder.name}"`}>
      <Stack gap='sm'>
        <Text size='sm' c='dimmed'>
          Select a destination folder for this folder.
        </Text>

        <Select
          label='Destination'
          placeholder='Select a folder'
          data={folderOptions}
          value={selectedParentId ?? '__root__'}
          onChange={(value) => setSelectedParentId(value)}
          searchable
        />

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
