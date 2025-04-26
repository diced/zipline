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
  Box,
  Checkbox,
  Combobox,
  Group,
  Input,
  Modal,
  Pill,
  PillsInput,
  ScrollArea,
  SimpleGrid,
  Text,
  Title,
  Tooltip,
  useCombobox,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import {
  Icon,
  IconBombFilled,
  IconDeviceSdCard,
  IconEyeFilled,
  IconFileInfo,
  IconRefresh,
  IconTags,
  IconTagsOff,
  IconUpload,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';
import DashboardFileType from '../DashboardFileType';
import { addToFolder, createFolderAndAdd, mutateFiles } from '../actions';
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
        message: error.error,
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
    mutate('/api/user/tags');
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
      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title={
          <Text size='xl' fw={700}>
            {file?.originalName ?? ''}
          </Text>
        }
        size='auto'
        centered
        zIndex={200}
        scrollAreaComponent={ScrollArea.Autosize}
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
            </SimpleGrid>

            {!reduce && (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing='md' my='xs'>
                <Box>
                  <Title order={4} mt='lg' mb='xs'>
                    Tags
                  </Title>
                  <Combobox
                    zIndex={90000}
                    store={tagsCombobox}
                    onOptionSubmit={handleValueSelect}
                    withinPortal={false}
                  >
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
                        {tags?.length ? (
                          tags?.map((tag) => (
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
                          ))
                        ) : (
                          <Combobox.Option value='no-tags' disabled>
                            No tags found, create one outside of this menu.
                          </Combobox.Option>
                        )}
                      </Combobox.Options>
                    </Combobox.Dropdown>
                  </Combobox>
                </Box>
              </SimpleGrid>
            )}
          </>
        ) : (
          <></>
        )}
      </Modal>
    </>
  );
}
