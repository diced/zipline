import TagPill from '@/components/pages/files/tags/TagPill';
import type { Response } from '@/lib/api/response';
import type { File } from '@/lib/db/models/file';
import type { Tag } from '@/lib/db/models/tag';
import { fetchApi } from '@/lib/fetchApi';
import {
  Box,
  Checkbox,
  Combobox,
  Group,
  Input,
  Pill,
  PillsInput,
  Title,
  type TitleProps,
  useCombobox,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconTags, IconTagsOff } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR, { mutate } from 'swr';
import { mutateFiles } from '../actions';

export function useFileTags(file: File | null | undefined, open: boolean, user?: string) {
  const { t } = useTranslation('file');
  const { data: tags } = useSWR<Extract<Response['/api/user/tags'], Tag[]>>(
    user ? `/api/users/${user}/tags` : '/api/user/tags',
  );

  const tagsCombobox = useCombobox();

  const fileTags = useMemo(() => file?.tags?.map((tag) => tag.id) ?? [], [file?.tags]);
  const [tagState, setTagState] = useState(() => ({
    fileId: file?.id,
    fileTags,
    open,
    value: fileTags,
    dirty: false,
  }));
  const value = tagState.fileId === file?.id ? tagState.value : fileTags;

  if (tagState.fileId !== file?.id || tagState.fileTags !== fileTags || tagState.open !== open) {
    const dirty = tagState.fileId === file?.id && tagState.dirty && open;
    setTagState({
      fileId: file?.id,
      fileTags,
      open,
      value: dirty ? tagState.value : fileTags,
      dirty,
    });
  }

  const handleValueSelect = (val: string) => {
    if (!file) return;

    setTagState((current) => {
      const value = current.fileId === file.id ? current.value : fileTags;
      return {
        ...current,
        fileId: file.id,
        value: value.includes(val) ? value.filter((v) => v !== val) : [...value, val],
        dirty: true,
      };
    });
  };

  const handleValueRemove = (val: string) => {
    if (!file) return;

    setTagState((current) => ({
      ...current,
      fileId: file.id,
      value: (current.fileId === file.id ? current.value : fileTags).filter((v) => v !== val),
      dirty: true,
    }));
  };

  const handleTagsUpdate = async () => {
    if (!file || tagState.fileId !== file.id || !tagState.dirty) return;

    if (value.length === fileTags.length && value.every((v) => fileTags.includes(v))) {
      setTagState((current) =>
        current.fileId === file.id && current.value === value ? { ...current, dirty: false } : current,
      );
      return;
    }

    const { data, error } = await fetchApi<Response['/api/user/files/[id]']>(
      `/api/user/files/${file.id}`,
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
      setTagState((current) =>
        current.fileId === file.id && current.value === value ? { ...current, dirty: false } : current,
      );

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

  const triggerSave = () => {
    tagsCombobox.closeDropdown();

    void handleTagsUpdate();
  };

  return { tags, value, tagsCombobox, handleValueSelect, handleValueRemove, triggerSave };
}

export default function FileTags({
  editor,
  mt,
}: {
  editor: ReturnType<typeof useFileTags>;
  mt?: TitleProps['mt'];
}) {
  const { t } = useTranslation('file');
  const { tags, value, tagsCombobox, handleValueSelect, handleValueRemove, triggerSave } = editor;
  const values = value.map((id) => <TagPill key={id} tag={tags?.find((tag) => tag.id === id) || null} />);

  return (
    <Box>
      <Title order={4} mt={mt} mb='xs'>
        {t('details.tags.title')}
      </Title>
      <Combobox zIndex={90000} store={tagsCombobox} onOptionSubmit={handleValueSelect}>
        <Combobox.DropdownTarget>
          <PillsInput onBlur={triggerSave} pointer onClick={() => tagsCombobox.openDropdown()}>
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
                    if (event.key === 'Backspace' && value.length > 0 && event.currentTarget.value === '') {
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
              tags.map((tag) => (
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
  );
}
