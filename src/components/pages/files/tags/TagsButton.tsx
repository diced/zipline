import { Response } from '@/lib/api/response';
import { Tag } from '@/lib/db/models/tag';
import { ActionIcon, Group, Modal, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconPencil, IconPlus, IconTagOff, IconTags, IconTrashFilled } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import TagPill from './TagPill';
import { fetchApi } from '@/lib/fetchApi';
import { showNotification } from '@mantine/notifications';
import CreateTagModal from './CreateTagModal';
import EditTagModal from './EditTagModal';

export default function TagsButton() {
  const router = useRouter();

  const [open, setOpen] = useState(router.query.tags !== undefined);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  const { data: tags, mutate } = useSWR<Extract<Tag[], Response['/api/user/tags']>>('/api/user/tags');

  const handleDelete = async (tag: Tag) => {
    const { error } = await fetchApi<Response['/api/user/tags/[id]']>(`/api/user/tags/${tag.id}`, 'DELETE');

    if (error) {
      showNotification({
        title: 'Error',
        message: `Failed to delete tag: ${error.message}`,
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
  };

  useEffect(() => {
    if (open) {
      router.push({ query: { ...router.query, tags: 'true' } }, undefined, { shallow: true });
    } else {
      delete router.query.tags;
      router.push({ query: router.query }, undefined, { shallow: true });
    }
  }, [open]);

  return (
    <>
      <CreateTagModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      <EditTagModal open={!!selectedTag} onClose={() => setSelectedTag(null)} tag={selectedTag} />

      <Modal
        opened={open}
        onClose={() => setOpen(false)}
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
                    {tag.files!.length} files
                  </Text>
                </Group>

                <Group>
                  <ActionIcon variant='outline' onClick={() => setSelectedTag(tag)}>
                    <IconPencil size='1rem' />
                  </ActionIcon>

                  <ActionIcon variant='outline' color='red' onClick={() => handleDelete(tag)}>
                    <IconTrashFilled size='1rem' />
                  </ActionIcon>
                </Group>
              </Group>
            ))}
        </Stack>
      </Modal>

      <Tooltip label='View tags'>
        <ActionIcon variant='outline' onClick={() => setOpen(true)}>
          <IconTags size='1rem' />
        </ActionIcon>
      </Tooltip>
    </>
  );
}
