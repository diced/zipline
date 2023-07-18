import { Response } from '@/lib/api/response';
import { ErrorBody } from '@/lib/response';
import { UploadOptionsStore, useUploadOptionsStore } from '@/lib/store/uploadOptions';
import { ActionIcon, Anchor, Group, Stack, Table, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { modals, useModals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconClipboardCopy, IconExternalLink, IconFileUpload, IconFileXFilled } from '@tabler/icons-react';
import Link from 'next/link';

export function filesModal(
  files: Response['/api/upload']['files'],
  {
    clipboard,
    clearEphemeral,
  }: {
    clipboard: ReturnType<typeof useClipboard>;
    clearEphemeral: () => void;
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

  modals.open({
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

  clearEphemeral();
}

export function uploadFiles(
  files: File[],
  {
    setProgress,
    setLoading,
    setFiles,
    clipboard,
    clearEphemeral,
    options,
    ephemeral,
  }: {
    setProgress: (progress: number) => void;
    setLoading: (loading: boolean) => void;
    setFiles: (files: File[]) => void;
    clipboard: ReturnType<typeof useClipboard>;
    clearEphemeral: () => void;
    options: UploadOptionsStore['options'];
    ephemeral: UploadOptionsStore['ephemeral'];
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
      filesModal(res.files, { clipboard, clearEphemeral });
    },
    false
  );

  req.open('POST', '/api/upload');

  options.deletesAt && req.setRequestHeader('x-zipline-deletes-at', options.deletesAt);
  options.format && req.setRequestHeader('x-zipline-format', options.format);
  options.imageCompressionPercent &&
    req.setRequestHeader('x-zipline-image-compression-percent', options.imageCompressionPercent.toString());
  options.maxViews && req.setRequestHeader('x-zipline-max-views', options.maxViews.toString());
  options.addOriginalName && req.setRequestHeader('x-zipline-original-name', 'true');
  options.overrides_returnDomain && req.setRequestHeader('x-zipline-domain', options.overrides_returnDomain);

  ephemeral.password && req.setRequestHeader('x-zipline-password', ephemeral.password);
  ephemeral.filename && req.setRequestHeader('x-zipline-filename', ephemeral.filename);

  req.send(body);
}
