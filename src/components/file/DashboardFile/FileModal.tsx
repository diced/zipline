import { File } from '@/lib/db/models/file';
import { ActionIcon, Group, Modal, Select, SimpleGrid, Text, Title, Tooltip } from '@mantine/core';
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
  IconFolderMinus,
  IconRefresh,
  IconStar,
  IconStarFilled,
  IconTrashFilled,
  IconUpload,
} from '@tabler/icons-react';
import DashboardFileType from '../DashboardFileType';
import {
  addToFolder,
  copyFile,
  createFolderAndAdd,
  deleteFile,
  downloadFile,
  favoriteFile,
  removeFromFolder,
  viewFile,
} from '../actions';
import FileStat from './FileStat';
import useSWR from 'swr';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { bytes } from '@/lib/bytes';

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
      <ActionIcon variant='filled' color={color ?? 'gray'} onClick={onClick}>
        <Icon size='1rem' />
      </ActionIcon>
    </Tooltip>
  );
}

export default function FileModal({
  open,
  setOpen,
  file,
  reduce,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  file?: File | null;
  reduce?: boolean;
}) {
  const clipboard = useClipboard();

  const { data: folders } = useSWR<Extract<Response['/api/user/folders'], Folder[]>>(
    '/api/user/folders?noincl=true'
  );

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
            <FileStat Icon={IconDeviceSdCard} title='Size' value={bytes(file.size)} />
            <FileStat Icon={IconUpload} title='Created at' value={file.createdAt.toLocaleString()} />
            <FileStat Icon={IconRefresh} title='Updated at' value={file.updatedAt.toLocaleString()} />
            {file.deletesAt && !reduce && (
              <FileStat Icon={IconBombFilled} title='Deletes at' value={file.deletesAt.toLocaleString()} />
            )}
            <FileStat Icon={IconEyeFilled} title='Views' value={file.views} />
          </SimpleGrid>

          <Group position='apart' mt='lg'>
            <Group position='left'>
              {!reduce &&
                (file.folderId ? (
                  <ActionButton
                    Icon={IconFolderMinus}
                    onClick={() => removeFromFolder(file)}
                    tooltip={`Remove from folder "${
                      folders?.find((f) => f.id === file.folderId)?.name ?? ''
                    }"`}
                    color='red'
                  />
                ) : (
                  <Select
                    data={folders?.map((f) => ({ value: f.id, label: f.name })) ?? []}
                    placeholder='Add to a folder...'
                    searchable
                    creatable
                    getCreateLabel={(value) => `Create folder "${value}"`}
                    onCreate={(query) => createFolderAndAdd(file, query)}
                    onChange={(value) => addToFolder(file, value)}
                    size='xs'
                  />
                ))}
            </Group>

            <Group position='right'>
              {!reduce && (
                <>
                  <ActionButton
                    Icon={IconTrashFilled}
                    onClick={() => deleteFile(file, setOpen)}
                    tooltip='Delete file'
                    color='red'
                  />
                  <ActionButton
                    Icon={file.favorite ? IconStarFilled : IconStar}
                    onClick={() => favoriteFile(file)}
                    tooltip={file.favorite ? 'Unfavorite file' : 'Favorite file'}
                    color={file.favorite ? 'yellow' : 'gray'}
                  />
                </>
              )}
              <ActionButton
                Icon={IconExternalLink}
                onClick={() => viewFile(file)}
                tooltip='View file in a new tab'
              />
              <ActionButton
                Icon={IconCopy}
                onClick={() => copyFile(file, clipboard)}
                tooltip='Copy file link'
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
