import DashboardFileType from '@/components/file/DashboardFileType';
import { bytes } from '@/lib/bytes';
import { Button, Center, Group, HoverCard, Overlay, Paper, Stack, Text } from '@mantine/core';
import { IconFileUpload, IconTrashFilled } from '@tabler/icons-react';

export default function ToUploadFile({
  file,
  onDelete,
  loading,
}: {
  loading: boolean;
  file: File;
  onDelete: () => void;
}) {
  if (loading)
    return (
      <Paper withBorder p='md' radius='md' pos='relative'>
        <Overlay radius='md' backgroundOpacity={0.2} />
        <Center h='100%'>
          <Group justify='center' gap='xl'>
            <IconFileUpload size={48} />
            <Text size='md'>{file.name}</Text>
          </Group>
        </Center>
      </Paper>
    );

  return (
    <HoverCard shadow='md' position='top'>
      <HoverCard.Target>
        <Paper withBorder p='md' radius='md' pos='relative'>
          <Center h='100%'>
            <Group justify='center' gap='xl'>
              <IconFileUpload size={48} />
              <Text size='md'>{file.name}</Text>
            </Group>
          </Center>
        </Paper>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Group maw={400}>
          <DashboardFileType file={file} show />
          <Stack justify='xs'>
            <Text size='sm' c='dimmed'>
              <b>{file.name}</b> {file.type || file.type === '' ? `(${file.type})` : ''}
            </Text>
            <Text size='sm' c='dimmed'>
              {bytes(file.size)}
            </Text>
            <Button
              size='compact-sm'
              variant='outline'
              color='red'
              fullWidth
              onClick={onDelete}
              leftSection={<IconTrashFilled size='1rem' />}
            >
              Remove
            </Button>
          </Stack>
        </Group>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
