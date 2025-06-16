import { Button, Group, Modal, Select, Stack, Text, Loader, Center } from '@mantine/core';
import { IconFolder, IconFolderPlus } from '@tabler/icons-react';
import { useState } from 'react';
import useSWR from 'swr';

interface Folder {
  id: string;
  name: string;
  createdAt: string;
  public: boolean;
  allowUploads: boolean;
  _count: {
    files: number;
  };
}

interface FolderSelectModalProps {
  opened: boolean;
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
  loading?: boolean;
  selectedCount: number;
}

export default function FolderSelectModal({
  opened,
  onClose,
  onSelect,
  loading = false,
  selectedCount,
}: FolderSelectModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const { data: folders, isLoading } = useSWR<Folder[]>('/api/user/folders');

  const handleSubmit = () => {
    onSelect(selectedFolderId);
  };
  const folderOptions = [
    { value: '', label: 'No Folder (Root)', icon: <IconFolder size='1rem' /> },
    ...(folders || []).map((folder) => ({
      value: folder.id,
      label: `${folder.name} (${folder._count?.files ?? 0} files)`,
      icon: <IconFolder size='1rem' />,
    })),
  ];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap='xs'>
          <IconFolderPlus size='1.2rem' />
          <Text fw={500}>Move Files to Folder</Text>
        </Group>
      }
      size='md'
    >
      <Stack gap='md'>
        <Text size='sm' c='dimmed'>
          Select a destination folder for {selectedCount} selected file{selectedCount !== 1 ? 's' : ''}.
        </Text>

        {isLoading ? (
          <Center p='xl'>
            <Loader size='sm' />
          </Center>
        ) : (
          <Select
            label='Destination Folder'
            placeholder='Select a folder or choose "No Folder" for root'
            data={folderOptions}
            value={selectedFolderId || ''}
            onChange={(value) => setSelectedFolderId(value || null)}
            leftSection={<IconFolder size='1rem' />}
            searchable
            clearable
            maxDropdownHeight={200}
          />
        )}

        <Group justify='flex-end' gap='sm'>
          <Button variant='subtle' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={isLoading || loading}
            leftSection={<IconFolderPlus size='1rem' />}
          >
            Move Files
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
