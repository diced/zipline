import { useConfig } from '@/components/ConfigProvider';
import { useUploadOptionsStore } from '@/lib/store/uploadOptions';
import {
  ActionIcon,
  Button,
  Collapse,
  Grid,
  Group,
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
import { notifications } from '@mantine/notifications';
import { IconDeviceSdCard, IconFiles, IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import UploadOptionsButton from '../UploadOptionsButton';
import { uploadFiles } from '../uploadFiles';
import ToUploadFile from './ToUploadFile';
import { bytes } from '@/lib/bytes';

export default function UploadFile() {
  const theme = useMantineTheme();
  const colorScheme = useColorScheme();
  const clipboard = useClipboard();
  const config = useConfig();

  const [options, ephemeral, clearEphemeral] = useUploadOptionsStore((state) => [
    state.options,
    state.ephemeral,
    state.clearEphemeral,
  ]);

  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [dropLoading, setLoading] = useState(false);

  const aggregateSize = () => files.reduce((acc, file) => acc + file.size, 0);

  const upload = () => {
    const size = aggregateSize();
    if (size > config.files.maxFileSize) {
      notifications.show({
        title: 'Upload may fail',
        color: 'yellow',
        icon: <IconDeviceSdCard size='1rem' />,
        message: (
          <>
            The upload may fail because the total size of the files you are trying to upload is{' '}
            <b>{bytes(size)}</b>, which is larger than the limit of <b>{bytes(config.files.maxFileSize)}</b>
          </>
        ),
      });
    }

    uploadFiles(files, {
      setFiles,
      setLoading,
      setProgress,
      clipboard,
      clearEphemeral,
      options,
      ephemeral,
    });
  };

  return (
    <>
      <Group gap='sm'>
        <Title order={1}>Upload files</Title>

        <Tooltip label='View your files'>
          <ActionIcon component={Link} href='/dashboard/files' variant='outline' radius='sm'>
            <IconFiles size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Dropzone
        onDrop={(f) => setFiles([...f, ...files])}
        my='sm'
        loading={dropLoading}
        disabled={dropLoading}
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
            <IconPhoto size='3.2rem' stroke={1.5} />
          </Dropzone.Idle>

          <div>
            <Text size='xl' inline>
              Drag images here or click to select files
            </Text>
            <Text size='sm' c='dimmed' inline mt={7}>
              Attach as many files as you like, they will show up below to review before uploading.
            </Text>
            <Text size='sm' c='dimmed' mt={7}>
              <b>{bytes(config.files.maxFileSize)}</b> limit per file
            </Text>
          </div>
        </Group>
      </Dropzone>

      <Collapse in={progress > 0 && progress < 100}>
        {progress > 0 && progress < 100 && (
          <Progress my='sm' size='xl' value={progress} animated>
            <Progress.Label>{Math.floor(progress)}%</Progress.Label>
          </Progress>
        )}
      </Collapse>

      <Collapse in={progress === 100}>
        <Paper withBorder p='xs' radius='sm'>
          <Text ta='center' size='sm' color='yellow'>
            Finalizing upload(s)...
          </Text>
        </Paper>
      </Collapse>

      <Grid grow my='sm'>
        {files.map((file, i) => (
          <Grid.Col span={3} key={i}>
            <ToUploadFile file={file} onDelete={() => setFiles(files.filter((_, j) => i !== j))} />
          </Grid.Col>
        ))}
      </Grid>

      <Group justify='right' gap='sm' my='md'>
        <UploadOptionsButton numFiles={files.length} />

        <Button
          variant='outline'
          leftSection={<IconUpload size={18} />}
          disabled={files.length === 0 || dropLoading}
          onClick={upload}
        >
          Upload {files.length} files ({bytes(aggregateSize())})
        </Button>
      </Group>
    </>
  );
}