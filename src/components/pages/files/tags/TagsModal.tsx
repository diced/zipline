import { mutateFiles } from '@/components/file/actions';
import { Response } from '@/lib/api/response';
import { Tag } from '@/lib/db/models/tag';
import { fetchApi } from '@/lib/fetchApi';
import { ActionIcon, Group, Modal, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconPencil, IconPlus, IconTagOff, IconTrashFilled } from '@tabler/icons-react';
import { useState } from 'react';
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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  const { data: tags, mutate } = useSWR<Extract<Tag[], Response['/api/user/tags']>>('/api/user/tags');

  const handleDelete = async (tag: Tag) => {
    const { error } = await fetchApi<Response['/api/user/tags/[id]']>(`/api/user/tags/${tag.id}`, 'DELETE');

    if (error) {
      showNotification({
        title: 'Error',
        message: `Failed to delete tag: ${error.error}`,
        color: 'red',
        icon: <IconTagOff size='1rem' />,
      });
    } else {
      showNotification({
        title: 'Deleted tag',
        message: `Deleted tag ${tag.name}`,
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
            <Title>Tags</Title>
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
                    {tag.files!.length} file{tag.files!.length === 1 ? '' : 's'}
                  </Text>
                </Group>

                <Group>
                  <Tooltip label='Edit tag'>
                    <ActionIcon variant='outline' onClick={() => setSelectedTag(tag)}>
                      <IconPencil size='1rem' />
                    </ActionIcon>
                  </Tooltip>

                  <Tooltip label='Delete tag'>
                    <ActionIcon variant='outline' color='red' onClick={() => handleDelete(tag)}>
                      <IconTrashFilled size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            ))}

          {tags?.length === 0 && (
            <Paper withBorder px='sm' py='xs'>
              No tags. Create one by clicking the plus icon.
            </Paper>
          )}
        </Stack>
      </Modal>
    </>
  );
}
