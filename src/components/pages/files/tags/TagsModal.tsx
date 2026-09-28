import { mutateFiles } from '@/components/file/actions';
import { Response } from '@/lib/api/response';
import { Tag } from '@/lib/db/models/tag';
import { fetchApi } from '@/lib/fetchApi';
import { ActionIcon, Group, Modal, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconPencil, IconPlus, IconTagOff, IconTrashFilled } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { DashboardFilesModals, DashboardFilesModalsUpdate } from '..';
import CreateTagModal from './CreateTagModal';
import EditTagModal from './EditTagModal';
import TagPill from './TagPill';

export default function TagsModals({
  modals,
  setModals,
}: {
  modals: DashboardFilesModals;
  setModals: DashboardFilesModalsUpdate;
}) {
  const { t } = useTranslation(['files', 'common']);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  const { data: tags, mutate } = useSWR<Extract<Tag[], Response['/api/user/tags']>>('/api/user/tags');

  const handleDelete = async (tag: Tag) => {
    const { error } = await fetchApi<Response['/api/user/tags/[id]']>(`/api/user/tags/${tag.id}`, 'DELETE');

    if (error) {
      showNotification({
        title: t('common:status.error'),
        message: t('tags.notifications.deleteFailed', { error: error.error }),
        color: 'red',
        icon: <IconTagOff size='1rem' />,
      });
    } else {
      showNotification({
        title: t('tags.notifications.deleted'),
        message: t('tags.notifications.deletedMessage', { name: tag.name }),
        color: 'green',
        icon: <IconTrashFilled size='1rem' />,
      });
    }

    mutate();
    mutateFiles();
  };

  return (
    <>
      <CreateTagModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      <EditTagModal open={!!selectedTag} onClose={() => setSelectedTag(null)} tag={selectedTag} />

      <Modal
        opened={modals.tags}
        onClose={() => setModals({ tags: false })}
        title={
          <Group>
            <Title>{t('tags.title')}</Title>
            <ActionIcon variant='outline' onClick={() => setCreateModalOpen(true)}>
              <IconPlus size='1rem' />
            </ActionIcon>
          </Group>
        }
      >
        <Stack gap='xs'>
          {tags
            ?.sort((a, b) => b.files!.length - a.files!.length)
            .map((tag) => (
              <Group justify='space-between' key={tag.id}>
                <Group>
                  <TagPill tag={tag} />

                  <Text size='sm' c='dimmed'>
                    {t('tags.fileCount', { count: tag.files!.length })}
                  </Text>
                </Group>

                <Group>
                  <Tooltip label={t('tags.edit')}>
                    <ActionIcon variant='outline' onClick={() => setSelectedTag(tag)}>
                      <IconPencil size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label={t('tags.delete')}>
                    <ActionIcon variant='outline' color='red' onClick={() => handleDelete(tag)}>
                      <IconTrashFilled size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            ))}

          {tags?.length === 0 && (
            <Paper withBorder px='sm' py='xs'>
              {t('tags.empty')}
            </Paper>
          )}
        </Stack>
      </Modal>
    </>
  );
}
