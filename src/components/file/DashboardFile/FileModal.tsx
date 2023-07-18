import { File } from '@/lib/db/models/file';
import { ActionIcon, Group, Modal, SimpleGrid, Text, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
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
  IconUpload
} from '@tabler/icons-react';
import bytes from 'bytes';
import DashboardFileType from '../DashboardFileType';
import { copyFile, deleteFile, downloadFile, favoriteFile, viewFile } from '../actions';
import FileStat from './FileStat';

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
  file?: File | null;
}) {
  const clipboard = useClipboard();

  return (
    <Modal
      opened={open}
      onClose={() => setOpen(false)}
      title={
        <Title order={3} weight={700}>
          {file?.name ?? ''}
        </Title>
      }
      size='auto'
      centered
      overlayProps={{
        blur: 3,
        opacity: 0.5,
      }}
    >
      {file ? (
        <>
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
              <ActionButton
                Icon={IconTrashFilled}
                onClick={() => deleteFile(file, notifications, setOpen)}
                tooltip='Delete file'
                color='red'
              />
              <ActionButton
                Icon={IconExternalLink}
                onClick={() => viewFile(file)}
                tooltip='View file in a new tab'
              />
              <ActionButton
                Icon={IconCopy}
                onClick={() => copyFile(file, clipboard, notifications)}
                tooltip='Copy file link'
              />
              <ActionButton
                Icon={file.favorite ? IconStarFilled : IconStar}
                onClick={() => favoriteFile(file, notifications)}
                tooltip={file.favorite ? 'Unfavorite file' : 'Favorite file'}
                color={file.favorite ? 'yellow' : 'gray'}
              />
              <ActionButton Icon={IconDownload} onClick={() => downloadFile(file)} tooltip='Download file' />
            </Group>
          </Group>
        </>
      ) : (
        <></>
      )}
    </Modal>
  );
}
