import RelativeDate from '@/components/RelativeDate';
import { Folder } from '@/lib/db/models/folder';
import { ActionIcon, Anchor, Card, Group, Menu, Stack, Text } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  IconCopy,
  IconDots,
  IconFileZip,
  IconFolder,
  IconFolderOpen,
  IconFolderSymlink,
  IconLock,
  IconLockOpen,
  IconPencil,
  IconShare,
  IconShareOff,
  IconTrashFilled,
} from '@tabler/icons-react';
import { useState } from 'react';
import { copyFolderUrl, editFolderUploads, editFolderVisibility } from './actions';
import DeleteFolderModal from './modals/DeleteFolderModal';
import EditFolderNameModal from './modals/EditFolderNameModal';
import MoveFolderModal from './modals/MoveFolderModal';
import ViewFilesModal from './modals/ViewFilesModal';
import { withoutPropagation } from './views/FolderTableView';

export default function FolderCard({
  folder,
  onNavigate,
}: {
  folder: Folder;
  onNavigate?: (folderId: string | null) => void;
}) {
  const clipboard = useClipboard();

  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const childrenCount = folder._count?.children ?? 0;
  const filesCount = folder._count?.files ?? folder.files?.length ?? 0;

  return (
    <>
      <ViewFilesModal opened={viewOpen} onClose={() => setViewOpen(false)} folder={folder} />
      <EditFolderNameModal folder={folder} opened={editOpen} onClose={() => setEditOpen(false)} />
      <MoveFolderModal folder={folder} opened={moveOpen} onClose={() => setMoveOpen(false)} />
      <DeleteFolderModal opened={deleteOpen} folder={folder} onClose={() => setDeleteOpen(false)} />

      <Card withBorder shadow='sm' style={{ cursor: onNavigate ? 'pointer' : 'default' }}>
        <Card.Section withBorder inheritPadding py='xs' onClick={() => onNavigate?.(folder.id)}>
          <Group justify='space-between'>
            <Group gap='xs'>
              <IconFolder size='1rem' />
              <Text fw={400}>
                {folder.public ? (
                  <Anchor href={`/folder/${folder.id}`} target='_blank' onClick={(e) => e.stopPropagation()}>
                    {folder.name}
                  </Anchor>
                ) : (
                  folder.name
                )}
              </Text>
            </Group>

            <Menu withinPortal position='bottom-end' shadow='sm'>
              <Group gap={2}>
                <Menu.Target>
                  <ActionIcon variant='transparent' onClick={(e) => e.stopPropagation()}>
                    <IconDots size='1rem' />
                  </ActionIcon>
                </Menu.Target>
              </Group>

              <Menu.Dropdown>
                {onNavigate && (
                  <Menu.Item
                    leftSection={<IconFolderOpen size='1rem' />}
                    onClick={() => onNavigate(folder.id)}
                  >
                    Open Folder
                  </Menu.Item>
                )}
                <Menu.Item
                  leftSection={<IconFolderSymlink size='1rem' />}
                  onClick={withoutPropagation(() => setMoveOpen(true))}
                >
                  Move Folder
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFileZip size='1rem' />}
                  component='a'
                  href={`/api/user/folders/${folder.id}/export`}
                  target='_blank'
                  onClick={withoutPropagation(() => {})}
                >
                  Export as ZIP
                </Menu.Item>
                <Menu.Item
                  leftSection={folder.public ? <IconLock size='1rem' /> : <IconLockOpen size='1rem' />}
                  onClick={withoutPropagation(() => editFolderVisibility(folder, !folder.public))}
                >
                  {folder.public ? 'Make Private' : 'Make Public'}
                </Menu.Item>
                <Menu.Item
                  leftSection={folder.public ? <IconShareOff size='1rem' /> : <IconShare size='1rem' />}
                  onClick={withoutPropagation(() => editFolderUploads(folder, !folder.allowUploads))}
                >
                  {folder.allowUploads ? 'Disallow anonymous uploads' : 'Allow anonymous uploads'}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconPencil size='1rem' />}
                  onClick={withoutPropagation(() => setEditOpen(true))}
                >
                  Edit Name
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconCopy size='1rem' />}
                  disabled={!folder.public}
                  onClick={withoutPropagation(() => copyFolderUrl(folder, clipboard))}
                >
                  Copy URL
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrashFilled size='1rem' />}
                  color='red'
                  onClick={withoutPropagation(() => setDeleteOpen(true))}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Card.Section>

        <Card.Section inheritPadding py='xs' onClick={() => onNavigate?.(folder.id)}>
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
              <b>Files:</b> {filesCount}
            </Text>
            {childrenCount > 0 && (
              <Text size='xs' c='dimmed'>
                <b>Subfolders:</b> {childrenCount}
              </Text>
            )}
          </Stack>
        </Card.Section>
      </Card>
    </>
  );
}
