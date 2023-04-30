import {
  ActionIcon,
  Button,
  ColorInput,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDeleteTags, useTags } from 'lib/queries/tags';
import { showNotification } from '@mantine/notifications';
import { IconRefresh, IconTag, IconTags, IconTagsOff } from '@tabler/icons-react';
import { useState } from 'react';
import { colorHash } from 'utils/client';
import useFetch from 'hooks/useFetch';
import { useModals } from '@mantine/modals';
import MutedText from 'components/MutedText';

export function TagCard({ tags, tag }) {
  const deleteTags = useDeleteTags();
  const modals = useModals();

  const deleteTag = () => {
    modals.openConfirmModal({
      zIndex: 1000,
      size: 'auto',
      title: (
        <Title>
          Delete tag <b style={{ color: tag.color }}>{tag.name}</b>?
        </Title>
      ),
      children: `This will remove the tag from ${tag.files.length} file${tag.files.length === 1 ? '' : 's'}`,
      labels: {
        confirm: 'Delete',
        cancel: 'Cancel',
      },
      onCancel() {
        modals.closeAll();
      },
      onConfirm() {
        deleteTags.mutate([tag.id], {
          onSuccess: () => {
            showNotification({
              title: 'Tag deleted',
              message: `Tag ${tag.name} was deleted`,
              color: 'green',
              icon: <IconTags size='1rem' />,
            });
            modals.closeAll();
            tags.refetch();
          },
        });
      },
    });
  };

  return (
    <Paper
      radius='sm'
      sx={(t) => ({
        backgroundColor: tag.color,
        '&:hover': {
          backgroundColor: t.fn.darken(tag.color, 0.1),
        },
        cursor: 'pointer',
      })}
      px='xs'
      onClick={deleteTag}
    >
      <Group position='apart'>
        <Text>
          {tag.name} ({tag.files.length})
        </Text>
      </Group>
    </Paper>
  );
}

export function CreateTagModal({ tags, open, onClose }) {
  const [color, setColor] = useState('');
  const [name, setName] = useState('');

  const [colorError, setColorError] = useState('');
  const [nameError, setNameError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setNameError('');
    setColorError('');

    const n = name.trim();
    const c = color.trim();

    if (n.length === 0 && c.length === 0) {
      setNameError('Name is required');
      setColorError('Color is required');
      return;
    } else if (n.length === 0) {
      setNameError('Name is required');
      setColorError('');
      return;
    } else if (c.length === 0) {
      setNameError('');
      setColorError('Color is required');
      return;
    }

    const data = await useFetch('/api/user/tags', 'POST', {
      tags: [
        {
          name: n,
          color: c,
        },
      ],
    });

    if (!data.error) {
      showNotification({
        title: 'Tag created',
        message: (
          <>
            Tag <b style={{ color: color }}>{name}</b> was created
          </>
        ),
        color: 'green',
        icon: <IconTags size='1rem' />,
      });
      tags.refetch();
      onClose();
    } else {
      showNotification({
        title: 'Error creating tag',
        message: data.error,
        color: 'red',
        icon: <IconTagsOff size='1rem' />,
      });
    }
  };

  return (
    <Modal title={<Title>Create Tag</Title>} size='xs' opened={open} onClose={onClose} zIndex={300}>
      <form onSubmit={onSubmit}>
        <TextInput
          icon={<IconTag size='1rem' />}
          label='Name'
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={nameError}
        />
        <ColorInput
          dropdownZIndex={301}
          label='Color'
          value={color}
          onChange={setColor}
          error={colorError}
          rightSection={
            <Tooltip label='Generate color from name'>
              <ActionIcon variant='subtle' onClick={() => setColor(colorHash(name))} color='primary'>
                <IconRefresh size='1rem' />
              </ActionIcon>
            </Tooltip>
          }
        />

        <Button type='submit' fullWidth variant='outline' my='sm'>
          Create Tag
        </Button>
      </form>
    </Modal>
  );
}

export default function TagsModal({ open, onClose }) {
  const tags = useTags();

  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <CreateTagModal tags={tags} open={createOpen} onClose={() => setCreateOpen(false)} />
      <Modal title={<Title>Tags</Title>} size='auto' opened={open} onClose={onClose}>
        <MutedText size='sm'>Click on a tag to delete it.</MutedText>
        <Stack>
          {tags.isSuccess && tags.data.map((tag) => <TagCard key={tag.id} tags={tags} tag={tag} />)}
        </Stack>

        <Button mt='xl' variant='outline' onClick={() => setCreateOpen(true)} fullWidth compact>
          Create Tag
        </Button>
      </Modal>
    </>
  );
}
