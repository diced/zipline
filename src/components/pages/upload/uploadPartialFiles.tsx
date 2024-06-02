import { useConfig } from '@/components/ConfigProvider';
import { Response } from '@/lib/api/response';
import { randomCharacters } from '@/lib/random';
import { ErrorBody } from '@/lib/response';
import { UploadOptionsStore } from '@/lib/store/uploadOptions';
import { ActionIcon, Anchor, Group, Stack, Table, Text, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { hideNotification, notifications } from '@mantine/notifications';
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
  },
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
      <Table withTableBorder={false} withColumnBorders={false} highlightOnHover horizontalSpacing={'sm'}>
        <Stack>
          {files.map((file, idx) => (
            <Group key={idx} justify='space-between'>
              <Group justify='left'>
                <Anchor component={Link} href={file.url}>
                  {file.url}
                </Anchor>
              </Group>
              <Group justify='right'>
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

export async function uploadPartialFiles(
  files: File[],
  {
    setProgress,
    setLoading,
    setFiles,
    clipboard,
    options,
    ephemeral,
    config,
  }: {
    setProgress: (progress: number) => void;
    setLoading: (loading: boolean) => void;
    setFiles: (files: File[]) => void;
    clipboard: ReturnType<typeof useClipboard>;
    clearEphemeral: () => void;
    options: UploadOptionsStore['options'];
    ephemeral: UploadOptionsStore['ephemeral'];
    config: ReturnType<typeof useConfig>;
  },
) {
  setLoading(true);
  setProgress(0);

  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];
    const identifier = randomCharacters(8);
    const nChunks = Math.ceil(file.size / config.chunks.size);
    const chunks: {
      blob: Blob;
      start: number;
      end: number;
    }[] = [];

    for (let j = 0; j !== nChunks; ++j) {
      const start = j * config.chunks.size;
      const end = Math.min(start + config.chunks.size, file.size);
      chunks.push({
        blob: file.slice(start, end),
        start,
        end,
      });
    }

    notifications.show({
      id: 'upload-partial',
      title: 'Uploading partial file',
      message: `Uploading partial ${i + 1}/${chunks.length}`,
      loading: true,
      autoClose: false,
    });

    let ready = true;
    for (let j = 0; j !== nChunks; ++j) {
      while (!ready) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const body = new FormData();
      body.append('file', chunks[j].blob);

      setLoading(true);
      const req = new XMLHttpRequest();

      req.addEventListener(
        'load',
        () => {
          const res: Response['/api/upload'] = JSON.parse(req.responseText);

          console.log(res);

          if ((res as ErrorBody).message) {
            notifications.update({
              id: 'upload-partial',
              title: 'Error uploading files',
              message: (res as ErrorBody).message,
              color: 'red',
              icon: <IconFileXFilled size='1rem' />,
              autoClose: true,
              loading: false,
            });
            ready = false;
            setFiles([]);
            setProgress(0);
            setLoading(false);
            return;
          }

          setProgress(Math.round(((j + 1) / nChunks) * 100));
          notifications.update({
            id: 'upload-partial',
            title: 'Uploading partial file',
            message: `Uploading partial ${j + 1}/${nChunks} successful`,
            loading: false,
            autoClose: false,
          });

          if (j === chunks.length - 1) {
            notifications.update({
              id: 'upload-partial',
              title: 'Finalizing partial upload',
              message: (
                <Text>
                  The upload has been offloaded and will complete in the background.
                  <br />
                  <Anchor
                    component='span'
                    onClick={() => {
                      hideNotification('upload-partial');
                      clipboard.copy(res.files[0].url);
                      notifications.show({
                        title: 'Copied URL to clipboard',
                        message: (
                          <Anchor component={Link} href={res.files[0].url} target='_blank'>
                            {res.files[0].url}
                          </Anchor>
                        ),
                      });
                    }}
                  >
                    Click here to copy the URL to clipboard while it&apos;s being processed.
                  </Anchor>
                </Text>
              ),
              color: 'green',
              icon: <IconFileUpload size='1rem' />,
              autoClose: true,
              loading: false,
            });

            setFiles([]);
            setProgress(100);
            setLoading(false);

            setTimeout(() => setProgress(0), 1000);
          }

          ready = true;
        },
        false,
      );

      req.open('POST', '/api/upload');
      options.deletesAt !== 'never' && req.setRequestHeader('x-zipline-deletes-at', options.deletesAt);
      options.format !== 'default' && req.setRequestHeader('x-zipline-format', options.format);
      options.imageCompressionPercent &&
        req.setRequestHeader(
          'x-zipline-image-compression-percent',
          options.imageCompressionPercent.toString(),
        );
      options.maxViews && req.setRequestHeader('x-zipline-max-views', options.maxViews.toString());
      options.addOriginalName && req.setRequestHeader('x-zipline-original-name', 'true');
      options.overrides_returnDomain &&
        req.setRequestHeader('x-zipline-domain', options.overrides_returnDomain);

      ephemeral.password && req.setRequestHeader('x-zipline-password', ephemeral.password);
      ephemeral.filename && req.setRequestHeader('x-zipline-filename', ephemeral.filename);

      req.setRequestHeader('x-zipline-p-identifier', identifier);
      req.setRequestHeader('x-zipline-p-filename', file.name);
      req.setRequestHeader('x-zipline-p-lastchunk', j === chunks.length - 1 ? 'true' : 'false');
      req.setRequestHeader('x-zipline-p-content-type', file.type);
      req.setRequestHeader('x-zipline-p-content-length', file.size.toString());
      req.setRequestHeader('content-range', `bytes ${chunks[j].start}-${chunks[j].end}/${file.size}`);

      req.send(body);

      ready = false;
    }
  }
}
