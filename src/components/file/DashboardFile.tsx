import type { File } from '@/lib/db/models/file';
import { Card, Group, Modal, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import {
  Icon,
  IconBombFilled,
  IconDeviceSdCard,
  IconEyeFilled,
  IconFileInfo,
  IconHash,
  IconRefresh,
  IconUpload,
} from '@tabler/icons-react';
import bytes from 'bytes';
import { useState } from 'react';
import DashboardFileType from './DashboardFileType';

export function FileStat({ Icon, title, value }: { Icon: Icon; title: string; value: string | number }) {
  return (
    <Group>
      <Icon size='2rem' />

      <Stack spacing={1}>
        <Title order={5} weight={700}>
          {title}
        </Title>

        <Text size='sm' color='dimmed'>
          {value}
        </Text>
      </Stack>
    </Group>
  );
}

export function FileModal({
  open,
  setOpen,
  file,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  file: File;
}) {
  return (
    <Modal
      opened={open}
      onClose={() => setOpen(false)}
      title={
        <Title order={3} weight={700}>
          {file.name}
        </Title>
      }
      size='auto'
      centered
      overlayProps={{
        blur: 3,
        opacity: 0.5,
      }}
    >
      <DashboardFileType file={file} show />

      <SimpleGrid
        cols={3}
        spacing='md'
        my='xs'
        breakpoints={[
          { maxWidth: 'sm', cols: 1, spacing: 'sm' },
          {
            maxWidth: 'md',
            cols: 2,
          },
        ]}
      >
        <FileStat Icon={IconFileInfo} title='Type' value={file.type} />
        <FileStat Icon={IconDeviceSdCard} title='Size' value={bytes(file.size, { unitSeparator: ' ' })} />
        <FileStat Icon={IconUpload} title='Created at' value={file.createdAt.toLocaleString()} />
        <FileStat Icon={IconRefresh} title='Updated at' value={file.updatedAt.toLocaleString()} />
        {file.deletesAt && (
          <FileStat Icon={IconBombFilled} title='Deletes at' value={file.deletesAt.toLocaleString()} />
        )}
        <FileStat Icon={IconHash} title='ID' value={file.id} />
        <FileStat Icon={IconEyeFilled} title='Views' value={file.views} />
      </SimpleGrid>
    </Modal>
  );
}

export default function DashboardFile({ file }: { file: File }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <FileModal open={open} setOpen={setOpen} file={file} />
      <Card
        shadow='md'
        radius='md'
        p={0}
        h={300}
        sx={{
          '&:hover': {
            cursor: 'pointer',
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1), 0 4px 12px -1px rgba(0, 0, 0, 0.1)',
            filter: 'brightness(0.86)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
        onClick={() => setOpen(true)}
      >
        <DashboardFileType key={file.id} file={file} />
      </Card>
    </>
  );
}
