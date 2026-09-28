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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('folders');
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
        title: t('delete.notifications.failed'),
        message: error.error,
        color: 'red',
      });
    } else {
      notifications.show({
        title: t('delete.notifications.deleted'),
        message: t('delete.notifications.deletedMessage', { name: folder.name }),
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
            title: t('delete.notifications.noTarget'),
            message: t('delete.notifications.noTargetMessage'),
            color: 'red',
          });
          return;
        }
        body.targetFolderId = targetFolderId;
      }
    }

    if (hasContent && (childrenAction === 'cascade' || childrenAction === 'cascade-files')) {
      openWarningModal({
        confirmLabel:
          childrenAction === 'cascade-files'
            ? t('delete.confirmCascadeFiles', { name: folder.name })
            : t('delete.confirmCascade', { name: folder.name }),
        message: (
          <Stack gap='sm'>
            <Text c='red' fw={500}>
              {childrenAction === 'cascade-files' ? t('delete.modalCascadeFiles') : t('delete.modalCascade')}
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
    <Modal centered opened={opened} onClose={onClose} title={t('delete.title', { name: folder.name })}>
      <Stack gap='sm'>
        <Text size='sm' c='red' fw={500}>
          {t('delete.cannotUndo')}
        </Text>

        {hasContent && (
          <>
            <Text size='sm'>
              {hasFiles && hasChildren
                ? t('delete.containsFilesAndSubfolders', {
                    files: folder._count?.files,
                    subfolders: folder._count?.children,
                  })
                : hasFiles
                  ? t('delete.containsFiles', { files: folder._count?.files })
                  : t('delete.containsSubfolders', { subfolders: folder._count?.children })}
            </Text>

            <Radio.Group value={childrenAction} onChange={(v) => setChildrenAction(v as ChildrenAction)}>
              <Stack gap='xs'>
                <Radio value='root' label={t('delete.options.root')} />
                <Radio value='folder' label={t('delete.options.folder')} />
                <Radio
                  value='cascade'
                  label={
                    <Text size='sm' c='red'>
                      {t('delete.options.cascade')}
                    </Text>
                  }
                />
                <Radio
                  value='cascade-files'
                  label={
                    <Text size='sm' c='red'>
                      {t('delete.options.cascadeFiles')}
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
                    label={t('delete.target.label')}
                    placeholder={t('delete.target.placeholder')}
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
                {t('delete.warningCascade')}
              </Text>
            )}

            {childrenAction === 'cascade-files' && (
              <Text size='sm' c='red' fw={500}>
                {t('delete.warningCascadeFiles')}
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
          {t('delete.submit')}
        </Button>
      </Stack>
    </Modal>
  );
}
