import FolderComboboxOptions from '@/components/folders/FolderComboboxOptions';
import TagPill from '@/components/pages/files/tags/TagPill';
import { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
import { useFolders } from '@/lib/client/hooks/useFolders';
import { useFileNavStore } from '@/lib/client/store/fileNav';
import { useSettingsStore } from '@/lib/client/store/settings';
import { File } from '@/lib/db/models/file';
import { Tag } from '@/lib/db/models/tag';
import { fetchApi } from '@/lib/fetchApi';
import { buildFolderHierarchy } from '@/lib/folderHierarchy';
import {
  ActionIcon,
  ActionIconProps,
  Box,
  Button,
  Checkbox,
  Combobox,
  Group,
  Input,
  InputBase,
  Modal,
  Pill,
  PillsInput,
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
  IconChevronLeft,
  IconChevronRight,
  IconClipboardTypography,
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
  IconUserQuestion,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR, { mutate } from 'swr';
import { useShallow } from 'zustand/shallow';

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
import EditFileDetailsModal from './EditFileDetailsModal';
import FileStat from './FileStat';

function ActionButton({
  Icon,
  onClick,
  tooltip,
  color,
  ...props
}: {
  Icon: Icon;
  onClick: () => void;
  tooltip: string;
  color?: string;
} & ActionIconProps) {
  return (
    <Tooltip label={tooltip}>
      <ActionIcon variant='filled' color={color ?? 'gray'} onClick={onClick} {...props}>
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
  user,
  sequenced,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  file?: File | null;
  reduce?: boolean;
  user?: string;
  sequenced?: boolean;
}) {
  const { t } = useTranslation(['file', 'common']);
  const clipboard = useClipboard();
  const warnDeletion = useSettingsStore((state) => state.settings.warnDeletion);
  const fileNavButtons = useSettingsStore((state) => state.settings.fileNavButtons);

  const [editFileOpen, setEditFileOpen] = useState(false);

  const { data: folders } = useFolders(user);

  const folderOptions = useMemo(() => {
    if (!folders) return [];
    return buildFolderHierarchy(folders);
  }, [folders]);

  const folderCombobox = useCombobox();
  const [search, setSearch] = useState('');

  const handleAdd = async (value: string) => {
    if (value === '$create') {
      await createFolderAndAdd(file!, search.trim());
    } else {
      await addToFolder(file!, value);
    }
  };

  const { data: tags } = useSWR<Extract<Response['/api/user/tags'], Tag[]>>(
    user ? `/api/users/${user}/tags` : '/api/user/tags',
  );

  const tagsCombobox = useCombobox();

  const [value, setValue] = useState<string[]>(() => file?.tags?.map((x) => x.id) ?? []);

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
        title: t('notifications.saveTagsError.title'),
        message: error.error,
        color: 'red',
        icon: <IconTagsOff size='1rem' />,
      });
    } else {
      showNotification({
        title: t('notifications.tagsSaved.title'),
        message: t('notifications.tagsSaved.message', { count: data!.tags!.length, name: data!.name }),
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

  const [goPrev, goNext, hasPrev, hasNext] = useFileNavStore(
    useShallow((state) => {
      if (!state.current) {
        return [state.goPrev, state.goNext, false, false];
      }

      const idx = state.ids.indexOf(state.current);
      return [state.goPrev, state.goNext, idx > 0, idx >= 0 && idx < state.ids.length - 1];
    }),
  );

  useEffect(() => {
    if (!open || !sequenced) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && hasPrev) {
        goPrev();
      } else if (event.key === 'ArrowRight' && hasNext) {
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, sequenced, hasPrev, hasNext, goPrev, goNext]);

  return (
    <>
      <EditFileDetailsModal open={editFileOpen} onClose={() => setEditFileOpen(false)} file={file!} />

      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title={
          <Text size='xl' fw={700}>
            {file?.name ?? ''}
          </Text>
        }
        size='auto'
        maw='90vw'
        centered
        zIndex={200}
      >
        {file ? (
          <>
            {open && <DashboardFileType file={file} show />}

            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing='md' my='xs'>
              <FileStat Icon={IconFileInfo} title={t('stats.type')} value={file.type} />
              <FileStat Icon={IconDeviceSdCard} title={t('stats.size')} value={bytes(file.size)} />
              <FileStat
                Icon={IconUpload}
                title={t('stats.createdAt')}
                value={new Date(file.createdAt).toLocaleString()}
              />
              <FileStat
                Icon={IconRefresh}
                title={t('stats.updatedAt')}
                value={new Date(file.updatedAt).toLocaleString()}
              />
              {file.deletesAt && !reduce && (
                <FileStat
                  Icon={IconBombFilled}
                  title={t('stats.deletesAt')}
                  value={new Date(file.deletesAt).toLocaleString()}
                />
              )}
              <FileStat
                Icon={IconEyeFilled}
                title={t('stats.views')}
                value={file.maxViews ? `${file.views} / ${file.maxViews}` : file.views}
              />
              {file.originalName && (
                <FileStat
                  Icon={IconTextRecognition}
                  title={t('stats.originalName')}
                  value={file.originalName}
                />
              )}
              {file.anonymous && (
                <FileStat
                  Icon={IconUserQuestion}
                  title={t('stats.anonymous')}
                  value={t('common:actions.yes')}
                />
              )}
            </SimpleGrid>

            {!reduce && (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing='md' my='xs'>
                <Box>
                  <Title order={4} mt='lg' mb='xs'>
                    {t('details.tags.title')}
                  </Title>
                  <Combobox zIndex={90000} store={tagsCombobox} onOptionSubmit={handleValueSelect}>
                    <Combobox.DropdownTarget>
                      <PillsInput
                        onBlur={() => triggerSave()}
                        pointer
                        onClick={() => tagsCombobox.openDropdown()}
                      >
                        <Pill.Group>
                          {values.length > 0 ? (
                            values
                          ) : (
                            <Input.Placeholder>{t('details.tags.placeholder')}</Input.Placeholder>
                          )}

                          <Combobox.EventsTarget>
                            <PillsInput.Field
                              type='hidden'
                              onFocus={() => tagsCombobox.openDropdown()}
                              onBlur={() => tagsCombobox.closeDropdown()}
                              onKeyDown={(event) => {
                                if (
                                  event.key === 'Backspace' &&
                                  value.length > 0 &&
                                  event.currentTarget.value === ''
                                ) {
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
                          <Combobox.Empty>{t('details.tags.empty')}</Combobox.Empty>
                        )}
                      </Combobox.Options>
                    </Combobox.Dropdown>
                  </Combobox>
                </Box>
                <Box>
                  <Title order={4} mt='lg' mb='xs'>
                    {t('details.folder.title')}
                  </Title>
                  {file.folderId ? (
                    <Button
                      color='red'
                      leftSection={<IconFolderMinus size='1rem' />}
                      onClick={() => removeFromFolder(file)}
                      fullWidth
                    >
                      {t('details.folder.remove', {
                        name: folders?.find((f: { id: string }) => f.id === file.folderId)?.name ?? '',
                      })}
                    </Button>
                  ) : (
                    <Combobox
                      zIndex={90000}
                      store={folderCombobox}
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
                          onClick={() => {
                            folderCombobox.openDropdown();
                            setSearch('');
                          }}
                          onFocus={() => {
                            folderCombobox.openDropdown();
                            setSearch('');
                          }}
                          onBlur={() => {
                            folderCombobox.closeDropdown();
                            setSearch('');
                          }}
                          placeholder={t('details.folder.placeholder')}
                          rightSectionPointerEvents='none'
                        />
                      </Combobox.Target>

                      <Combobox.Dropdown>
                        {folders?.length === 0 && (
                          <Combobox.Empty>{t('details.folder.empty')}</Combobox.Empty>
                        )}

                        <FolderComboboxOptions
                          folderOptions={folderOptions}
                          searchValue={search}
                          additionalOptions={
                            !folders?.some((f: { name: string }) => f.name === search) &&
                            search.trim().length > 0 ? (
                              <Combobox.Option value='$create'>
                                {t('details.folder.create', { name: search })}
                              </Combobox.Option>
                            ) : null
                          }
                        />
                      </Combobox.Dropdown>
                    </Combobox>
                  )}
                </Box>
              </SimpleGrid>
            )}

            <Group justify='space-between' mt='sm'>
              <Group>
                {!reduce && (
                  <Text size='sm' c='dimmed'>
                    {file.id}
                  </Text>
                )}
              </Group>

              <Group>
                {!reduce && (
                  <>
                    <ActionButton
                      Icon={IconPencil}
                      onClick={() => setEditFileOpen(true)}
                      tooltip={t('actions.editDetails')}
                      color='orange'
                    />
                    <ActionButton
                      Icon={IconTrashFilled}
                      onClick={() => deleteFile(warnDeletion, file, setOpen)}
                      tooltip={t('actions.delete')}
                      color='red'
                    />
                    <ActionButton
                      Icon={file.favorite ? IconStarFilled : IconStar}
                      onClick={() => favoriteFile(file)}
                      tooltip={file.favorite ? t('actions.unfavorite') : t('actions.favorite')}
                      color={file.favorite ? 'gray' : 'yellow'}
                    />
                  </>
                )}
                <ActionButton
                  Icon={IconExternalLink}
                  onClick={() => viewFile(file)}
                  tooltip={t('actions.viewInNewTab')}
                  color='blue'
                />
                <ActionButton
                  Icon={IconClipboardTypography}
                  onClick={() => copyFile(file, clipboard, true)}
                  tooltip={t('actions.copyRawLink')}
                />
                <ActionButton
                  Icon={IconCopy}
                  onClick={() => copyFile(file, clipboard)}
                  tooltip={t('actions.copyLink')}
                />
                <ActionButton
                  Icon={IconDownload}
                  onClick={() => downloadFile(file)}
                  tooltip={t('actions.download')}
                />
              </Group>
            </Group>
          </>
        ) : (
          <></>
        )}
      </Modal>

      {open && sequenced && fileNavButtons && (
        <>
          <ActionButton
            Icon={IconChevronLeft}
            tooltip={t('actions.previous')}
            onClick={() => goPrev()}
            disabled={!hasPrev}
            hiddenFrom='sm'
            style={{
              position: 'fixed',
              left: '0.75rem',
              top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
              zIndex: 1000,
            }}
            size='md'
          />

          <ActionButton
            Icon={IconChevronRight}
            tooltip={t('actions.next')}
            onClick={() => goNext()}
            disabled={!hasNext}
            hiddenFrom='sm'
            style={{
              position: 'fixed',
              right: '0.75rem',
              top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
              zIndex: 1000,
            }}
            size='md'
          />

          <ActionButton
            Icon={IconChevronLeft}
            tooltip={t('actions.previous')}
            onClick={() => goPrev()}
            disabled={!hasPrev}
            visibleFrom='sm'
            style={{
              position: 'fixed',
              left: '1rem',
              top: '50%',
              zIndex: 1000,
            }}
            size='lg'
          />

          <ActionButton
            Icon={IconChevronRight}
            tooltip={t('actions.next')}
            onClick={() => goNext()}
            disabled={!hasNext}
            visibleFrom='sm'
            style={{
              position: 'fixed',
              right: '1rem',
              top: '50%',
              zIndex: 1000,
            }}
            size='lg'
          />
        </>
      )}
    </>
  );
}
