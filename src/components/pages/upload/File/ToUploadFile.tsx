import DashboardFileType from '@/components/file/DashboardFileType';
import { Button, Center, Group, HoverCard, Paper, Stack, Text } from '@mantine/core';
import { IconFileUpload, IconTrashFilled } from '@tabler/icons-react';
import bytes from 'bytes';

export default function ToUploadFile({ file, onDelete }: { file: File; onDelete: () => void }) {
  return (
    <HoverCard shadow='md' position='top'>
      <HoverCard.Target>
        <Paper withBorder p='md' radius='md' pos='relative'>
          <Center h='100%'>
            <Group position='center' spacing='xl'>
              <IconFileUpload size={48} />
              <Text size='md'>{file.name}</Text>
            </Group>
          </Center>
        </Paper>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Group>
          <DashboardFileType file={file} show />
          <Stack spacing='xs'>
            <Text size='sm' color='dimmed'>
              <b>{file.name}</b> {file.type || file.type === '' ? `(${file.type})` : ''}
            </Text>
            <Text size='sm' color='dimmed'>
              {bytes(file.size, { unitSeparator: ' ' })}
            </Text>
            <Button
              compact
              variant='outline'
              color='red'
              fullWidth
              onClick={onDelete}
              leftIcon={<IconTrashFilled size='1rem' />}
            >
              Remove
            </Button>
          </Stack>
        </Group>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
