import TagPill from '@/components/pages/files/tags/TagPill';
import { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
import { File } from '@/lib/db/models/file';
import { Folder } from '@/lib/db/models/folder';
import { Tag } from '@/lib/db/models/tag';
import { fetchApi } from '@/lib/fetchApi';
import { useSettingsStore } from '@/lib/store/settings';
import {
  ActionIcon,
  Checkbox,
  Combobox,
  Group,
  Input,
  InputBase,
  Modal,
  Pill,
  PillsInput,
  SimpleGrid,
  Title,
  Tooltip,
  useCombobox,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
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
  IconPencil,
  IconRefresh,
  IconStar,
  IconStarFilled,
  IconTags,
  IconTagsOff,
  IconTextRecognition,
  IconTrashFilled,
  IconUpload,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import DashboardFileType from '../DashboardFileType';
import {
  addToFolder,
  copyFile,
  createFolderAndAdd,
  deleteFile,
  downloadFile,
  favoriteFile,
  mutateFiles,
  removeFromFolder,
  viewFile,
} from '../actions';
import FileStat from './FileStat';
import EditFileDetailsModal from './EditFileDetailsModal';

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

  const [editFileOpen, setEditFileOpen] = useState(false);

  const { data: folders } = useSWR<Extract<Response['/api/user/folders'], Folder[]>>(
    '/api/user/folders?noincl=true',
  );

  const folderCombobox = useCombobox();
  const [search, setSearch] = useState('');

  const handleAdd = async (value: string) => {
    if (value === '$create') {
      createFolderAndAdd(file!, search.trim());
    } else {
      addToFolder(file!, value);
    }
  };

  const { data: tags } = useSWR<Extract<Response['/api/user/tags'], Tag[]>>('/api/user/tags');

  const tagsCombobox = useCombobox();
  const [value, setValue] = useState(file?.tags?.map((x) => x.id) ?? []);
  const handleValueSelect = (val: string) => {
    setValue((current) => (current.includes(val) ? current.filter((v) => v !== val) : [...current, val]));
  };

  const handleValueRemove = (val: string) => {
    setValue((current) => current.filter((v) => v !== val));
  };

  const handleTagsUpdate = async () => {
    if (value.length === file?.tags?.length && value.every((v) => file?.tags?.map((x) => x.id).includes(v))) {
      return;
    }

    const { data, error } = await fetchApi<Response['/api/user/files/[id]']>(
      `/api/user/files/${file!.id}`,
      'PATCH',
      {
        tags: value,
      },
    );

    if (error) {
      showNotification({
        title: 'Failed to save tags',
        message: error.message,
        color: 'red',
        icon: <IconTagsOff size='1rem' />,
      });
    } else {
      showNotification({
        title: 'Saved tags',
        message: `Saved ${data!.tags!.length} tags for file ${data!.name}`,
        color: 'green',
        icon: <IconTags size='1rem' />,
      });
    }

    mutateFiles();
  };

  const triggerSave = async () => {
    tagsCombobox.closeDropdown();

    handleTagsUpdate();
  };

  const values = value.map((tag) => <TagPill key={tag} tag={tags?.find((t) => t.id === tag) || null} />);

  useEffect(() => {
    if (file) {
      setValue(file.tags?.map((x) => x.id) ?? []);
    } else {
      setValue([]);
    }
  }, [file]);

  return (
    <>
      <EditFileDetailsModal open={editFileOpen} onClose={() => setEditFileOpen(false)} file={file!} />

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
                <FileStat
                  Icon={IconBombFilled}
                  title='Deletes at'
                  value={new Date(file.deletesAt).toLocaleString()}
                />
              )}
              <FileStat
                Icon={IconEyeFilled}
                title='Views'
                value={file.maxViews ? `${file.views} / ${file.maxViews}` : file.views}
              />
              {file.originalName && (
                <FileStat Icon={IconTextRecognition} title='Original Name' value={file.originalName} />
              )}
            </SimpleGrid>

            <>
              <Title order={4} mt='lg' mb='xs'>
                Tags
              </Title>
              <Combobox store={tagsCombobox} onOptionSubmit={handleValueSelect} withinPortal={false}>
                <Combobox.DropdownTarget>
                  <PillsInput
                    onBlur={() => triggerSave()}
                    pointer
                    onClick={() => tagsCombobox.toggleDropdown()}
                  >
                    <Pill.Group>
                      {values.length > 0 ? (
                        values
                      ) : (
                        <Input.Placeholder>Pick one or more tags</Input.Placeholder>
                      )}

                      <Combobox.EventsTarget>
                        <PillsInput.Field
                          type='hidden'
                          onBlur={() => tagsCombobox.closeDropdown()}
                          onKeyDown={(event) => {
                            if (event.key === 'Backspace') {
                              event.preventDefault();
                              handleValueRemove(value[value.length - 1]);
                            }
                          }}
                        />
                      </Combobox.EventsTarget>
                    </Pill.Group>
                  </PillsInput>
                </Combobox.DropdownTarget>

                <Combobox.Dropdown>
                  <Combobox.Options>
                    {tags?.map((tag) => (
                      <Combobox.Option value={tag.id} key={tag.id} active={value.includes(tag.id)}>
                        <Group gap='sm'>
                          <Checkbox
                            checked={value.includes(tag.id)}
                            onChange={() => {}}
                            aria-hidden
                            tabIndex={-1}
                            style={{ pointerEvents: 'none' }}
                          />
                          <TagPill tag={tag} />
                        </Group>
                      </Combobox.Option>
                    ))}
                  </Combobox.Options>
                </Combobox.Dropdown>
              </Combobox>
            </>

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
                      store={folderCombobox}
                      withinPortal={false}
                      onOptionSubmit={(value) => handleAdd(value)}
                    >
                      <Combobox.Target>
                        <InputBase
                          rightSection={<Combobox.Chevron />}
                          value={search}
                          onChange={(event) => {
                            folderCombobox.openDropdown();
                            folderCombobox.updateSelectedOptionIndex();
                            setSearch(event.currentTarget.value);
                          }}
                          onClick={() => folderCombobox.openDropdown()}
                          onFocus={() => folderCombobox.openDropdown()}
                          onBlur={() => {
                            folderCombobox.closeDropdown();
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
                      Icon={IconPencil}
                      onClick={() => setEditFileOpen(true)}
                      tooltip='Edit file details'
                      color='yellow'
                    />
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
                <ActionButton
                  Icon={IconDownload}
                  onClick={() => downloadFile(file)}
                  tooltip='Download file'
                />
              </Group>
            </Group>
          </>
        ) : (
          <></>
        )}
      </Modal>
    </>
  );
}
