import { ActionIcon, Avatar, Card, Group, SimpleGrid, Skeleton, Stack, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { DeleteIcon, FileIcon, PlusIcon, LockIcon, UnlockIcon, LinkIcon, CopyIcon } from 'components/icons';
import Link from 'components/Link';
import MutedText from 'components/MutedText';
import useFetch from 'hooks/useFetch';
import { useFolders } from 'lib/queries/folders';
import { relativeTime } from 'lib/utils/client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import CreateFolderModal from './CreateFolderModal';
import ViewFolderFilesModal from './ViewFolderFilesModal';

export default function Folders({ disableMediaPreview, exifEnabled }) {
  const folders = useFolders();
  const [createOpen, setCreateOpen] = useState(false);
  const [createWithFile, setCreateWithFile] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState(null);

  const modals = useModals();
  const clipboard = useClipboard();
  const router = useRouter();

  useEffect(() => {
    if (router.query.create) {
      setCreateOpen(true);
      setCreateWithFile(router.query.create);
    }
  }, []);

  const deleteFolder = (folder) => {
    modals.openConfirmModal({
      title: <Title>Delete folder {folder.name}?</Title>,
      children:
        'Are you sure you want to delete this folder? All files within the folder will still exist, but will no longer be in a folder.',
      labels: {
        confirm: 'Delete',
        cancel: 'Cancel',
      },
      onConfirm: async () => {
        const res = await useFetch(`/api/user/folders/${folder.id}`, 'DELETE', {
          deleteFolder: true,
        });

        if (!res.error) {
          showNotification({
            title: 'Deleted folder',
            message: `Deleted folder ${folder.name}`,
            color: 'green',
            icon: <DeleteIcon />,
          });
          folders.refetch();
        } else {
          showNotification({
            title: 'Failed to delete folder',
            message: res.error,
            color: 'red',
            icon: <DeleteIcon />,
          });
          folders.refetch();
        }
      },
    });
  };

  const makePublic = async (folder) => {
    const res = await useFetch(`/api/user/folders/${folder.id}`, 'PATCH', {
      public: folder.public ? false : true,
    });

    if (!res.error) {
      showNotification({
        title: 'Made folder public',
        message: `Made folder ${folder.name} ${folder.public ? 'private' : 'public'}`,
        color: 'green',
        icon: <UnlockIcon />,
      });
      folders.refetch();
    } else {
      showNotification({
        title: 'Failed to make folder public/private',
        message: res.error,
        color: 'red',
        icon: <UnlockIcon />,
      });
      folders.refetch();
    }
  };

  return (
    <>
      <CreateFolderModal
        open={createOpen}
        setOpen={setCreateOpen}
        createWithFile={createWithFile}
        updateFolders={folders.refetch}
      />
      <ViewFolderFilesModal
        open={viewOpen}
        setOpen={setViewOpen}
        folderId={activeFolderId}
        disableMediaPreview={disableMediaPreview}
        exifEnabled={exifEnabled}
      />

      <Group mb='md'>
        <Title>Folders</Title>
        <ActionIcon onClick={() => setCreateOpen(!createOpen)} component='a' variant='filled' color='primary'>
          <PlusIcon />
        </ActionIcon>
      </Group>

      <SimpleGrid cols={3} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
        {folders.isSuccess
          ? folders.data.length
            ? folders.data.map((folder) => (
                <Card key={folder.id}>
                  <Group position='apart'>
                    <Group position='left'>
                      <Avatar size='lg' color='primary'>
                        {folder.id}
                      </Avatar>
                      <Stack spacing={0}>
                        <Title>{folder.name}</Title>
                        <MutedText size='sm'>ID: {folder.id}</MutedText>
                        <MutedText size='sm'>Public: {folder.public ? 'Yes' : 'No'}</MutedText>
                        <Tooltip label={new Date(folder.createdAt).toLocaleString()}>
                          <div>
                            <MutedText size='sm'>
                              Created {relativeTime(new Date(folder.createdAt))}
                            </MutedText>
                          </div>
                        </Tooltip>
                        <Tooltip label={new Date(folder.updatedAt).toLocaleString()}>
                          <div>
                            <MutedText size='sm'>
                              Last updated {relativeTime(new Date(folder.updatedAt))}
                            </MutedText>
                          </div>
                        </Tooltip>
                      </Stack>
                    </Group>
                    <Group>
                      <Tooltip label={folder.public ? 'Make folder private' : 'Make folder public'}>
                        <ActionIcon
                          aria-label={folder.public ? 'make private' : 'make public'}
                          onClick={() => makePublic(folder)}
                        >
                          {folder.public ? <LockIcon /> : <UnlockIcon />}
                        </ActionIcon>
                      </Tooltip>
                      <ActionIcon
                        aria-label='view files'
                        onClick={() => {
                          setViewOpen(!viewOpen);
                          setActiveFolderId(folder.id);
                        }}
                      >
                        <FileIcon />
                      </ActionIcon>
                      <ActionIcon
                        aria-label='copy link'
                        onClick={() => {
                          clipboard.copy(`${window.location.origin}/folder/${folder.id}`);
                          if (!navigator.clipboard)
                            showNotification({
                              title: 'Unable to copy to clipboard',
                              message: 'Zipline is unable to copy to clipboard due to security reasons.',
                              color: 'red',
                            });
                          else
                            showNotification({
                              title: 'Copied folder link',
                              message: (
                                <>
                                  Copied <Link href={`/folder/${folder.id}`}>folder link</Link> to clipboard
                                </>
                              ),
                              color: 'green',
                              icon: <CopyIcon />,
                            });
                        }}
                      >
                        <LinkIcon />
                      </ActionIcon>
                      <ActionIcon aria-label='delete' onClick={() => deleteFolder(folder)}>
                        <DeleteIcon />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Card>
              ))
            : null
          : [1, 2, 3, 4].map((x) => (
              <div key={x}>
                <Skeleton width='100%' height={220} sx={{ borderRadius: 1 }} />
              </div>
            ))}
      </SimpleGrid>
    </>
  );
}
