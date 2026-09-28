import FolderComboboxOptions from '@/components/folders/FolderComboboxOptions';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { fetchApi } from '@/lib/fetchApi';
import { buildFolderHierarchy, getDescendantIds } from '@/lib/folderHierarchy';
import { useFolders } from '@/lib/client/hooks/useFolders';
import { Button, Combobox, InputBase, Modal, Stack, Text, useCombobox } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconFolderSymlink } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mutateFolder } from '../actions';

export default function MoveFolderModal({
  folder,
  opened,
  onClose,
}: {
  folder: Folder | null;
  opened: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('folders');
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
      return t('move.root');
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
        title: t('move.notifications.failed'),
        message: error.error,
        color: 'red',
      });
    } else {
      notifications.show({
        title: t('move.notifications.moved'),
        message: t('move.notifications.movedMessage', { name: folder.name }),
        color: 'green',
      });
      mutateFolder();
      onClose();
    }
  };

  return (
    <Modal
      key={folder.id}
      centered
      opened={opened}
      onClose={onClose}
      title={t('move.title', { name: folder.name })}
    >
      <Stack gap='sm'>
        <Text size='sm' c='dimmed'>
          {t('move.description')}
        </Text>

        <Combobox
          store={combobox}
          withinPortal={true}
          onOptionSubmit={(value) => {
            setSelectedParentId(value);
            setSearch(
              value === '__root__' ? t('move.root') : folderOptions.find((f) => f.id === value)?.path || '',
            );
            combobox.closeDropdown();
          }}
        >
          <Combobox.Target>
            <InputBase
              label={t('move.destination.label')}
              placeholder={t('move.destination.placeholder')}
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
              additionalOptions={<Combobox.Option value='__root__'>{t('move.root')}</Combobox.Option>}
            />
          </Combobox.Dropdown>
        </Combobox>

        <Button
          onClick={handleMove}
          loading={loading}
          leftSection={<IconFolderSymlink size='1rem' />}
          variant='outline'
        >
          {t('move.submit')}
        </Button>
      </Stack>
    </Modal>
  );
}
