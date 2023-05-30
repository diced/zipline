import { Card, Group, LoadingOverlay, Stack, Text, Tooltip } from '@mantine/core';
import { useFileDelete, useFileFavorite } from 'lib/queries/files';
import { useFolders } from 'lib/queries/folders';
import { useState } from 'react';
import MutedText from '../MutedText';
import Type from '../Type';
import FileModal from './FileModal';

export function FileMeta({ Icon, title, subtitle, ...other }) {
  return other.tooltip ? (
    <Group>
      <Icon size={24} />
      <Tooltip label={other.tooltip}>
        <Stack spacing={1}>
          <Text>{title}</Text>
          <MutedText size='md'>{subtitle}</MutedText>
        </Stack>
      </Tooltip>
    </Group>
  ) : (
    <Group>
      <Icon size={24} />
      <Stack spacing={1}>
        <Text>{title}</Text>
        <MutedText size='md'>{subtitle}</MutedText>
      </Stack>
    </Group>
  );
}

export default function File({
  image,
  disableMediaPreview,
  exifEnabled,
  refreshImages = undefined,
  reducedActions = false,
  onDash,
  otherUser = false,
}) {
  const [open, setOpen] = useState(false);
  const deleteFile = useFileDelete();
  const favoriteFile = useFileFavorite();
  const loading = deleteFile.isLoading || favoriteFile.isLoading;

  const folders = useFolders();

  const refresh = () => {
    if (!otherUser) refreshImages();
    folders.refetch();
  };

  return (
    <>
      <FileModal
        open={open}
        setOpen={setOpen}
        file={image}
        loading={loading}
        refresh={refresh}
        reducedActions={reducedActions}
        exifEnabled={exifEnabled}
        compress={onDash}
        otherUser={otherUser}
      />

      <Card
        sx={{
          maxWidth: '100%',
          height: '100%',
          '&:hover': {
            filter: 'brightness(0.75)',
          },
          transition: 'filter 0.2s ease-in-out',
          cursor: 'pointer',
        }}
        shadow='md'
        onClick={() => setOpen(true)}
      >
        <Card.Section>
          <LoadingOverlay visible={loading} />
          <Type
            file={image}
            sx={{
              minHeight: 200,
              maxHeight: 320,
              fontSize: 70,
              width: '100%',
              cursor: 'pointer',
            }}
            style={{
              minHeight: 200,
              maxHeight: 320,
              fontSize: 70,
              width: '100%',
              cursor: 'pointer',
            }}
            src={`/r/${encodeURI(image.name)}?compress=${onDash}`}
            alt={image.name}
            disableMediaPreview={disableMediaPreview}
          />
        </Card.Section>
      </Card>
    </>
  );
}
