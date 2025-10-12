import fileIcon from '@/components/file/fileIcon';
import { bytes } from '@/lib/bytes';
import { ActionIcon, Box, Card, Center, Group, Image, Overlay, Stack, Text, Tooltip } from '@mantine/core';
import { IconTrashFilled } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import styles from './ToUploadFile.module.css';

function truncateFileName(fileName: string, maxLength: number = 20): string {
  if (fileName.length <= maxLength) return fileName;

  const extension = fileName.split('.').pop() || '';
  const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'));

  if (nameWithoutExt.length <= maxLength - extension.length - 4) {
    return fileName;
  }

  const truncatedLength = maxLength - extension.length - 7;
  const truncated = nameWithoutExt.slice(0, truncatedLength) + '...' + nameWithoutExt.slice(-3);

  return `${truncated}.${extension}`;
}

function getFileTypeDisplay(file: File): string {
  const type = file.type.split('/')[0] || 'file';
  const extension = file.name.split('.').pop()?.toUpperCase() || '';

  const typeMap: Record<string, string> = {
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    text: 'Text',
    application: 'Document',
  };

  const displayType = typeMap[type] || 'File';
  return extension ? `${displayType} - ${extension}` : displayType;
}

export default function ToUploadFile({
  file,
  onDelete,
  loading,
}: {
  loading: boolean;
  file: File;
  onDelete: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = file.type.startsWith('image/');
  const FileIcon = fileIcon(file.type);

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  if (loading) {
    return (
      <Card
        withBorder
        radius='md'
        pos='relative'
        style={{
          width: '100%',
          minHeight: 150,
          marginBottom: '1rem',
        }}
      >
        <Overlay radius='md' backgroundOpacity={0.2} />
        <Center h='100%'>
          <Text size='sm' c='dimmed'>
            Uploading...
          </Text>
        </Center>
      </Card>
    );
  }

  return (
    <Card
      withBorder
      radius='md'
      pos='relative'
      style={{
        width: '100%',
        height: 'fit-content',
        ...(file.size === 0 && {
          backgroundColor: 'rgba(255, 255, 0, 0.1)',
          borderColor: '#ffd43b',
          borderWidth: '2px',
          boxShadow: '0 0 8px rgba(255, 212, 59, 0.3)',
        }),
      }}
      className={styles.uploadFileCard}
    >
      <ActionIcon
        variant='filled'
        color='red'
        size='md'
        pos='absolute'
        top={8}
        right={8}
        style={{ zIndex: 10 }}
        onClick={onDelete}
        className={styles.deleteButton}
      >
        <IconTrashFilled size='1rem' />
      </ActionIcon>

      <Stack gap={0}>
        <Box pos='relative' style={{ maxHeight: 250 }} className={styles.previewArea}>
          {isImage && previewUrl ? (
            <Image
              src={previewUrl}
              alt={file.name}
              fit='contain'
              style={{
                width: '100%',
                maxHeight: 250,
                height: 'auto',
                display: 'block',
                borderRadius: '4px 4px 0 0',
              }}
            />
          ) : (
            <Center p='xl' style={{ minHeight: 120 }}>
              <FileIcon size={48} style={{ color: 'var(--mantine-color-dimmed)' }} />
            </Center>
          )}
        </Box>

        <Box p='xs' style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          <Stack gap={4}>
            <Tooltip label={file.name} withArrow>
              <Text size='sm' fw={500} lineClamp={1} style={{ lineHeight: 1.2 }}>
                {truncateFileName(file.name)}
              </Text>
            </Tooltip>

            <Group justify='space-between' gap='xs'>
              <Text size='xs' c='dimmed' flex={1} lineClamp={1}>
                {getFileTypeDisplay(file)}
              </Text>
              <Text
                size='xs'
                c={file.size === 0 ? 'yellow' : 'dimmed'}
                style={{ whiteSpace: 'nowrap' }}
                fw={file.size === 0 ? 600 : undefined}
              >
                {bytes(file.size)}
              </Text>
            </Group>
          </Stack>
        </Box>
      </Stack>
    </Card>
  );
}
