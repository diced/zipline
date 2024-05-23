import RelativeDate from '@/components/RelativeDate';
import { Folder } from '@/lib/db/models/folder';
import { ActionIcon, Card, Group, Menu, Stack, Text } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCopy, IconDots, IconFiles, IconLock, IconLockOpen, IconTrashFilled } from '@tabler/icons-react';
import { useState } from 'react';
import ViewFilesModal from './ViewFilesModal';
import { copyFolderUrl, deleteFolder, editFolderVisibility } from './actions';

export default function FolderCard({ folder }: { folder: Folder }) {
  const clipboard = useClipboard();

  const [open, setOpen] = useState(false);

  return (
    <>
      <ViewFilesModal opened={open} onClose={() => setOpen(false)} folder={folder} />

      <Card withBorder shadow='sm' radius='sm'>
        <Card.Section withBorder inheritPadding py='xs'>
          <Group justify='space-between'>
            <Text fw={400}>{folder.name}</Text>

            <Menu withinPortal position='bottom-end' shadow='sm'>
              <Group gap={2}>
                <Menu.Target>
                  <ActionIcon variant='transparent'>
                    <IconDots size='1rem' />
                  </ActionIcon>
                </Menu.Target>
              </Group>

              <Menu.Dropdown>
                <Menu.Item leftSection={<IconFiles size='1rem' />} onClick={() => setOpen(true)}>
                  View Files
                </Menu.Item>
                <Menu.Item
                  leftSection={folder.public ? <IconLock size='1rem' /> : <IconLockOpen size='1rem' />}
                  onClick={() => editFolderVisibility(folder, !folder.public)}
                >
                  {folder.public ? 'Make Private' : 'Make Public'}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconCopy size='1rem' />}
                  disabled={!folder.public}
                  onClick={() => copyFolderUrl(folder, clipboard)}
                >
                  Copy URL
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrashFilled size='1rem' />}
                  color='red'
                  onClick={() => deleteFolder(folder)}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Card.Section>

        <Card.Section inheritPadding py='xs'>
          <Stack gap={1}>
            <Text size='xs' c='dimmed'>
              <b>Created:</b> <RelativeDate date={folder.createdAt} />
            </Text>
            <Text size='xs' c='dimmed'>
              <b>Updated:</b> <RelativeDate date={folder.updatedAt} />
            </Text>
            <Text size='xs' c='dimmed'>
              <b>Public:</b> {folder.public ? 'Yes' : 'No'}
            </Text>
            <Text size='xs' c='dimmed'>
              <b>Files:</b> {folder.files!.length}
            </Text>
          </Stack>
        </Card.Section>
      </Card>
    </>
  );
}
