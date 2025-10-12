import { Paper, Box, Center, Stack, ThemeIcon, Title, Text } from '@mantine/core';
import { Dropzone as MantineDropzone } from '@mantine/dropzone';
import { IconCloudUpload } from '@tabler/icons-react';

interface UploadDropzoneProps {
  onDrop: (files: File[]) => void;
  maxFiles: number;
  maxSize: number;
  uploading: boolean;
  hasProgress: boolean;
  children?: React.ReactNode;
}

export function UploadDropzone({
  onDrop,
  maxFiles,
  maxSize,
  uploading,
  hasProgress,
  children,
}: UploadDropzoneProps) {
  return (
    <Paper
      p='lg'
      radius='lg'
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(20px)',
        border: 'none',
        transition: 'all 0.3s ease',
        minHeight: uploading || hasProgress ? '400px' : '200px',
      }}
    >
      {!uploading && !hasProgress ? (
        <MantineDropzone
          onDrop={onDrop}
          maxFiles={maxFiles}
          maxSize={maxSize}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            minHeight: '200px',
          }}
        >
          <Center style={{ cursor: 'pointer', padding: '40px 20px' }}>
            <Stack align='center' gap='md'>
              <ThemeIcon
                size={80}
                radius='xl'
                variant='gradient'
                gradient={{ from: 'blue', to: 'cyan' }}
              >
                <IconCloudUpload size='3rem' />
              </ThemeIcon>
              <Title order={2} fw={700} style={{ color: '#74b9ff' }}>
                Upload Something
              </Title>
              <Text size='sm' c='dimmed'>
                Drop files here or click to select
              </Text>
            </Stack>
          </Center>
        </MantineDropzone>
      ) : (
        children
      )}
    </Paper>
  );
}
