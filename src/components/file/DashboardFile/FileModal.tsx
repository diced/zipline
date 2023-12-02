import { File } from '@/lib/db/models/file';
import {
  ActionIcon,
  Combobox,
  Group,
  InputBase,
  Modal,
  SimpleGrid,
  Title,
  Tooltip,
  useCombobox,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
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
import { useSettingsStore } from '@/lib/store/settings';
import { useState } from 'react';

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
  const warnDeletion = useSettingsStore((state) => state.settings.warnDeletion);

  const { data: folders } = useSWR<Extract<Response['/api/user/folders'], Folder[]>>(
    '/api/user/folders?noincl=true',
  );

  const combobox = useCombobox();
  const [search, setSearch] = useState('');

  const handleAdd = async (value: string) => {
    if (value === '$create') {
      createFolderAndAdd(file!, search.trim());
    } else {
      addToFolder(file!, value);
    }
  };

  return (
    <Modal
      opened={open}
      onClose={() => setOpen(false)}
      title={
        <Title order={3} fw={700}>
          {file?.name ?? ''}
        </Title>
      }
      size='auto'
      centered
      overlayProps={{
        blur: 3,
        opacity: 0.5,
      }}
      zIndex={200}
    >
      {file ? (
        <>
          <DashboardFileType file={file} show />

          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing='md' my='xs'>
            <FileStat Icon={IconFileInfo} title='Type' value={file.type} />
            <FileStat Icon={IconDeviceSdCard} title='Size' value={bytes(file.size)} />
            <FileStat
              Icon={IconUpload}
              title='Created at'
              value={new Date(file.createdAt).toLocaleString()}
            />
            <FileStat
              Icon={IconRefresh}
              title='Updated at'
              value={new Date(file.updatedAt).toLocaleString()}
            />
            {file.deletesAt && !reduce && (
              <FileStat Icon={IconBombFilled} title='Deletes at' value={file.deletesAt.toLocaleString()} />
            )}
            <FileStat Icon={IconEyeFilled} title='Views' value={file.views} />
          </SimpleGrid>

          <Group justify='space-between' mt='lg'>
            <Group>
              {!reduce &&
                (file.folderId ? (
                  <ActionButton
                    Icon={IconFolderMinus}
                    onClick={() => removeFromFolder(file)}
                    tooltip={`Remove from folder "${
                      folders?.find((f: any) => f.id === file.folderId)?.name ?? ''
                    }"`}
                    color='red'
                  />
                ) : (
                  <Combobox
                    store={combobox}
                    withinPortal={false}
                    onOptionSubmit={(value) => handleAdd(value)}
                  >
                    <Combobox.Target>
                      <InputBase
                        rightSection={<Combobox.Chevron />}
                        value={search}
                        onChange={(event) => {
                          combobox.openDropdown();
                          combobox.updateSelectedOptionIndex();
                          setSearch(event.currentTarget.value);
                        }}
                        onClick={() => combobox.openDropdown()}
                        onFocus={() => combobox.openDropdown()}
                        onBlur={() => {
                          combobox.closeDropdown();
                          setSearch(search || '');
                        }}
                        placeholder='Add to folder...'
                        rightSectionPointerEvents='none'
                      />
                    </Combobox.Target>

                    <Combobox.Dropdown>
                      <Combobox.Options>
                        {folders
                          ?.filter((f) => f.name.toLowerCase().includes(search.toLowerCase().trim()))
                          .map((f) => (
                            <Combobox.Option value={f.id} key={f.id}>
                              {f.name}
                            </Combobox.Option>
                          ))}

                        {!folders?.some((f) => f.name === search) && search.trim().length > 0 && (
                          <Combobox.Option value='$create'>
                            + Create folder &quot;{search}&quot;
                          </Combobox.Option>
                        )}
                      </Combobox.Options>
                    </Combobox.Dropdown>
                  </Combobox>
                ))}
            </Group>

            <Group>
              {!reduce && (
                <>
                  <ActionButton
                    Icon={IconTrashFilled}
                    onClick={() => deleteFile(warnDeletion, file, setOpen)}
                    tooltip='Delete file'
                    color='red'
                  />
                  <ActionButton
                    Icon={file.favorite ? IconStarFilled : IconStar}
                    onClick={() => favoriteFile(file)}
                    tooltip={file.favorite ? 'Unfavorite file' : 'Favorite file'}
                    color={file.favorite ? 'gray' : 'yellow'}
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
