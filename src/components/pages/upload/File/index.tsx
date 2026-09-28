import { useConfig } from '@/components/ConfigProvider';
import { bytes } from '@/lib/bytes';
import { useUploadOptionsStore } from '@/lib/client/store/uploadOptions';
import { uploadFiles } from '@/lib/client/upload/files';
import { uploadPartialFiles } from '@/lib/client/upload/partial';
import { showUploadModal } from '@/lib/client/upload/shared';
import { useProgress } from '@/lib/client/upload/useProgress';
import { humanizeDuration } from '@/lib/relativeTime';
import {
  Button,
  Collapse,
  Grid,
  Group,
  Kbd,
  Paper,
  Progress,
  Text,
  Title,
  Tooltip,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { useClipboard, useColorScheme } from '@mantine/hooks';
import { notifications, showNotification } from '@mantine/notifications';
import { IconDeviceSdCard, IconFiles, IconTrashFilled, IconUpload, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import UploadOptionsButton from '../UploadOptionsButton';
import DropzoneFile from './DropzoneFile';

const initialVisible = 24;

export default function UploadFile({ title, folder }: { title?: string; folder?: string }) {
  const { t } = useTranslation('upload');
  const theme = useMantineTheme();
  const colorScheme = useColorScheme();
  const clipboard = useClipboard();
  const config = useConfig();

  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh');

  const [options, ephemeral, clearEphemeral] = useUploadOptionsStore(
    useShallow((state) => [state.options, state.ephemeral, state.clearEphemeral]),
  );

  const [files, setFiles] = useState<File[]>([]);
  const [visibleCount, setVisibleCount] = useState(initialVisible);
  const [progress, setProgress] = useProgress();
  const [dropLoading, setLoading] = useState(false);

  const visibleFiles = files.slice(0, visibleCount);
  const hiddenFiles = Math.max(0, files.length - visibleFiles.length);

  const aggSize = useCallback(() => files.reduce((acc, file) => acc + file.size, 0), [files]);

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      for (let i = 0; i !== e.clipboardData.items.length; ++i) {
        if (!e.clipboardData.items[i].type.startsWith('image')) return;
        const blob = e.clipboardData.items[i].getAsFile();
        if (!blob) return;
        setFiles((prev) => [...prev, blob]);
        setVisibleCount(initialVisible);
        showNotification({
          message: t('file.notifications.pasted.message', { name: blob.name }),
          color: 'blue',
        });
      }
    },
    [t],
  );

  const upload = async () => {
    const maxBytes = config.chunks.enabled && bytes(config.chunks.max);
    const partialUploads: File[] = maxBytes ? files.filter((file) => file.size >= maxBytes) : [];
    const normalUploads: File[] = maxBytes ? files.filter((file) => file.size < maxBytes) : files;
    const hasBoth = normalUploads.length > 0 && partialUploads.length > 0;

    let uploadedNormal: Awaited<ReturnType<typeof uploadFiles>> = null;
    let uploadedPartial: Awaited<ReturnType<typeof uploadPartialFiles>> = null;

    if (normalUploads.length > 0) {
      const size = normalUploads.reduce((acc, file) => acc + file.size, 0);
      if (size > bytes(config.files.maxFileSize)) {
        notifications.show({
          title: t('file.notifications.mayFail.title'),
          color: 'yellow',
          icon: <IconDeviceSdCard size='1rem' />,
          message: (
            <Trans
              t={t}
              i18nKey='file.notifications.mayFail.message'
              values={{ size: bytes(size), limit: bytes(bytes(config.files.maxFileSize)) }}
              components={{ b: <b /> }}
            />
          ),
        });
      }

      uploadedNormal = await uploadFiles(normalUploads, {
        setFiles,
        setLoading,
        setProgress,
        clipboard,
        clearEphemeral,
        options,
        ephemeral,
        folder,
        partials: partialUploads.length,
      });
    }

    if (partialUploads.length > 0 && (!hasBoth || uploadedNormal)) {
      uploadedPartial = await uploadPartialFiles(partialUploads, {
        setFiles,
        setLoading,
        setProgress,
        options,
        ephemeral,
        config,
        folder,
      });
    }

    const allFiles = [...(uploadedNormal?.files ?? []), ...(uploadedPartial?.files ?? [])];
    if (allFiles.length > 0 && (hasBoth || partialUploads.length > 0))
      showUploadModal(allFiles, { clipboard, clearEphemeral, showCopyAll: true });
  };

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (files.length > 0) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [files.length]);

  if (!config) return null;

  return (
    <>
      <Group gap='sm'>
        <Title order={1}>{title ?? t('file.title')}</Title>

        {!folder && (
          <Button
            variant='outline'
            size='compact-sm'
            component={Link}
            to='/dashboard/files'
            leftSection={<IconFiles size='1rem' />}
          >
            {t('actions.goToFiles')}
          </Button>
        )}
      </Group>

      <Dropzone
        onDrop={(f) => {
          setFiles((prev) => [...f, ...prev]);
          setVisibleCount(initialVisible);
        }}
        my='sm'
        loading={dropLoading}
        disabled={dropLoading}
        style={{ zIndex: 1 }}
      >
        <Group justify='center' gap='xl' style={{ minHeight: rem(220), pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload
              size='3.2rem'
              stroke={1.5}
              color={theme.colors[theme.primaryColor][colorScheme === 'dark' ? 4 : 6]}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size='3.2rem' stroke={1.5} color={theme.colors.red[colorScheme === 'dark' ? 4 : 6]} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFiles size='3.2rem' stroke={1.5} />
          </Dropzone.Idle>

          <div>
            <Text size='xl' inline>
              {t('file.dropzone.title')}
            </Text>
            <Text size='sm' inline mt='xs'>
              <Trans
                t={t}
                i18nKey='file.dropzone.paste'
                values={{ mod: isMac ? '⌘' : 'Ctrl' }}
                components={{ kbd: <Kbd size='xs' /> }}
              />
            </Text>
            <Text size='sm' c='dimmed' inline mt={7}>
              {t('file.dropzone.description')}
            </Text>
            <Text size='sm' c='dimmed' mt={7}>
              <Trans
                t={t}
                i18nKey='file.dropzone.limit'
                values={{ size: bytes(bytes(config.files.maxFileSize)) }}
                components={{ b: <b /> }}
              />
            </Text>
          </div>
        </Group>
      </Dropzone>

      <Collapse expanded={progress.percent > 0 && progress.percent < 100}>
        {progress.percent > 0 && progress.percent < 100 && (
          <Progress.Root my='sm' size='xl'>
            <Progress.Section value={progress.percent} animated>
              <Progress.Label>{Math.floor(progress.percent)}%</Progress.Label>
            </Progress.Section>
          </Progress.Root>
        )}
      </Collapse>

      <Collapse expanded={progress.speed > 0 && progress.remaining > 0}>
        <Paper withBorder p='xs'>
          <Text ta='center' size='sm'>
            {t('file.progress.speed', {
              speed: bytes(progress.speed),
              remaining: humanizeDuration(progress.remaining),
            })}
          </Text>
        </Paper>
      </Collapse>

      <Collapse expanded={progress.percent === 100}>
        <Paper withBorder p='xs'>
          <Text ta='center' size='sm' c='yellow' fw={500}>
            {t('file.progress.finalizing')}
          </Text>
        </Paper>
      </Collapse>

      <Grid grow my='sm'>
        {visibleFiles.map((file, i) => (
          <Grid.Col span={3} key={i}>
            <DropzoneFile
              loading={dropLoading}
              file={file}
              onDelete={() => setFiles((prev) => prev.filter((_, j) => i !== j))}
            />
          </Grid.Col>
        ))}
      </Grid>

      {hiddenFiles > 0 && (
        <Group justify='center' gap='xs' my='xs'>
          <Text size='sm' c='dimmed'>
            {t('file.hidden', { count: hiddenFiles })}{' '}
          </Text>
          <Button
            size='compact-sm'
            variant='light'
            disabled={dropLoading}
            onClick={() => setVisibleCount((prev) => Math.min(files.length, prev + initialVisible))}
          >
            {t('file.showMore')}
          </Button>
          <Tooltip label={t('file.showAllTooltip')} hidden={dropLoading}>
            <Button
              size='compact-sm'
              variant='subtle'
              disabled={dropLoading}
              onClick={() => setVisibleCount(files.length)}
            >
              {t('file.showAll')}
            </Button>
          </Tooltip>
        </Group>
      )}

      <Group justify='right' gap='sm' my='md'>
        <Button
          variant='outline'
          color='red'
          leftSection={<IconTrashFilled size='1rem' />}
          disabled={files.length === 0 || dropLoading}
          onClick={() => {
            setFiles([]);
            setVisibleCount(initialVisible);
          }}
        >
          {t('actions.clearAll')}
        </Button>
        <UploadOptionsButton folder={folder} numFiles={files.length} />
        <Button
          variant='outline'
          leftSection={<IconUpload size='1rem' />}
          disabled={files.length === 0 || dropLoading}
          onClick={upload}
        >
          {t('actions.upload', { count: files.length, size: bytes(aggSize()) })}
        </Button>
      </Group>
    </>
  );
}
