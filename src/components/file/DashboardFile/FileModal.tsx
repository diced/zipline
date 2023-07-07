import { File } from '@/lib/db/models/file';
import { fetchApi } from '@/lib/fetchApi';
import { ActionIcon, Anchor, Group, Modal, SimpleGrid, Text, Title, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  Icon,
  IconBombFilled,
  IconCopy,
  IconDeviceSdCard,
  IconDownload,
  IconExternalLink,
  IconEyeFilled,
  IconFileInfo,
  IconRefresh,
  IconStar,
  IconStarFilled,
  IconTrashFilled,
  IconTrashXFilled,
  IconUpload,
} from '@tabler/icons-react';
import bytes from 'bytes';
import DashboardFileType from '../DashboardFileType';
import FileStat from './FileStat';
import { useClipboard } from '@mantine/hooks';
import Link from 'next/link';
import { mutate } from 'swr';
import { Response } from '@/lib/api/response';

function ActionButton({
  Icon,
  onClick,
  tooltip,
  color,
}: {
  Icon: Icon;
  onClick: () => void;
  tooltip: string;
  color?: string;
}) {
  return (
    <Tooltip label={tooltip}>
      <ActionIcon variant='outline' color={color ?? 'gray'} onClick={onClick}>
        <Icon size='1rem' />
      </ActionIcon>
    </Tooltip>
  );
}

export default function FileModal({
  open,
  setOpen,
  file,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  file: File;
}) {
  const clipboard = useClipboard();

  const viewFile = () => {
    window.open(`/view/${file.name}`, '_blank');
  };

  const downloadFile = () => {
    window.open(`/raw/${file.name}?download=true`, '_blank');
  };

  const copyFile = () => {
    const domain = `${window.location.protocol}//${window.location.host}`;

    clipboard.copy(`${domain}/view/${file.name}`);

    notifications.show({
      title: 'Copied link',
      message: (
        <Anchor component={Link} href={`/view/${file.name}`}>
          {`${domain}/view/${file.name}`}
        </Anchor>
      ),
      color: 'green',
      icon: <IconCopy size='1rem' />,
    });
  };

  const deleteFile = async () => {
    const { error } = await fetchApi(`/api/user/files/${file.id}`, 'DELETE');

    if (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
        icon: <IconTrashXFilled size='1rem' />,
      });
    } else {
      notifications.show({
        title: 'File deleted',
        message: `${file.name} has been deleted`,
        color: 'green',
        icon: <IconTrashFilled size='1rem' />,
      });

      setOpen(false);
    }
  };

  const favoriteFile = async () => {
    const { data, error } = await fetchApi<Response['/api/user/files/[id]']>(
      `/api/user/files/${file.id}`,
      'PATCH',
      {
        favorite: !file.favorite,
      }
    );

    if (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
        icon: <IconStar size='1rem' />,
      });
    } else {
      notifications.show({
        title: `File ${data!.favorite ? 'favorited' : 'unfavorited'}`,
        message: `${file.name} has been ${data!.favorite ? 'favorited' : 'unfavorited'}`,
        color: 'yellow',
        icon: <IconStarFilled size='1rem' />,
      });
    }

    mutate('/api/user/recent');
    mutate('/api/user/files');
  };

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
        <FileStat Icon={IconEyeFilled} title='Views' value={file.views} />
      </SimpleGrid>

      <Group position='apart'>
        <Group position='left'>
          <Text size='sm' color='dimmed'>
            {file.id}
          </Text>
        </Group>

        <Group position='right'>
          <ActionButton Icon={IconTrashFilled} onClick={deleteFile} tooltip='Delete file' color='red' />
          <ActionButton Icon={IconExternalLink} onClick={viewFile} tooltip='View file in a new tab' />
          <ActionButton Icon={IconCopy} onClick={copyFile} tooltip='Copy file link' />
          <ActionButton
            Icon={file.favorite ? IconStarFilled : IconStar}
            onClick={favoriteFile}
            tooltip={file.favorite ? 'Unfavorite file' : 'Favorite file'}
            color={file.favorite ? 'yellow' : 'gray'}
          />
          <ActionButton Icon={IconDownload} onClick={downloadFile} tooltip='Download file' />
        </Group>
      </Group>
    </Modal>
  );
}
