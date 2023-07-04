import { Response } from '@/lib/api/response';
import { ErrorBody } from '@/lib/response';
import { ActionIcon, Anchor, Group, Stack, Table, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconClipboardCopy, IconExternalLink, IconFileUpload, IconFileXFilled } from '@tabler/icons-react';
import Link from 'next/link';

export function filesModal(
  files: Response['/api/upload']['files'],
  {
    modals,
    clipboard,
  }: {
    modals: ReturnType<typeof useModals>;
    clipboard: ReturnType<typeof useClipboard>;
  }
) {
  const open = (idx: number) => window.open(files[idx].url, '_blank');
  const copy = (idx: number) => {
    clipboard.copy(files[idx].url);
    notifications.show({
      title: 'Copied URL to clipboard',
      message: (
        <Anchor component={Link} href={files[idx].url} target='_blank'>
          {files[idx].url}
        </Anchor>
      ),
      color: 'blue',
      icon: <IconClipboardCopy size='1rem' />,
    });
  };

  modals.openModal({
    title: <Title>Uploaded Files</Title>,
    size: 'auto',
    children: (
      <Table withBorder={false} withColumnBorders={false} highlightOnHover horizontalSpacing={'sm'}>
        <Stack>
          {files.map((file, idx) => (
            <Group key={idx} position='apart'>
              <Group position='left'>
                <Anchor component={Link} href={file.url}>
                  {file.url}
                </Anchor>
              </Group>
              <Group position='right'>
                <Tooltip label='Open link in a new tab'>
                  <ActionIcon onClick={() => open(idx)} variant='filled' color='primary'>
                    <IconExternalLink size='1rem' />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label='Copy link to clipboard'>
                  <ActionIcon onClick={() => copy(idx)} variant='filled' color='primary'>
                    <IconClipboardCopy size='1rem' />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          ))}
        </Stack>
      </Table>
    ),
  });
}

export function uploadFiles(
  files: File[],
  {
    setProgress,
    setLoading,
    setFiles,
    modals,
    clipboard,
  }: {
    setProgress: (progress: number) => void;
    setLoading: (loading: boolean) => void;
    setFiles: (files: File[]) => void;
    modals: ReturnType<typeof useModals>;
    clipboard: ReturnType<typeof useClipboard>;
  }
) {
  setLoading(true);
  setProgress(0);
  const body = new FormData();

  for (let i = 0; i !== files.length; ++i) {
    body.append('file', files[i]);
  }

  notifications.show({
    id: 'upload',
    title: 'Uploading files',
    message: `Uploading ${files.length} file${files.length === 1 ? '' : 's'}`,
    loading: true,
    autoClose: false,
  });

  const req = new XMLHttpRequest();

  req.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      setProgress(Math.round((e.loaded / e.total) * 100));
    }
  });

  req.addEventListener(
    'load',
    (e) => {
      const res: Response['/api/upload'] = JSON.parse(req.responseText);
      setLoading(false);
      setProgress(0);

      if ((res as ErrorBody).error) {
        notifications.update({
          id: 'upload',
          title: 'Error uploading files',
          message: (res as ErrorBody).error,
          color: 'red',
          icon: <IconFileXFilled size='1rem' />,
          autoClose: true,
        });

        return;
      }

      notifications.update({
        id: 'upload',
        title: 'Uploaded files',
        message: `Uploaded ${files.length} file${files.length === 1 ? '' : 's'}`,
        color: 'green',
        icon: <IconFileUpload size='1rem' />,
        autoClose: true,
      });
      setFiles([]);
      filesModal(res.files, { modals, clipboard });
    },
    false
  );

  req.open('POST', '/api/upload');
  req.send(body);
}
