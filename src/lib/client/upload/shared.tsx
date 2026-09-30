import { Response } from '@/lib/api/response';
import { UploadOptionsStore } from '@/lib/client/store/uploadOptions';
import i18n from '@/lib/i18n';
import { ErrorBody } from '@/lib/response';
import { ActionIcon, Anchor, Button, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconClipboardCopy, IconExternalLink } from '@tabler/icons-react';
import { Dispatch, SetStateAction } from 'react';
import SafeTrans from '@/components/SafeTrans';
import { Link } from 'react-router-dom';
import { UploadProgress } from './useProgress';

export type UploadHeadersOptions = {
  options: UploadOptionsStore['options'];
  ephemeral: UploadOptionsStore['ephemeral'];
  folder?: string;
  partials?: number;
};

export type UploadHandlers = {
  setProgress: (o: UploadProgress) => void;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setFiles: Dispatch<SetStateAction<File[]>>;
};

export type UploadContextHandlers = UploadHandlers & {
  clipboard: ReturnType<typeof useClipboard>;
  clearEphemeral: () => void;
};

export function handleUploadResponse<R = Response['/api/upload']>(
  xml: XMLHttpRequest,
): { data: R | null; error: ErrorBody | null } {
  if (xml.status < 200 || xml.status >= 300) {
    try {
      const res = JSON.parse(xml.responseText) as ErrorBody;
      if (res.error) return { data: null, error: res };
    } catch (e) {
      console.error('Error while uploading', e, xml.responseText);

      return {
        data: null,
        error: {
          statusCode: xml.status,
          error: i18n.t('upload:errors.parse', { response: xml.responseText }),
        },
      };
    }
  }

  try {
    const res = JSON.parse(xml.responseText) as R | ErrorBody;

    if ((res as ErrorBody).statusCode) return { data: null, error: res as ErrorBody };

    return { data: res as R, error: null };
  } catch (e) {
    console.error('Failed to parse server response:', e, xml.responseText);

    return {
      data: null,
      error: {
        statusCode: 500,
        error: i18n.t('upload:errors.parse', { response: xml.responseText }),
      },
    };
  }
}

export function applyUploadHeaders(
  req: XMLHttpRequest,
  { options, ephemeral, folder }: UploadHeadersOptions,
) {
  options.deletesAt !== 'default' && req.setRequestHeader('x-zipline-deletes-at', options.deletesAt);
  options.format !== 'default' && req.setRequestHeader('x-zipline-format', options.format);
  options.imageCompressionPercent &&
    req.setRequestHeader('x-zipline-image-compression-percent', options.imageCompressionPercent.toString());
  options.imageCompressionFormat &&
    options.imageCompressionFormat !== 'default' &&
    req.setRequestHeader('x-zipline-image-compression-type', options.imageCompressionFormat);
  options.maxViews && req.setRequestHeader('x-zipline-max-views', options.maxViews.toString());
  options.addOriginalName && req.setRequestHeader('x-zipline-original-name', 'true');
  options.extensionless && req.setRequestHeader('x-zipline-extensionless', 'true');
  options.overrides_returnDomain && req.setRequestHeader('x-zipline-domain', options.overrides_returnDomain);

  ephemeral.password && req.setRequestHeader('x-zipline-password', ephemeral.password);
  ephemeral.filename && req.setRequestHeader('x-zipline-filename', encodeURIComponent(ephemeral.filename));

  if (folder) {
    req.setRequestHeader('x-zipline-folder', folder);
  } else if (ephemeral.folderId) {
    req.setRequestHeader('x-zipline-folder', ephemeral.folderId);
  }
}

export function showUploadModal(
  files: Response['/api/upload']['files'],
  {
    clipboard,
    clearEphemeral,
    showCopyAll = false,
    actionIconColor,
  }: {
    clipboard: ReturnType<typeof useClipboard>;
    clearEphemeral: () => void;
    showCopyAll?: boolean;
    actionIconColor?: string;
  },
) {
  const open = (i: number) => window.open(files[i].url, '_blank');
  const copy = (i: number) => {
    clipboard.copy(files[i].url);

    notifications.show({
      title: i18n.t('upload:modal.notifications.copied.title'),
      message: (
        <Anchor component={Link} to={files[i].url} target='_blank'>
          {files[i].url}
        </Anchor>
      ),
      color: 'blue',
      icon: <IconClipboardCopy size='1rem' />,
    });
  };

  const pendingCount = files.filter((file) => file.pending).length;

  modals.open({
    title: i18n.t('upload:modal.title', { count: files.length }),
    size: 'auto',
    children: (
      <>
        <Stack>
          {files.map((file, i) => (
            <Group key={i} justify='space-between'>
              <Group justify='left' gap='xs'>
                <Anchor
                  component={Link}
                  to={file.url}
                  target='_blank'
                  c={file.pending ? 'dimmed' : undefined}
                >
                  {file.url}
                </Anchor>
              </Group>
              <Group justify='right'>
                <Tooltip label={i18n.t('upload:modal.open')}>
                  <ActionIcon onClick={() => open(i)} variant='filled' color={actionIconColor}>
                    <IconExternalLink size='1rem' />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={i18n.t('upload:modal.copy')}>
                  <ActionIcon onClick={() => copy(i)} variant='filled' color={actionIconColor}>
                    <IconClipboardCopy size='1rem' />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          ))}
        </Stack>
        {pendingCount > 0 && (
          <Text size='sm' c='dimmed' mt='sm'>
            <SafeTrans
              ns='upload'
              i18nKey='modal.pending'
              count={pendingCount}
              components={{
                anchor: (
                  <Anchor
                    component={Link}
                    to='/dashboard/files?pending=true'
                    onClick={() => modals.closeAll()}
                  />
                ),
              }}
            />
          </Text>
        )}
        {showCopyAll && files.length > 1 && (
          <Group justify='right'>
            <Tooltip label={i18n.t('upload:modal.copyAllTooltip')}>
              <Button
                onClick={() => {
                  clipboard.copy(files.map((file) => file.url).join('\n'));
                  notifications.show({
                    title: i18n.t('upload:modal.notifications.copiedAll.title'),
                    message: i18n.t('upload:modal.notifications.copiedAll.message'),
                    color: 'blue',
                    icon: <IconClipboardCopy size='1rem' />,
                  });
                }}
                variant='filled'
                color='blue'
                size='compact-md'
                mt='sm'
                fullWidth
                leftSection={<IconClipboardCopy size='1rem' />}
              >
                {i18n.t('upload:modal.copyAll', { total: files.length })}
              </Button>
            </Tooltip>
          </Group>
        )}
      </>
    ),
  });

  clearEphemeral();
}
